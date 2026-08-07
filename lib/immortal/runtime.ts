import { Effect, Schema } from "effect"
import type { Event } from "@openagentsinc/nip-mkt"

import {
  createRequesterSession,
  ingestRequesterSession,
  loadImmortalBrowserClient,
  requesterRfq,
  restoreRequesterSession,
  type ImmortalBrowserClient,
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
  digestJson,
  engineInputsForSession,
  loadOrCreateDemoIdentity,
  type DemoIdentity,
  type StoredImmortalSession,
} from "./store"
import {
  ImmortalRelayError,
  ImmortalRelayTransport,
  signImmortalRequest,
  validatePrivateDelivery,
  validateLocalRequesterDelivery,
  validatePublicOffering,
  validatePublicProviderProfile,
  wrapRequesterRecord,
  type RelayInformation,
  type RelaySnapshot,
} from "./transport"
import {
  EMPTY_MARKET,
  IDLE_QUOTES,
  eligibleRoutes,
  foldMarketHeads,
  selectBestQuote,
  validateQuoteView,
  type ImmortalMarketSnapshot,
  type MarketRoute,
  type QuoteRequestContext,
  type QuoteRequestInput,
  type QuoteState,
  type ValidatedQuote,
} from "./market"
import { selectImmortalDemoRequestTemplate } from "./request-contract"

type StatusListener = (status: ImmortalRuntimeStatus) => void
type ProvenanceListener = (provenance: ImmortalRuntimeProvenance | null) => void
type MarketListener = (market: ImmortalMarketSnapshot) => void
type QuoteListener = (quotes: QuoteState) => void

export interface ImmortalRuntimeListeners {
  readonly onStatus: StatusListener
  readonly onProvenance: ProvenanceListener
  readonly onMarket: MarketListener
  readonly onQuotes: QuoteListener
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
  private readonly publicHeads = new Map<string, Event>()
  private market: ImmortalMarketSnapshot = EMPTY_MARKET
  private quoteState: QuoteState = IDLE_QUOTES
  private readonly quoteContexts = new Map<string, QuoteRequestContext>()
  private readonly quoteCandidates = new Map<string, ValidatedQuote>()
  private readonly quoteFailures = new Map<string, string>()
  private currentQuoteInput: QuoteRequestInput | null = null
  private quoteGeneration = 0
  private quoteTimeout: ReturnType<typeof setTimeout> | null = null
  private quoteExpiryTimer: ReturnType<typeof setTimeout> | null = null
  private lockedSessionId: string | null = null

  constructor(private readonly listeners: ImmortalRuntimeListeners) {}

  async start(configResult: ImmortalConfigResult): Promise<void> {
    this.stopped = false
    this.listeners.onMarket(EMPTY_MARKET)
    this.listeners.onQuotes(IDLE_QUOTES)

    if (configResult.state === "unavailable") {
      this.listeners.onProvenance(null)
      this.emit({
        state: "unavailable",
        code: configResult.code,
        detail: configResult.detail,
      })
      return
    }

    this.emit({
      state: "loading",
      detail: "Loading the pinned Immortal requester engine…",
    })
    try {
      this.client = await loadPinnedEngine()
    } catch (cause) {
      this.listeners.onProvenance(null)
      this.emit({
        state: "incompatible",
        code: errorCode(cause, "engine_incompatible"),
        detail: safeDetail(
          cause,
          "The Immortal requester engine is incompatible."
        ),
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
        detail: safeDetail(
          cause,
          "The local Immortal session store is unavailable."
        ),
      })
      return
    }

    await this.connect(0)
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout)
    if (this.quoteExpiryTimer) clearTimeout(this.quoteExpiryTimer)
    this.reconnectTimer = null
    this.quoteTimeout = null
    this.quoteExpiryTimer = null
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

  getMarket(): ImmortalMarketSnapshot {
    return this.market
  }

