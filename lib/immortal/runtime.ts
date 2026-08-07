import { Effect, Schema } from "effect"
import type { Event } from "@openagentsinc/nip-mkt"

import {
  ingestRequesterSession,
  loadImmortalBrowserClient,
  restoreRequesterSession,
  type ImmortalBrowserClient,
  type ImmortalNostrEvent,
} from "@/vendor/mkt-swp/immortal-browser-abi"
import {
  IMMORTAL_ARTIFACT,
  type ImmortalConfigResult,
  type ImmortalDemoConfig,
  type ImmortalRuntimeProvenance,
  type ImmortalRuntimeStatus,
} from "./config"
import {
  ImmortalSessionStore,
  IndexedDbStringKv,
  bytesToHex,
  loadOrCreateDemoIdentity,
  type DemoIdentity,
  type StoredImmortalSession,
} from "./store"
import {
  ImmortalRelayError,
  ImmortalRelayTransport,
  validatePrivateDelivery,
  validatePublicOffering,
  type RelayInformation,
  type RelaySnapshot,
} from "./transport"

type StatusListener = (status: ImmortalRuntimeStatus) => void
type ProvenanceListener = (provenance: ImmortalRuntimeProvenance | null) => void

export interface ImmortalRuntimeListeners {
  readonly onStatus: StatusListener
  readonly onProvenance: ProvenanceListener
  readonly onOfferings?: (offerings: readonly ImmortalNostrEvent[]) => void
}

export class ImmortalBrowserRuntime {
  private client: ImmortalBrowserClient | null = null
  private store: ImmortalSessionStore | null = null
  private identity: DemoIdentity | null = null
  private transport: ImmortalRelayTransport | null = null
  private config: ImmortalDemoConfig | null = null
  private stopped = false
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempt = 0
  private restoredSessionCount = 0
  private relayInformation: RelayInformation | null = null
  private readonly offerings = new Map<string, ImmortalNostrEvent>()

  constructor(private readonly listeners: ImmortalRuntimeListeners) {}

  async start(configResult: ImmortalConfigResult): Promise<void> {
    this.stopped = false

    if (configResult.state === "unavailable") {
      this.listeners.onProvenance(null)
      this.emit({
        state: "unavailable",
        code: configResult.code,
        detail: configResult.detail,
      })
      return
    }

    this.emit({ state: "loading", detail: "Loading the pinned Immortal requester engine…" })
    try {
      this.client = await loadPinnedEngine()
    } catch (cause) {
      this.listeners.onProvenance(null)
      this.emit({
        state: "incompatible",
        code: errorCode(cause, "engine_incompatible"),
        detail: safeDetail(cause, "The Immortal requester engine is incompatible."),
      })
      return
    }

    this.config = configResult.config

    try {
      const kv = await IndexedDbStringKv.open()
      this.store = new ImmortalSessionStore(kv)
      this.identity = await loadOrCreateDemoIdentity(kv)
      this.restoredSessionCount = await this.restoreStoredSessions()
    } catch (cause) {
      this.emit({
        state: "unavailable",
        code: errorCode(cause, "browser_store_unavailable"),
        detail: safeDetail(cause, "The local Immortal session store is unavailable."),
      })
      return
    }

    await this.connect(0)
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.transport?.close()
    this.transport = null
  }

  getClient(): ImmortalBrowserClient {
    if (!this.client) throw new Error("Immortal engine is not loaded")
    return this.client
  }

  getStore(): ImmortalSessionStore {
    if (!this.store) throw new Error("Immortal session store is not open")
    return this.store
  }

  getIdentity(): DemoIdentity {
    if (!this.identity) throw new Error("Immortal demo identity is not loaded")
    return this.identity
  }

  getRelay(): ImmortalRelayTransport {
    if (!this.transport) throw new Error("Immortal relay is not connected")
    return this.transport
  }

  getConfig(): ImmortalDemoConfig {
    if (!this.config) throw new Error("Immortal demo config is unavailable")
    return this.config
  }

  getOfferings(): readonly ImmortalNostrEvent[] {
    return [...this.offerings.values()]
  }

