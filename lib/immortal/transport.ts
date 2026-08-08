import { Effect, Schema } from "effect"
import {
  serializeSignedEvent,
  unwrapPrivateRecord,
  validatePublicHead,
  wrapPrivateRecordCopies,
  finalizeEvent,
  parseJsonRejectingDuplicateMembers,
  verifyEvent,
  type DeliveredPrivateRecord,
  type Event,
  type GiftWrappedEvent,
  type WrappedPrivateCopies,
} from "@openagentsinc/nip-mkt"

import {
  validateImmortalDelivery,
  verifySignedRequesterRecord,
  type ImmortalBrowserClient,
  type ImmortalNostrEvent,
  type ImmortalSessionDeliveryInput,
  type ImmortalSignedRecordDelivery,
  type ImmortalSigningRequest,
} from "@/vendor/mkt-swp/immortal-browser-abi"
import type {
  DemoIdentity,
  StoredSignedRecord,
  StoredValidatedDelivery,
} from "./store"
import { bytesToHex, hexToBytes } from "./store"
import type { ImmortalContractIdentity } from "./config"
import type { PublicRegtestRelay } from "./public-config"

const RELAY_TIMEOUT_MS = 10_000
const MAXIMUM_RELAY_MESSAGE_BYTES = 1_048_576
const MAXIMUM_NIP11_BYTES = 65_536
const PRIVATE_PROFILE_SUPPORT = [
  {
    id: "mkt-swp",
    version: 1,
    privateKinds: [39_610],
    referenceMarkers: ["cancel-request", "cancel-accept"],
    criticalMembers: ["mkt_swp"],
    understoodMembers: ["mkt_swp"],
  },
] as const

export type RelayConnectionState =
  "connecting" | "authenticating" | "snapshot" | "live" | "closed"

export interface RelayInformation {
  readonly software: "https://github.com/OpenAgentsInc/immortal"
  readonly version: string
  readonly supportedNips: readonly number[]
  readonly supportedExtensions: readonly string[]
}

export interface RelaySnapshot {
  readonly publicEvents: readonly Event[]
  readonly privateEvents: readonly Event[]
}

export interface ImmortalRelayCallbacks {
  readonly onState?: (state: RelayConnectionState) => void
  readonly onSnapshot: (snapshot: RelaySnapshot) => Promise<void>
  readonly onPublicEvent: (event: Event) => Promise<void>
  readonly onPrivateEvent: (event: Event) => Promise<void>
  readonly onDisconnect?: (reason: string) => void
}

export interface ConnectedRelay {
  readonly transport: ImmortalRelayTransport
  readonly information: RelayInformation
  readonly relay: PublicRegtestRelay
}

export async function connectImmortalRelayPool(
  relays: readonly PublicRegtestRelay[],
  identity: DemoIdentity,
  callbacks: ImmortalRelayCallbacks,
  previousRelayUrl?: string
): Promise<ConnectedRelay> {
  if (relays.length < 1 || relays.length > 2) {
    throw new ImmortalRelayError(
      "relay_unavailable",
      "The signed relay pool must contain one or two entries."
    )
  }
  const previousIndex = previousRelayUrl
    ? relays.findIndex((relay) => relay.websocketUrl === previousRelayUrl)
    : -1
  const ordered = relays.map(
    (_, offset) =>
      relays[(Math.max(previousIndex, -1) + 1 + offset) % relays.length]!
  )
  let lastError: unknown
  for (const relay of ordered) {
    const transport = new ImmortalRelayTransport(
      relay.websocketUrl,
      identity,
      relay.contractIdentity
    )
    try {
      const information = await transport.connect(callbacks)
      return { transport, information, relay }
    } catch (cause) {
      lastError = cause
      transport.close()
    }
  }
  throw lastError instanceof ImmortalRelayError
    ? lastError
    : new ImmortalRelayError(
        "relay_unavailable",
        "Every signed public relay is unavailable."
      )
}