  getQuotes(): QuoteState {
    return this.quoteState
  }

  resetQuotes(): void {
    if (this.lockedSessionId) return
    this.quoteGeneration += 1
    this.currentQuoteInput = null
    this.quoteCandidates.clear()
    this.quoteFailures.clear()
    this.clearQuoteTimers()
    this.emitQuotes(IDLE_QUOTES)
  }

  lockQuote(sessionId: string): void {
    const selected =
      this.quoteState.state === "ready" ? this.quoteState.selected : null
    if (!selected || selected.sessionId !== sessionId) {
      throw new Error(
        "quote_lock_invalid: only the selected Quote can be locked"
      )
    }
    this.lockedSessionId = sessionId
    this.clearQuoteTimers()
  }

  async requestQuotes(input: QuoteRequestInput, force = false): Promise<void> {
    if (
      !this.client ||
      !this.store ||
      !this.identity ||
      !this.transport ||
      !this.config ||
      this.stopped
    ) {
      this.emitQuotes({
        state: "unavailable",
        requestKey: quoteRequestKey(input),
        detail: "The Immortal relay is not live yet.",
      })
      return
    }
    if (this.lockedSessionId) return

    const requestKey = quoteRequestKey(input)
    if (
      !force &&
      this.quoteState.state !== "idle" &&
      this.quoteState.requestKey === requestKey
    ) {
      return
    }
    const routes = eligibleRoutes(this.market, input)
    if (routes.length < 2) {
      this.currentQuoteInput = input
      this.quoteCandidates.clear()
      this.quoteFailures.clear()
      this.clearQuoteTimers()
      this.emitQuotes({
        state: "unavailable",
        requestKey,
        detail:
          routes.length === 0
            ? "That amount is outside the active providers' shared limits."
            : "Two active providers are required for a competitive quote.",
      })
      return
    }

    const generation = ++this.quoteGeneration
    const logicalRequestId = await digestJson({
      schema: "openagents.bazaar.logical-rfq.v1",
      requestKey,
      nonce: randomHex32(),
    })
    this.currentQuoteInput = input
    this.quoteCandidates.clear()
    this.quoteFailures.clear()
    this.clearQuoteTimers()
    this.emitQuotes({
      state: "requesting",
      logicalRequestId,
      requestKey,
      requestedProviderCount: routes.length,
      quotes: [],
      detail: `Waiting for ${routes.length} independently signed Quotes…`,
    })

    const outcomes = await Promise.allSettled(
      routes.map((route) =>
        this.publishRfq(route, input, requestKey, logicalRequestId, generation)
      )
    )
    if (generation !== this.quoteGeneration) return
    if (outcomes.every((outcome) => outcome.status === "rejected")) {
      const first = outcomes[0]
      this.emitQuotes({
        state: "invalid",
        logicalRequestId,
        requestKey,
        detail:
          first?.status === "rejected"
            ? safeDetail(first.reason, "Every provider refused the RFQ.")
            : "Every provider refused the RFQ.",
      })
      return
    }
    this.quoteTimeout = setTimeout(() => {
      this.quoteTimeout = null
      if (generation !== this.quoteGeneration) return
      this.finishQuoteCollection(logicalRequestId, requestKey, routes.length)
    }, 10_000)
  }