  private async connect(attempt: number): Promise<void> {
    if (
      this.stopped ||
      !this.config ||
      !this.identity ||
      !this.client ||
      !this.store
    ) {
      return
    }
    this.emit(
      attempt === 0
        ? { state: "connecting", detail: "Authenticating directly with the Immortal relay…" }
        : {
            state: "reconnecting",
            attempt,
            detail: "Reconnecting the direct relay session and replaying its snapshot…",
          }
    )
    const transport = new ImmortalRelayTransport(
      this.config.relay.websocketUrl,
      this.identity,
      this.config.relay.contractIdentity
    )
    this.transport = transport
    try {
      this.relayInformation = await transport.connect({
        onSnapshot: (snapshot) => this.consumeSnapshot(snapshot),
        onPublicEvent: (event) => this.consumePublicEvent(event),
        onPrivateEvent: (event) => this.consumePrivateEvent(event),
        onDisconnect: () => this.scheduleReconnect(),
      })
      if (this.stopped || this.transport !== transport) return
      this.reconnectAttempt = 0
      this.publishProvenance()
      this.emitLive()
    } catch (cause) {
      if (this.stopped) return
      if (
        cause instanceof ImmortalRelayError &&
        cause.code === "contract_identity_mismatch"
      ) {
        this.emit({ state: "incompatible", code: cause.code, detail: cause.message })
        return
      }
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    this.reconnectAttempt += 1
    const attempt = this.reconnectAttempt
    this.emit({
      state: "reconnecting",
      attempt,
      detail: "The relay disconnected; restoring the authenticated snapshot before live updates.",
    })
    const delay = Math.min(8_000, 500 * 2 ** Math.min(attempt - 1, 4))
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect(attempt)
    }, delay)
  }

  private async consumeSnapshot(snapshot: RelaySnapshot): Promise<void> {
    for (const event of snapshot.publicEvents) await this.consumePublicEvent(event)
    for (const event of snapshot.privateEvents) await this.consumePrivateEvent(event)
  }

  private async consumePublicEvent(event: Event): Promise<void> {
    if (!this.client || !this.config || event.kind !== 39_601) return
    if (!this.config.providers.some((provider) => provider.pubkey === event.pubkey)) return
    const offering = await validatePublicOffering(this.client, event)
    const coordinate = `39601:${offering.pubkey}:${tagValue(offering.tags, "d")}`
    if (
      !this.config.providers.some(
        (provider) => provider.offeringCoordinate === coordinate
      )
    ) {
      return
    }
    this.offerings.set(offering.id, offering)
    this.listeners.onOfferings?.(this.getOfferings())
    if (this.relayInformation) this.emitLive()
  }

  private async consumePrivateEvent(event: Event): Promise<void> {
    if (!this.client || !this.identity || !this.store) return
    const delivery = await validatePrivateDelivery(this.client, event, this.identity)
    let session: StoredImmortalSession
    try {
      session = await this.store.get(delivery.sessionId)
    } catch {
      // A Quote can race the durable RFQ session creation. The live lifecycle
      // creates the session before publishing its RFQ; unknown sessions are
      // refused rather than becoming unbound inbox authority.
      return
    }
    session = await this.store.appendDelivery(
      delivery.sessionId,
      delivery.signedRecord,
      delivery.storedDelivery
    )
    if (!session.engineSnapshotJsonHex) return
    const ingested = await Effect.runPromise(
      ingestRequesterSession(this.client, jsonValue({
        snapshot_json_hex: session.engineSnapshotJsonHex,
        records: [delivery.unwrapped.event],
        deliveries: session.validatedDeliveries.map(
          (candidate) => candidate.engineDelivery
        ),
      }))
    )
    await this.store.saveEngineSnapshot(
      session.sessionId,
      ingested.snapshot_json_hex,
      ingested.view
    )
  }

  private async restoreStoredSessions(): Promise<number> {
    if (!this.client || !this.store) return 0
    const sessions = await this.store.list()
    let restored = 0
    for (const session of sessions) {
      if (!session.engineSnapshotJsonHex) continue
      const result = await Effect.runPromise(
        restoreRequesterSession(this.client, jsonValue({
          snapshot_json_hex: session.engineSnapshotJsonHex,
          deliveries: session.validatedDeliveries.map(
            (delivery) => delivery.engineDelivery
          ),
        }))
      )
      await this.store.saveEngineSnapshot(
        session.sessionId,
        result.snapshot_json_hex,
        result.view
      )
      restored += 1
    }
    return restored
  }

  private publishProvenance(): void {
    if (!this.client || !this.config || !this.relayInformation) return
    this.listeners.onProvenance({
      engine: {
        sourceRevision: this.client.metadata.source_revision,
        requesterApiSha256: this.client.metadata.requester_api_sha256,
        wasmSha256: IMMORTAL_ARTIFACT.wasmSha256,
        abiVersion: this.client.metadata.abi_version,
      },
      relay: {
        url: this.config.relay.websocketUrl,
        software: this.relayInformation.software,
        version: this.relayInformation.version,
        contractSha256: this.config.relay.contractSha256,
        directBrowserSocket: true,
        snapshotBeforeLive: true,
        nip42Authenticated: true,
      },
      providers: this.config.providers.map((provider) => ({
        role: provider.role,
        pubkey: provider.pubkey,
        offeringCoordinate: provider.offeringCoordinate,
      })),
    })
  }

  private emitLive(): void {
    if (!this.identity || !this.config) return
    this.emit({
      state: "live",
      requesterPubkey: this.identity.pubkey,
      relayUrl: this.config.relay.websocketUrl,
      offeringCount: this.offerings.size,
      restoredSessionCount: this.restoredSessionCount,
      checkedAt: new Date().toISOString(),
    })
  }

  private emit(status: ImmortalRuntimeStatus): void {
    if (!this.stopped) this.listeners.onStatus(status)
  }
}