export class ImmortalRelayError extends Error {
  constructor(
    readonly code:
      | "nip11_unavailable"
      | "contract_identity_mismatch"
      | "relay_unavailable"
      | "relay_protocol_error"
      | "relay_auth_failed"
      | "relay_publish_failed"
      | "private_delivery_invalid",
    message: string
  ) {
    super(message)
    this.name = "ImmortalRelayError"
  }
}

export class ImmortalRelayTransport {
  private socket: WebSocket | null = null
  private state: RelayConnectionState = "closed"
  private readonly acknowledgements = new Map<
    string,
    { readonly resolve: () => void; readonly reject: (cause: Error) => void }
  >()
  private readonly subscriptions = new Map<
    string,
    { readonly phase: "snapshot" | "live"; readonly events: Event[] }
  >()
  private readyResolve: (() => void) | null = null
  private readyReject: ((cause: Error) => void) | null = null
  private readyPromise: Promise<void> = Promise.resolve()
  private callbacks: ImmortalRelayCallbacks | null = null
  private closedIntentionally = false
  private eventQueue: Promise<void> = Promise.resolve()

  constructor(
    readonly relayUrl: string,
    private readonly identity: DemoIdentity,
    private readonly contractIdentity: ImmortalContractIdentity
  ) {}

  async connect(callbacks: ImmortalRelayCallbacks): Promise<RelayInformation> {
    this.callbacks = callbacks
    this.closedIntentionally = false
    this.eventQueue = Promise.resolve()
    this.setState("connecting")
    const information = await fetchRelayInformation(
      this.relayUrl,
      this.contractIdentity
    )
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })

    const socket = new WebSocket(this.relayUrl)
    this.socket = socket
    socket.addEventListener("message", (message) => {
      void this.handleMessage(message.data).catch((cause) => this.fail(cause))
    })
    socket.addEventListener("error", () =>
      this.fail(
        new ImmortalRelayError(
          "relay_unavailable",
          "The relay WebSocket failed."
        )
      )
    )
    socket.addEventListener("close", () => {
      this.setState("closed")
      if (!this.closedIntentionally) {
        const reason = "The direct relay WebSocket closed."
        this.readyReject?.(new ImmortalRelayError("relay_unavailable", reason))
        this.callbacks?.onDisconnect?.(reason)
      }
    })

    await withTimeout(
      this.readyPromise,
      RELAY_TIMEOUT_MS,
      "The relay did not authenticate and finish its snapshots."
    )
    return information
  }

  async publish(event: Event | GiftWrappedEvent): Promise<void> {
    const wireEvent: Event = {
      ...event,
      tags: event.tags.map((tag) => [...tag]),
    }
    if (!verifyEvent(wireEvent)) {
      throw new ImmortalRelayError(
        "relay_publish_failed",
        "Refusing to publish a malformed signed event."
      )
    }
    const acknowledgement = new Promise<void>((resolve, reject) => {
      this.acknowledgements.set(event.id, { resolve, reject })
    })
    this.send(["EVENT", wireEvent])
    await withTimeout(
      acknowledgement,
      RELAY_TIMEOUT_MS,
      "The relay did not acknowledge the signed event."
    ).finally(() => this.acknowledgements.delete(event.id))
  }

  close(): void {
    this.closedIntentionally = true
    for (const subscriptionId of this.subscriptions.keys()) {
      try {
        this.send(["CLOSE", subscriptionId])
      } catch {
        // The WebSocket may already be closed.
      }
    }
    this.subscriptions.clear()
    this.socket?.close()
    this.socket = null
    this.setState("closed")
  }

  private async handleMessage(data: unknown): Promise<void> {
    if (typeof data !== "string" || data.length > MAXIMUM_RELAY_MESSAGE_BYTES) {
      throw new ImmortalRelayError(
        "relay_protocol_error",
        "The relay returned a non-text or oversized frame."
      )
    }
    let message: unknown
    try {
      message = JSON.parse(data)
    } catch {
      throw new ImmortalRelayError(
        "relay_protocol_error",
        "The relay returned malformed JSON."
      )
    }
    if (!Array.isArray(message) || typeof message[0] !== "string") {
      throw new ImmortalRelayError(
        "relay_protocol_error",
        "The relay returned an invalid Nostr message."
      )
    }

    switch (message[0]) {
      case "AUTH":
        await this.authenticate(message)
        return
      case "OK":
        this.handleAcknowledgement(message)
        return
      case "EVENT":
        await this.handleEvent(message)
        return
      case "EOSE":
        await this.handleEose(message)
        return
      case "CLOSED":
        throw new ImmortalRelayError(
          "relay_protocol_error",
          typeof message[2] === "string"
            ? message[2]
            : "The relay closed a subscription."
        )
      case "NOTICE":
        return
      default:
        throw new ImmortalRelayError(
          "relay_protocol_error",
          "The relay returned an unsupported Nostr message."
        )
    }
  }

  private async authenticate(message: unknown[]): Promise<void> {
    if (this.state !== "connecting" || typeof message[1] !== "string") {
      throw new ImmortalRelayError(
        "relay_auth_failed",
        "The relay sent an invalid NIP-42 challenge."
      )
    }
    this.setState("authenticating")
    const privateKey = hexToBytes(this.identity.privateKeyHex)
    const event = finalizeEvent(
      {
        kind: 22_242,
        created_at: Math.floor(Date.now() / 1_000),
        tags: [
          ["relay", this.relayUrl],
          ["challenge", message[1]],
        ],
        content: "",
      },
      privateKey
    )
    const accepted = new Promise<void>((resolve, reject) => {
      this.acknowledgements.set(event.id, { resolve, reject })
    })
    this.send(["AUTH", event])
    await withTimeout(
      accepted,
      RELAY_TIMEOUT_MS,
      "The relay refused NIP-42 authentication."
    )
      .catch((cause) => {
        throw new ImmortalRelayError(
          "relay_auth_failed",
          cause instanceof Error
            ? cause.message
            : "The relay refused authentication."
        )
      })
      .finally(() => this.acknowledgements.delete(event.id))
    this.openSubscriptions()
  }

  private openSubscriptions(): void {
    this.setState("snapshot")
    const suffix = crypto.randomUUID()
    const publicId = `bazaar-public-${suffix}`
    const privateId = `bazaar-private-${suffix}`
    this.subscriptions.set(publicId, { phase: "snapshot", events: [] })
    this.subscriptions.set(privateId, { phase: "snapshot", events: [] })
    this.send([
      "REQ",
      publicId,
      { kinds: [39_600, 39_601, 39_603], limit: 512 },
    ])
    this.send([
      "REQ",
      privateId,
      { kinds: [1_059], "#p": [this.identity.pubkey], limit: 512 },
    ])
  }

  private handleAcknowledgement(message: unknown[]): void {
    const eventId = message[1]
    const accepted = message[2]
    if (typeof eventId !== "string" || typeof accepted !== "boolean") return
    const pending = this.acknowledgements.get(eventId)
    if (!pending) return
    if (accepted) pending.resolve()
    else {
      pending.reject(
        new ImmortalRelayError(
          "relay_publish_failed",
          typeof message[3] === "string"
            ? message[3]
            : "The relay rejected the event."
        )
      )
    }
  }

  private async handleEvent(message: unknown[]): Promise<void> {
    const subscriptionId = message[1]
    const value = message[2]
    if (
      typeof subscriptionId !== "string" ||
      !this.subscriptions.has(subscriptionId)
    ) {
      return
    }
    if (!isEvent(value) || !verifyEvent(value)) {
      throw new ImmortalRelayError(
        "relay_protocol_error",
        "The relay delivered a malformed or invalidly signed event."
      )
    }
    const subscription = this.subscriptions.get(subscriptionId)!
    if (subscription.phase === "snapshot") {
      subscription.events.push(value)
      return
    }
    this.eventQueue = this.eventQueue.then(async () => {
      if (value.kind === 1_059) await this.callbacks?.onPrivateEvent(value)
      else await this.callbacks?.onPublicEvent(value)
    })
    await this.eventQueue
  }

  private async handleEose(message: unknown[]): Promise<void> {
    const subscriptionId = message[1]
    if (typeof subscriptionId !== "string") return
    const subscription = this.subscriptions.get(subscriptionId)
    if (!subscription || subscription.phase === "live") return
    this.subscriptions.set(subscriptionId, { ...subscription, phase: "live" })
    if (
      [...this.subscriptions.values()].some((entry) => entry.phase !== "live")
    )
      return

    const publicEvents: Event[] = []
    const privateEvents: Event[] = []
    for (const entry of this.subscriptions.values()) {
      for (const event of entry.events) {
        if (event.kind === 1_059) privateEvents.push(event)
        else publicEvents.push(event)
      }
    }
    this.eventQueue = this.eventQueue.then(async () => {
      await this.callbacks?.onSnapshot({ publicEvents, privateEvents })
    })
    await this.eventQueue
    this.setState("live")
    this.readyResolve?.()
  }

  private send(message: unknown[]): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new ImmortalRelayError(
        "relay_unavailable",
        "The direct relay WebSocket is not open."
      )
    }
    this.socket.send(JSON.stringify(message))
  }

  private fail(cause: unknown): void {
    const error =
      cause instanceof Error
        ? cause
        : new ImmortalRelayError(
            "relay_protocol_error",
            "The relay operation failed."
          )
    this.readyReject?.(error)
    this.socket?.close()
  }

  private setState(state: RelayConnectionState): void {
    this.state = state
    this.callbacks?.onState?.(state)
  }
}