  private async publishRfq(
    route: MarketRoute,
    input: QuoteRequestInput,
    requestKey: string,
    logicalRequestId: string,
    generation: number
  ): Promise<void> {
    if (
      !this.client ||
      !this.store ||
      !this.identity ||
      !this.transport ||
      !this.config ||
      generation !== this.quoteGeneration
    ) {
      throw new Error("quote_request_cancelled: the quote request changed")
    }
    const now = Math.floor(Date.now() / 1_000)
    const expiresAt = now + 900
    const sessionId = await digestJson({
      schema: "openagents.bazaar.provider-rfq.v1",
      logicalRequestId,
      providerPubkey: route.providerPubkey,
      offeringCoordinate: route.offeringCoordinate,
    })
    const config = {
      session_id: sessionId,
      requester_pubkey: this.identity.pubkey,
      provider_pubkey: route.providerPubkey,
      offering_address: route.offeringCoordinate,
    }
    const signingRequest = await Effect.runPromise(
      requesterRfq(
        this.client,
        jsonValue({
          config,
          created_at: now,
          distinct: await digestJson({
            logicalRequestId,
            sessionId,
            kind: "rfq",
          }),
          expiration: expiresAt,
          mkt_swp: createRfqProfile(
            route,
            input,
            selectImmortalDemoRequestTemplate(
              this.config.requestContract,
              route,
              input
            ),
            now
          ),
        })
      )
    )
    const rfq = await signImmortalRequest(
      this.client,
      signingRequest,
      this.identity
    )
    const local = await validateLocalRequesterDelivery(this.client, rfq, now)
    await this.store.create({
      sessionId,
      requesterPubkey: this.identity.pubkey,
      providerPubkey: route.providerPubkey,
      relayUrl: this.config.relay.websocketUrl,
      selectedProviderRoute: {
        role: route.providerRole,
        providerPubkey: route.providerPubkey,
        offeringCoordinate: route.offeringCoordinate,
        relayUrl: this.config.relay.websocketUrl,
      },
      engineSnapshotJsonHex: "",
      engineView: null,
    })
    await this.store.appendDelivery(
      sessionId,
      local.signedRecord,
      local.storedDelivery
    )
    this.quoteContexts.set(sessionId, {
      ...input,
      logicalRequestId,
      requestKey,
      sessionId,
      rfqId: rfq.id,
      providerRole: route.providerRole,
      providerPubkey: route.providerPubkey,
      offeringCoordinate: route.offeringCoordinate,
      expiresAt,
    })
    const copies = await wrapRequesterRecord(
      rfq,
      this.identity,
      route.providerPubkey
    )
    await Promise.all([
      this.transport.publish(copies.counterparty),
      this.transport.publish(copies.senderRecovery),
    ])
  }

  private acceptQuote(
    view: Parameters<typeof validateQuoteView>[0],
    quoteEvent: Event
  ): void {
    const context = this.quoteContexts.get(view.session_id)
    if (
      !context ||
      context.requestKey !== quoteStateKey(this.quoteState) ||
      context.logicalRequestId !== quoteStateLogicalId(this.quoteState)
    ) {
      return
    }
    const quote = validateQuoteView(
      view,
      quoteEvent,
      context,
      Math.floor(Date.now() / 1_000)
    )
    this.quoteCandidates.set(quote.quoteId, quote)
    const requestedProviderCount =
      this.quoteState.state === "requesting" ||
      this.quoteState.state === "ready"
        ? this.quoteState.requestedProviderCount
        : 0
    const quotes = currentProviderQuotes(this.quoteCandidates)
    if (quotes.length >= requestedProviderCount) {
      this.finishQuoteCollection(
        context.logicalRequestId,
        context.requestKey,
        requestedProviderCount
      )
      return
    }
    this.emitQuotes({
      state: "requesting",
      logicalRequestId: context.logicalRequestId,
      requestKey: context.requestKey,
      requestedProviderCount,
      quotes,
      detail: `${quotes.length} of ${requestedProviderCount} signed Quotes received…`,
    })
  }