async function loadPinnedEngine(): Promise<ImmortalBrowserClient> {
  const [artifactResponse, wasmResponse] = await Promise.all([
    fetch("/immortal/artifact.json", { cache: "no-store" }),
    fetch(IMMORTAL_ARTIFACT.wasmUrl, { cache: "force-cache" }),
  ])
  if (!artifactResponse.ok || !wasmResponse.ok) {
    throw new Error("browser_wasm_fetch_failed: the pinned artifact is unavailable")
  }
  const artifact = (await artifactResponse.json()) as Record<string, unknown>
  if (
    artifact.schema !== IMMORTAL_ARTIFACT.schema ||
    artifact.source_revision !== IMMORTAL_ARTIFACT.sourceRevision ||
    artifact.requester_api_sha256 !== IMMORTAL_ARTIFACT.requesterApiSha256 ||
    artifact.sha256 !== IMMORTAL_ARTIFACT.wasmSha256 ||
    artifact.bytes !== IMMORTAL_ARTIFACT.wasmBytes
  ) {
    throw new Error("browser_artifact_manifest_mismatch: artifact provenance changed")
  }
  const bytes = await wasmResponse.arrayBuffer()
  if (
    bytes.byteLength !== IMMORTAL_ARTIFACT.wasmBytes ||
    bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))) !==
      IMMORTAL_ARTIFACT.wasmSha256
  ) {
    throw new Error("browser_artifact_digest_mismatch: artifact bytes changed")
  }
  return Effect.runPromise(loadImmortalBrowserClient(bytes))
}

function tagValue(tags: readonly (readonly string[])[], name: string): string {
  const matches = tags.filter((tag) => tag.length === 2 && tag[0] === name)
  return matches.length === 1 ? (matches[0]?.[1] ?? "") : ""
}

function jsonValue(value: unknown): Schema.Json {
  return Schema.decodeUnknownSync(Schema.Json)(value)
}

function errorCode(cause: unknown, fallback: string): string {
  if (cause && typeof cause === "object" && "code" in cause) {
    const code = (cause as { code?: unknown }).code
    if (typeof code === "string" && /^[a-z0-9_]{1,96}$/.test(code)) return code
  }
  if (cause instanceof Error) {
    const prefix = cause.message.split(":", 1)[0]
    if (prefix && /^[a-z0-9_]{1,96}$/.test(prefix)) return prefix
  }
  return fallback
}

function safeDetail(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.length <= 240) return cause.message
  return fallback
}