export async function signImmortalRequest(
  client: ImmortalBrowserClient,
  request: ImmortalSigningRequest,
  identity: DemoIdentity
): Promise<Event> {
  if (request.pubkey !== identity.pubkey) {
    throw new ImmortalRelayError(
      "private_delivery_invalid",
      "The engine signing request belongs to another identity."
    )
  }
  const event = finalizeEvent(
    {
      kind: request.kind,
      created_at: request.created_at,
      tags: request.tags.map((tag) => [...tag]),
      content: request.content,
    },
    hexToBytes(identity.privateKeyHex)
  )
  if (event.id !== request.expected_event_id) {
    throw new ImmortalRelayError(
      "private_delivery_invalid",
      "The host signature does not match the engine event ID."
    )
  }
  await Effect.runPromise(
    verifySignedRequesterRecord(client, jsonValue({ request, event }))
  )
  return event
}

export async function wrapRequesterRecord(
  event: Event,
  identity: DemoIdentity,
  recipientPubkey: string
): Promise<WrappedPrivateCopies> {
  return Effect.runPromise(
    wrapPrivateRecordCopies(
      serializeSignedEvent(event),
      hexToBytes(identity.privateKeyHex),
      recipientPubkey,
      PRIVATE_PROFILE_SUPPORT
    )
  )
}