  private finishQuoteCollection(
    logicalRequestId: string,
    requestKey: string,
    requestedProviderCount: number
  ): void {
    this.clearQuoteTimeout()
    const quotes = currentProviderQuotes(this.quoteCandidates)
    if (quotes.length < 2) {
      const failure = this.quoteFailures.values().next().value
      this.emitQuotes({
        state: "invalid",
        logicalRequestId,
        requestKey,
        detail: failure
          ? `Fewer than two valid signed Quotes: ${failure}`
          : "Fewer than two providers returned a current, valid signed Quote.",
      })
      return
    }
    const selected = selectBestQuote(quotes, Math.floor(Date.now() / 1_000))
    if (!selected) {
      this.emitQuotes({
        state: "invalid",
        logicalRequestId,
        requestKey,
        detail:
          "No current signed Quote passed the deterministic selection policy.",
      })
      return
    }
    this.emitQuotes({
      state: "ready",
      logicalRequestId,
      requestKey,
      requestedProviderCount,
      quotes,
      selected,
      selectionPolicy: "highest_output_then_lowest_fee_then_provider_key",
    })
    this.scheduleQuoteExpiry(selected)
  }

  private scheduleQuoteExpiry(selected: ValidatedQuote): void {
    if (this.quoteExpiryTimer) clearTimeout(this.quoteExpiryTimer)
    const delay = Math.max(
      0,
      selected.effectiveAcceptanceDeadline * 1_000 - Date.now()
    )
    this.quoteExpiryTimer = setTimeout(
      () => {
        this.quoteExpiryTimer = null
        if (this.lockedSessionId === selected.sessionId) {
          this.emitQuotes({
            state: "invalid",
            logicalRequestId: selected.logicalRequestId,
            requestKey: selected.requestKey,
            detail:
              "The ordered Quote expired; the session was not silently repriced.",
          })
          return
        }
        const input = this.currentQuoteInput
        if (!input) return
        void this.requestQuotes(input, true).catch((cause: unknown) => {
          this.emitQuotes({
            state: "invalid",
            logicalRequestId: selected.logicalRequestId,
            requestKey: selected.requestKey,
            detail: safeDetail(
              cause,
              "Fresh signed Quotes could not be requested."
            ),
          })
        })
      },
      Math.min(delay, 2_147_483_647)
    )
  }

  private clearQuoteTimeout(): void {
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout)
    this.quoteTimeout = null
  }

  private clearQuoteTimers(): void {
    this.clearQuoteTimeout()
    if (this.quoteExpiryTimer) clearTimeout(this.quoteExpiryTimer)
    this.quoteExpiryTimer = null
  }

  private emitQuotes(quotes: QuoteState): void {
    this.quoteState = quotes
    if (!this.stopped) this.listeners.onQuotes(quotes)
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
        ? {
            state: "connecting",
            detail: "Authenticating directly with the Immortal relay…",
          }
        : {
            state: "reconnecting",
            attempt,
            detail:
              "Reconnecting the direct relay session and replaying its snapshot…",
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
        this.emit({
          state: "incompatible",
          code: cause.code,
          detail: cause.message,
        })
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
      detail:
        "The relay disconnected; restoring the authenticated snapshot before live updates.",
    })
    const delay = Math.min(8_000, 500 * 2 ** Math.min(attempt - 1, 4))
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect(attempt)
    }, delay)
  }

  private async consumeSnapshot(snapshot: RelaySnapshot): Promise<void> {
    for (const event of snapshot.publicEvents)
      await this.consumePublicEvent(event)
    for (const event of snapshot.privateEvents)
      await this.consumePrivateEvent(event)
  }

  private async consumePublicEvent(event: Event): Promise<void> {
    if (
      !this.client ||
      !this.config ||
      (event.kind !== 39_600 && event.kind !== 39_601)
    ) {
      return
    }
    if (
      !this.config.providers.some(
        (provider) => provider.pubkey === event.pubkey
      )
    )
      return
    const validatedRaw =
      event.kind === 39_601
        ? await validatePublicOffering(this.client, event)
        : validatePublicProviderProfile(event)
    const validated: Event = {
      ...validatedRaw,
      tags: validatedRaw.tags.map((tag) => [...tag]),
    }
    const coordinate = `${validated.kind}:${validated.pubkey}:${tagValue(validated.tags, "d")}`
    if (validated.kind === 39_601) {
      if (
        !this.config.providers.some(
          (provider) => provider.offeringCoordinate === coordinate
        )
      ) {
        return
      }
    }
    const current = this.publicHeads.get(coordinate)
    if (!current || newerHead(validated, current)) {
      this.publicHeads.set(coordinate, validated)
      this.market = foldMarketHeads([...this.publicHeads.values()], this.config)
      this.listeners.onMarket(this.market)
    }
    if (this.relayInformation) this.emitLive()
  }

  private async consumePrivateEvent(event: Event): Promise<void> {
    if (!this.client || !this.identity || !this.store) return
    const delivery = await validatePrivateDelivery(
      this.client,
      event,
      this.identity
    )
    let session: StoredImmortalSession
    try {
      session = await this.store.get(delivery.sessionId)
    } catch {
      // A Quote can race the durable RFQ session creation. The live lifecycle
      // creates the session before publishing its RFQ; unknown sessions are
      // refused rather than becoming unbound inbox authority.
      return
    }
    try {
      session = await this.store.appendDelivery(
        delivery.sessionId,
        delivery.signedRecord,
        delivery.storedDelivery
      )
      const result = session.engineSnapshotJsonHex
        ? await Effect.runPromise(
            ingestRequesterSession(
              this.client,
              jsonValue({
                snapshot_json_hex: session.engineSnapshotJsonHex,
                records: [delivery.unwrapped.event],
                deliveries: engineInputsForSession(session),
              })
            )
          )
        : delivery.unwrapped.event.kind === 39_605
          ? await Effect.runPromise(
              createRequesterSession(
                this.client,
                jsonValue({
                  config: sessionConfig(session),
                  records: session.signedRecords.map(storedRecordEvent),
                  exit_packages: [],
                  deliveries: engineInputsForSession(session),
                })
              )
            )
          : null
      if (!result) return
      await this.store.saveEngineSnapshot(
        session.sessionId,
        result.snapshot_json_hex,
        result.view
      )
      if (delivery.unwrapped.event.kind === 39_605) {
        this.acceptQuote(result.view, delivery.unwrapped.event)
      }
    } catch (cause) {
      const context = this.quoteContexts.get(delivery.sessionId)
      if (!context || context.requestKey !== quoteStateKey(this.quoteState))
        return
      const detail = safeDetail(
        cause,
        "A signed Quote failed requester-engine validation."
      )
      this.quoteFailures.set(context.providerPubkey, detail)
      this.clearQuoteTimers()
      this.emitQuotes({
        state: "invalid",
        logicalRequestId: context.logicalRequestId,
        requestKey: context.requestKey,
        detail,
      })
    }
  }

  private async restoreStoredSessions(): Promise<number> {
    if (!this.client || !this.store) return 0
    const sessions = await this.store.list()
    let restored = 0
    for (const session of sessions) {
      if (!session.engineSnapshotJsonHex) continue
      const result = await Effect.runPromise(
        restoreRequesterSession(
          this.client,
          jsonValue({
            snapshot_json_hex: session.engineSnapshotJsonHex,
            deliveries: engineInputsForSession(session),
          })
        )
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
      offeringCount: this.market.activeOfferingCount,
      restoredSessionCount: this.restoredSessionCount,
      checkedAt: new Date().toISOString(),
    })
  }

  private emit(status: ImmortalRuntimeStatus): void {
    if (!this.stopped) this.listeners.onStatus(status)
  }
}