export async function validatePrivateDelivery(
  client: ImmortalBrowserClient,
  wrap: Event | GiftWrappedEvent,
  identity: DemoIdentity,
  receivedAt = Math.floor(Date.now() / 1_000)
): Promise<{
  readonly unwrapped: DeliveredPrivateRecord
  readonly engineInput: ImmortalSessionDeliveryInput
  readonly engineDelivery: ImmortalSignedRecordDelivery
  readonly signedRecord: StoredSignedRecord
  readonly storedDelivery: StoredValidatedDelivery
  readonly sessionId: string
}> {
  let unwrapped: DeliveredPrivateRecord
  try {
    unwrapped = await Effect.runPromise(
      unwrapPrivateRecord(
        wrap as GiftWrappedEvent,
        hexToBytes(identity.privateKeyHex),
        PRIVATE_PROFILE_SUPPORT,
        {
          receivedAt,
          sourceProvenance: ["nip42_authenticated", "nip59_verified"],
        }
      )
    )
  } catch (cause) {
    throw new ImmortalRelayError(
      "private_delivery_invalid",
      cause instanceof Error
        ? `A private relay record failed NIP-59 or NIP-MKT validation: ${cause.message}`
        : "A private relay record failed NIP-59 or NIP-MKT validation."
    )
  }
  const engineInput: ImmortalSessionDeliveryInput = {
    raw_signed_event_hex: bytesToHex(new TextEncoder().encode(unwrapped.raw)),
    observed_at: receivedAt,
    provenance: "direct",
  }
  const engineDelivery = await Effect.runPromise(
    validateImmortalDelivery(client, engineInput)
  )
  const sessionId = tagValue(unwrapped.event, "session")
  if (!/^[0-9a-f]{64}$/.test(sessionId)) {
    throw new ImmortalRelayError(
      "private_delivery_invalid",
      "The private record has no valid session binding."
    )
  }
  const source =
    unwrapped.event.pubkey === identity.pubkey
      ? "sender_recovery"
      : "counterparty"
  return {
    unwrapped,
    engineInput,
    engineDelivery,
    sessionId,
    signedRecord: {
      id: unwrapped.event.id,
      pubkey: unwrapped.event.pubkey,
      kind: unwrapped.event.kind,
      createdAt: unwrapped.event.created_at,
      rawSignedEvent: unwrapped.raw,
      rawWrapEvent: JSON.stringify(wrap),
      wrapEventId: wrap.id,
      provenance: "gift_wrap",
    },
    storedDelivery: {
      eventId: unwrapped.event.id,
      wrapId: unwrapped.wrapId,
      rawWrapEvent: JSON.stringify(wrap),
      sealId: unwrapped.sealId,
      rumorId: unwrapped.rumorId,
      receivedAt,
      senderPubkey: unwrapped.event.pubkey,
      source,
      engineInput,
      engineDelivery,
    },
  }
}