function createRfqProfile(
  route: MarketRoute,
  input: QuoteRequestInput,
  template: ImmortalDemoConfig["requestContract"]["templates"][number],
  now: number
): Record<string, unknown> {
  return {
    constraints: {
      allowed_script_modes: route.scriptModes,
      asset_pair: [input.inputAssetId, input.outputAssetId],
      confirmation_policy: route.confirmationPolicy,
      desired_completion_time: now + 600,
      firm_quote_required: true,
      input_amount: input.inputAmount,
      invoice_sha256: template.invoiceSha256,
      maximum_total_fee: input.inputAmount,
      payment_hash: template.paymentHash,
      requester_public_keys: template.requesterPublicKeys.map((key) => ({
        leg_id: key.legId,
        path: key.path,
        public_key: key.publicKey,
      })),
      swap_type: route.swapType,
    },
  }
}

function sessionConfig(
  session: StoredImmortalSession
): Record<string, unknown> {
  return {
    session_id: session.sessionId,
    requester_pubkey: session.requesterPubkey,
    provider_pubkey: session.providerPubkey,
    offering_address: session.selectedProviderRoute.offeringCoordinate,
  }
}

function storedRecordEvent(
  record: StoredImmortalSession["signedRecords"][number]
): Event {
  return JSON.parse(record.rawSignedEvent) as Event
}

function quoteRequestKey(input: QuoteRequestInput): string {
  return `${input.inputAssetId}\n${input.outputAssetId}\n${input.inputAmount}`
}

function quoteStateKey(state: QuoteState): string | null {
  return state.state === "idle" ? null : state.requestKey
}

function quoteStateLogicalId(state: QuoteState): string | null {
  return state.state === "requesting" ||
    state.state === "ready" ||
    state.state === "invalid"
    ? state.logicalRequestId
    : null
}

function currentProviderQuotes(
  candidates: ReadonlyMap<string, ValidatedQuote>
): readonly ValidatedQuote[] {
  const providers = new Map<string, ValidatedQuote>()
  for (const quote of candidates.values()) {
    const current = providers.get(quote.providerPubkey)
    if (
      !current ||
      quote.expiresAt > current.expiresAt ||
      (quote.expiresAt === current.expiresAt && quote.quoteId < current.quoteId)
    ) {
      providers.set(quote.providerPubkey, quote)
    }
  }
  return [...providers.values()].sort((left, right) =>
    left.providerPubkey.localeCompare(right.providerPubkey)
  )
}

function randomHex32(): string {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)))
}

function newerHead(candidate: Event, current: Event): boolean {
  return (
    candidate.created_at > current.created_at ||
    (candidate.created_at === current.created_at && candidate.id < current.id)
  )
}

async function loadPinnedEngine(): Promise<ImmortalBrowserClient> {
  const [artifactResponse, wasmResponse] = await Promise.all([
    fetch("/immortal/artifact.json", { cache: "no-store" }),
    fetch(IMMORTAL_ARTIFACT.wasmUrl, { cache: "force-cache" }),
  ])
  if (!artifactResponse.ok || !wasmResponse.ok) {
    throw new Error(
      "browser_wasm_fetch_failed: the pinned artifact is unavailable"
    )
  }
  const artifact = (await artifactResponse.json()) as Record<string, unknown>
  if (
    artifact.schema !== IMMORTAL_ARTIFACT.schema ||
    artifact.source_revision !== IMMORTAL_ARTIFACT.sourceRevision ||
    artifact.requester_api_sha256 !== IMMORTAL_ARTIFACT.requesterApiSha256 ||
    artifact.sha256 !== IMMORTAL_ARTIFACT.wasmSha256 ||
    artifact.bytes !== IMMORTAL_ARTIFACT.wasmBytes
  ) {
    throw new Error(
      "browser_artifact_manifest_mismatch: artifact provenance changed"
    )
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
  if (cause && typeof cause === "object" && "detail" in cause) {
    const detail = (cause as { detail?: unknown }).detail
    if (
      typeof detail === "string" &&
      detail.trim().length > 0 &&
      detail.length <= 240
    ) {
      return detail
    }
  }
  if (
    cause instanceof Error &&
    cause.message.trim().length > 0 &&
    cause.message.length <= 240
  )
    return cause.message
  return fallback
}