export async function validateLocalRequesterDelivery(
  client: ImmortalBrowserClient,
  event: Event,
  observedAt = Math.floor(Date.now() / 1_000)
): Promise<{
  readonly engineInput: ImmortalSessionDeliveryInput
  readonly engineDelivery: ImmortalSignedRecordDelivery
  readonly signedRecord: StoredSignedRecord
  readonly storedDelivery: StoredValidatedDelivery
}> {
  if (!verifyEvent(event)) {
    throw new ImmortalRelayError(
      "private_delivery_invalid",
      "The locally signed requester record is invalid."
    )
  }
  const raw = serializeSignedEvent(event)
  const engineInput: ImmortalSessionDeliveryInput = {
    raw_signed_event_hex: bytesToHex(new TextEncoder().encode(raw)),
    observed_at: observedAt,
    provenance: "locally_signed",
  }
  const engineDelivery = await Effect.runPromise(
    validateImmortalDelivery(client, engineInput)
  )
  return {
    engineInput,
    engineDelivery,
    signedRecord: {
      id: event.id,
      pubkey: event.pubkey,
      kind: event.kind,
      createdAt: event.created_at,
      rawSignedEvent: raw,
      rawWrapEvent: null,
      wrapEventId: null,
      provenance: "locally_signed",
    },
    storedDelivery: {
      eventId: event.id,
      wrapId: null,
      rawWrapEvent: null,
      sealId: null,
      rumorId: null,
      receivedAt: observedAt,
      senderPubkey: event.pubkey,
      source: "direct",
      engineInput,
      engineDelivery,
    },
  }
}

export function validatePublicProviderProfile(event: Event): Event {
  if (event.kind !== 39_600 || !verifyEvent(event)) {
    throw new ImmortalRelayError(
      "relay_protocol_error",
      "The relay Provider Profile is malformed or unsigned."
    )
  }
  try {
    return validatePublicHead(event)
  } catch {
    throw new ImmortalRelayError(
      "relay_protocol_error",
      "The relay Provider Profile violates the pinned NIP-MKT contract."
    )
  }
}

export async function validatePublicOffering(
  client: ImmortalBrowserClient,
  event: Event
): Promise<ImmortalNostrEvent> {
  if (event.kind !== 39_601 || !verifyEvent(event)) {
    throw new ImmortalRelayError(
      "relay_protocol_error",
      "The relay Offering is malformed or unsigned."
    )
  }
  const { validateImmortalOffering } =
    await import("@/vendor/mkt-swp/immortal-browser-abi")
  return Effect.runPromise(
    validateImmortalOffering(client, jsonValue({ event }))
  )
}

async function fetchRelayInformation(
  relayUrl: string,
  contractIdentity: ImmortalContractIdentity
): Promise<RelayInformation> {
  const url = new URL(relayUrl)
  url.protocol = url.protocol === "wss:" ? "https:" : "http:"
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: "application/nostr+json" },
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
      cache: "no-store",
    })
  } catch {
    throw new ImmortalRelayError(
      "nip11_unavailable",
      "The relay NIP-11 document is unavailable."
    )
  }
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/nostr+json") ||
    Number(response.headers.get("content-length") ?? 0) > MAXIMUM_NIP11_BYTES
  ) {
    throw new ImmortalRelayError(
      "nip11_unavailable",
      "The relay did not return a valid NIP-11 response."
    )
  }
  const bytes = await readBoundedResponse(response, MAXIMUM_NIP11_BYTES)
  if (bytes.byteLength < 2 || bytes.byteLength > MAXIMUM_NIP11_BYTES) {
    throw new ImmortalRelayError(
      "nip11_unavailable",
      "The relay NIP-11 document exceeded its byte bound."
    )
  }
  let value: Record<string, unknown>
  try {
    const parsed = parseJsonRejectingDuplicateMembers(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    )
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("NIP-11 is not an object")
    }
    value = parsed as Record<string, unknown>
  } catch {
    throw new ImmortalRelayError(
      "nip11_unavailable",
      "The relay NIP-11 document is malformed."
    )
  }
  if (
    value.software !== "https://github.com/OpenAgentsInc/immortal" ||
    value.version !== contractIdentity.crateVersion ||
    !Array.isArray(value.supported_nips) ||
    ![11, 42, 59].every((nip) =>
      (value.supported_nips as unknown[]).includes(nip)
    ) ||
    !Array.isArray(value.supported_extensions) ||
    !value.supported_extensions.includes("nip-mkt")
  ) {
    throw new ImmortalRelayError(
      "contract_identity_mismatch",
      "The relay NIP-11 identity does not match the configured Immortal contract."
    )
  }
  return {
    software: "https://github.com/OpenAgentsInc/immortal",
    version: contractIdentity.crateVersion,
    supportedNips: value.supported_nips as number[],
    supportedExtensions: value.supported_extensions as string[],
  }
}

async function readBoundedResponse(
  response: Response,
  maximumBytes: number
): Promise<Uint8Array> {
  if (!response.body) {
    throw new ImmortalRelayError(
      "nip11_unavailable",
      "The relay NIP-11 document has no body."
    )
  }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > maximumBytes) {
        await reader.cancel()
        throw new ImmortalRelayError(
          "nip11_unavailable",
          "The relay NIP-11 document exceeded its byte bound."
        )
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  const bytes = new Uint8Array(length)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

function isEvent(value: unknown): value is Event {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const event = value as Partial<Event>
  return (
    typeof event.id === "string" &&
    typeof event.pubkey === "string" &&
    typeof event.created_at === "number" &&
    typeof event.kind === "number" &&
    Array.isArray(event.tags) &&
    typeof event.content === "string" &&
    typeof event.sig === "string"
  )
}

function tagValue(event: Event, name: string): string {
  const matches = event.tags.filter(
    (tag) => tag[0] === name && tag.length === 2
  )
  return matches.length === 1 ? (matches[0]?.[1] ?? "") : ""
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new ImmortalRelayError("relay_unavailable", message)),
          timeoutMs
        )
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

function jsonValue(value: unknown): Schema.Json {
  return Schema.decodeUnknownSync(Schema.Json)(value)
}
