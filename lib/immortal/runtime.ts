import { Effect, Schema } from "effect"
import type { Event } from "@openagentsinc/nip-mkt"

import {
  createRequesterSession,
  ingestRequesterSession,
  loadImmortalBrowserClient,
  requesterCancel,
  requesterContract,
  requesterContractDraft,
  requesterOrder,
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
  type StoredSignedRecord,
  type StoredValidatedDelivery,
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
  quoteRequestKey,
  selectBestQuote,
  validateQuoteView,
  type ImmortalMarketSnapshot,
  type MarketRoute,
  type QuoteRequestContext,
  type QuoteRequestInput,
  type QuoteState,
  type ValidatedQuote,
} from "./market"
import { assertDestinationMatchesQuote } from "./destination"
import { selectImmortalDemoRequestTemplate } from "./request-contract"
import {
  IDLE_LIFECYCLE,
  demoSessionRecords,
  isStartedDemoSession,
  parseMktProfile,
  projectDemoLifecycle,
  type DemoLifecycleState,
} from "./lifecycle"

type StatusListener = (status: ImmortalRuntimeStatus) => void
type ProvenanceListener = (provenance: ImmortalRuntimeProvenance | null) => void
type MarketListener = (market: ImmortalMarketSnapshot) => void
type QuoteListener = (quotes: QuoteState) => void
type LifecycleListener = (lifecycle: DemoLifecycleState) => void
type ValidatedPrivateDelivery = Awaited<
  ReturnType<typeof validatePrivateDelivery>
>

interface LifecyclePublication {
  readonly session: StoredImmortalSession
  readonly event: Event
  readonly advanceDelay: number
  readonly refreshSnapshot: boolean
}

export interface ImmortalRuntimeListeners {
  readonly onStatus: StatusListener
  readonly onProvenance: ProvenanceListener
  readonly onMarket: MarketListener
  readonly onQuotes: QuoteListener
  readonly onLifecycle: LifecycleListener
}

export class ImmortalBrowserRuntime {
  private client: ImmortalBrowserClient | null = null
  private store: ImmortalSessionStore | null = null
  private identity: DemoIdentity | null = null
  private transport: ImmortalRelayTransport | null = null
  private readonly transports = new Map<string, ImmortalRelayTransport>()
  private config: ImmortalDemoConfig | null = null
  private stopped = false
  private readonly reconnectTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()
  private readonly reconnectAttempts = new Map<string, number>()
  private restoredSessionCount = 0
  private relayInformation: RelayInformation | null = null
  private readonly relayInformationByUrl = new Map<string, RelayInformation>()
  private relayReady = false
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
  private lifecycleState: DemoLifecycleState = IDLE_LIFECYCLE
  private lifecycleTimer: ReturnType<typeof setTimeout> | null = null
  private lifecycleTimeout: ReturnType<typeof setTimeout> | null = null
  private lifecycleSnapshotRefresh: ReturnType<typeof setTimeout> | null = null
  private readonly sessionQueues = new Map<string, Promise<void>>()

  constructor(private readonly listeners: ImmortalRuntimeListeners) {}

  async start(configResult: ImmortalConfigResult): Promise<void> {
    this.stopped = false
    this.listeners.onMarket(EMPTY_MARKET)
    this.listeners.onQuotes(IDLE_QUOTES)
    this.emitLifecycle(IDLE_LIFECYCLE)

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
    for (const timer of this.reconnectTimers.values()) clearTimeout(timer)
    if (this.quoteTimeout) clearTimeout(this.quoteTimeout)
    if (this.quoteExpiryTimer) clearTimeout(this.quoteExpiryTimer)
    if (this.lifecycleTimer) clearTimeout(this.lifecycleTimer)
    if (this.lifecycleTimeout) clearTimeout(this.lifecycleTimeout)
    if (this.lifecycleSnapshotRefresh)
      clearTimeout(this.lifecycleSnapshotRefresh)
    this.reconnectTimers.clear()
    this.reconnectAttempts.clear()
    this.quoteTimeout = null
    this.quoteExpiryTimer = null
    this.lifecycleTimer = null
    this.lifecycleTimeout = null
    this.lifecycleSnapshotRefresh = null
    for (const transport of this.transports.values()) transport.close()
    this.transports.clear()
    this.transport = null
    this.relayReady = false
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

  async startDemo(sessionId: string): Promise<void> {
    if (this.lifecycleState.state === "running") return
    if (!this.transport || !this.client || !this.store || !this.identity) {
      throw new Error(
        "demo_unavailable: the authenticated Immortal runtime is not live"
      )
    }
    try {
      this.lockQuote(sessionId)
      const session = await this.store.get(sessionId)
      this.emitSessionLifecycle(session)
      await this.advanceLifecycle(sessionId)
    } catch (cause) {
      this.emitLifecycleFailure(sessionId, cause)
    }
  }

  retryDemo(): void {
    if (this.lifecycleState.state !== "error") return
    const sessionId = this.lifecycleState.sessionId
    if (!sessionId) return
    void this.getStore()
      .get(sessionId)
      .then((session) => {
        this.emitSessionLifecycle(session)
        return this.advanceLifecycle(sessionId)
      })
      .catch((cause: unknown) => this.emitLifecycleFailure(sessionId, cause))
  }

  runAnotherDemo(): void {
    if (this.lifecycleState.state !== "complete") return
    this.lockedSessionId = null
    this.emitLifecycle(IDLE_LIFECYCLE)
    this.resetQuotes()
  }

  private async advanceLifecycle(sessionId: string): Promise<void> {
    if (this.stopped || this.lockedSessionId !== sessionId) return
    if (!this.relayReady) {
      this.scheduleLifecycleAdvance(sessionId, 500)
      return
    }
    try {
      const publication = await this.serialSession(sessionId, async () => {
        if (!this.client || !this.store || !this.identity || !this.transport) {
          throw new Error(
            "demo_unavailable: the authenticated Immortal runtime is not live"
          )
        }
        let session = await this.store.get(sessionId)
        const records = demoSessionRecords(session)
        if (records.close) {
          this.emitSessionLifecycle(session)
          return null
        }

        if (!records.order) {
          const request = await Effect.runPromise(
            requesterOrder(
              this.client,
              jsonValue({
                config: sessionConfig(session),
                rfq: records.rfq,
                quote: records.quote,
                created_at: Math.max(
                  Math.floor(Date.now() / 1_000),
                  records.quote.created_at + 1
                ),
                observed_at: records.quote.created_at,
                distinct: await digestJson({
                  schema: "openagents.bazaar.no-spend-action.v1",
                  sessionId,
                  action: "order",
                }),
                selection: null,
              })
            )
          )
          const persisted = await this.persistRequesterRecord(session, request)
          return {
            ...persisted,
            advanceDelay: 300,
            refreshSnapshot: false,
          }
        }

        if (!records.requesterContract) {
          const quoteProfile = parseMktProfile(records.quote)
          const terms = record(quoteProfile.terms, "Quote terms")
          const swapType = stringMember(terms, "swap_type")
          const draft = await Effect.runPromise(
            requesterContractDraft(
              this.client,
              jsonValue({
                config: sessionConfig(session),
                rfq: records.rfq,
                quote: records.quote,
                order: records.order,
                order_observed_at: records.order.created_at,
                local_inputs: await requesterLocalContractInputs(
                  swapType,
                  sessionId
                ),
              })
            )
          )
          const request = await Effect.runPromise(
            requesterContract(
              this.client,
              jsonValue({
                config: sessionConfig(session),
                rfq: records.rfq,
                quote: records.quote,
                order: records.order,
                order_observed_at: records.order.created_at,
                created_at: Math.max(
                  Math.floor(Date.now() / 1_000),
                  records.order.created_at + 1
                ),
                distinct: await digestJson({
                  schema: "openagents.bazaar.no-spend-action.v1",
                  sessionId,
                  action: "requester-contract",
                }),
                contract: draft,
              })
            )
          )
          const persisted = await this.persistRequesterRecord(session, request)
          return {
            ...persisted,
            advanceDelay: 1_000,
            refreshSnapshot: false,
          }
        }

        if (!records.providerContract || !records.providerStatus) {
          return {
            session,
            event: records.requesterContract,
            advanceDelay: 1_000,
            refreshSnapshot: true,
          }
        }

        if (!records.cancelRequest) {
          const request = await Effect.runPromise(
            requesterCancel(
              this.client,
              jsonValue({
                config: sessionConfig(session),
                created_at: Math.max(
                  Math.floor(Date.now() / 1_000),
                  records.providerStatus.created_at + 1
                ),
                distinct: await digestJson({
                  schema: "openagents.bazaar.no-spend-action.v1",
                  sessionId,
                  action: "cancel-request",
                }),
                order_id: records.order.id,
                cancellation: {
                  action: "request",
                  reason: "bazaar_no_spend_demo",
                  request_id: null,
                  accepted_id: null,
                },
                mkt_swp: { disposition: "no_funding_authorized" },
              })
            )
          )
          const persisted = await this.persistRequesterRecord(session, request)
          return {
            ...persisted,
            advanceDelay: 1_000,
            refreshSnapshot: true,
          }
        }

        if (
          !records.cancelAccepted ||
          !records.cancelEffective ||
          !records.close
        ) {
          session = await this.store.get(sessionId)
          return {
            session,
            event: records.cancelRequest,
            advanceDelay: 1_000,
            refreshSnapshot: true,
          }
        }

        return null
      })
      if (!publication) return
      await this.publishRequesterEvent(publication.session, publication.event)
      this.scheduleLifecycleAdvance(sessionId, publication.advanceDelay)
      if (publication.refreshSnapshot) {
        this.scheduleLifecycleSnapshotRefresh(sessionId)
      }
    } catch (cause) {
      this.emitLifecycleFailure(sessionId, cause)
    }
  }

  private async persistRequesterRecord(
    session: StoredImmortalSession,
    request: Parameters<typeof signImmortalRequest>[1]
  ): Promise<Pick<LifecyclePublication, "session" | "event">> {
    if (!this.client || !this.store || !this.identity) {
      throw new Error("demo_unavailable: the requester runtime stopped")
    }
    const event = await signImmortalRequest(this.client, request, this.identity)
    const local = await validateLocalRequesterDelivery(
      this.client,
      event,
      event.created_at
    )
    const candidate = sessionWithDelivery(
      session,
      local.signedRecord,
      local.storedDelivery
    )
    if (!candidate.engineSnapshotJsonHex) {
      throw new Error(
        "session_snapshot_missing: the selected Quote has no engine snapshot"
      )
    }
    const result = await Effect.runPromise(
      ingestRequesterSession(
        this.client,
        jsonValue({
          snapshot_json_hex: candidate.engineSnapshotJsonHex,
          records: [event],
          deliveries: engineInputsForSession(candidate),
        })
      )
    )
    const updated = await this.store.commitDeliveryAndEngineSnapshot(
      session.sessionId,
      local.signedRecord,
      local.storedDelivery,
      result.snapshot_json_hex,
      result.view
    )
    this.emitSessionLifecycle(updated)
    return { session: updated, event }
  }

  private async publishRequesterEvent(
    session: StoredImmortalSession,
    event: Event
  ): Promise<void> {
    const transport = this.transportForRelay(session.relayUrl)
    if (!this.identity || !transport) {
      throw new Error("relay_unavailable: the direct relay is disconnected")
    }
    const copies = await wrapRequesterRecord(
      event,
      this.identity,
      session.providerPubkey
    )
    await Promise.all([
      transport.publish(copies.counterparty),
      transport.publish(copies.senderRecovery),
    ])
  }

  private scheduleLifecycleAdvance(sessionId: string, delay = 300): void {
    if (this.lifecycleTimer) return
    this.lifecycleTimer = setTimeout(() => {
      this.lifecycleTimer = null
      void this.advanceLifecycle(sessionId)
    }, delay)
  }

  private scheduleLifecycleSnapshotRefresh(sessionId: string): void {
    if (this.lifecycleSnapshotRefresh) return
    this.lifecycleSnapshotRefresh = setTimeout(() => {
      this.lifecycleSnapshotRefresh = null
      if (
        this.stopped ||
        this.lockedSessionId !== sessionId ||
        this.lifecycleState.state !== "running"
      ) {
        return
      }
      void this.refreshSessionRelay(sessionId).catch((cause: unknown) =>
        this.emitLifecycleFailure(sessionId, cause)
      )
    }, 2_000)
  }

  private emitSessionLifecycle(session: StoredImmortalSession): void {
    const next = projectDemoLifecycle(session)
    const previousStage =
      this.lifecycleState.state === "running"
        ? this.lifecycleState.activeStage
        : null
    this.emitLifecycle(next)
    if (next.state === "running" && next.activeStage !== previousStage) {
      if (this.lifecycleTimeout) clearTimeout(this.lifecycleTimeout)
      this.lifecycleTimeout = setTimeout(() => {
        this.lifecycleTimeout = null
        if (
          this.lifecycleState.state === "running" &&
          this.lifecycleState.sessionId === next.sessionId &&
          this.lifecycleState.activeStage === next.activeStage
        ) {
          this.emitLifecycle({
            state: "error",
            sessionId: next.sessionId,
            providerRole: next.providerRole,
            activeStage: next.activeStage,
            completedStages: next.completedStages,
            code: "provider_timeout",
            detail:
              "The selected provider did not advance the durable session in time. Retry after it reconnects.",
            recoverable: true,
          })
        }
      }, 30_000)
    }
    if (next.state === "complete" && this.lifecycleTimeout) {
      clearTimeout(this.lifecycleTimeout)
      this.lifecycleTimeout = null
    }
    if (next.state === "complete" && this.lifecycleSnapshotRefresh) {
      clearTimeout(this.lifecycleSnapshotRefresh)
      this.lifecycleSnapshotRefresh = null
    }
  }

  private emitLifecycleFailure(sessionId: string, cause: unknown): void {
    const current = this.lifecycleState
    this.emitLifecycle({
      state: "error",
      sessionId,
      providerRole:
        current.state === "running" || current.state === "complete"
          ? current.providerRole
          : current.state === "error"
            ? current.providerRole
            : null,
      activeStage:
        current.state === "running"
          ? current.activeStage
          : current.state === "error"
            ? current.activeStage
            : null,
      completedStages: current.completedStages,
      code: errorCode(cause, "demo_session_failed"),
      detail: safeDetail(cause, "The selected Immortal session failed closed."),
      recoverable: true,
    })
  }

  private emitLifecycle(lifecycle: DemoLifecycleState): void {
    this.lifecycleState = lifecycle
    if (!this.stopped) this.listeners.onLifecycle(lifecycle)
  }

  private async serialSession<Result>(
    sessionId: string,
    operation: () => Promise<Result>
  ): Promise<Result> {
    const prior = this.sessionQueues.get(sessionId) ?? Promise.resolve()
    const current = prior.catch(() => undefined).then(operation)
    const queued = current.then(
      () => undefined,
      () => undefined
    )
    this.sessionQueues.set(sessionId, queued)
    try {
      return await current
    } finally {
      if (this.sessionQueues.get(sessionId) === queued) {
        this.sessionQueues.delete(sessionId)
      }
    }
  }

  async requestQuotes(input: QuoteRequestInput, force = false): Promise<void> {
    if (
      !this.client ||
      !this.store ||
      !this.identity ||
      !this.relayReady ||
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
      relayUrl: route.relayUrl,
      selectedProviderRoute: {
        role: route.providerRole,
        providerPubkey: route.providerPubkey,
        offeringCoordinate: route.offeringCoordinate,
        relayUrl: route.relayUrl,
      },
      dynamicInput: {
        inputAmount: input.inputAmount,
        destination: input.destination,
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
    const transport = this.transportForRelay(route.relayUrl)
    if (!transport) {
      throw new Error("relay_unavailable: the provider relay is disconnected")
    }
    await Promise.all([
      transport.publish(copies.counterparty),
      transport.publish(copies.senderRecovery),
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
    assertDestinationMatchesQuote(context.destination, quote.outputAmount)
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
    this.relayReady = false
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
    await Promise.all(
      this.configuredRelays().map((relay) =>
        this.connectRelay(relay, attempt)
      )
    )
  }

  private async connectRelay(
    relay: NonNullable<ImmortalDemoConfig["relayPool"]>[number],
    attempt: number
  ): Promise<void> {
    if (this.stopped || !this.identity) return
    const url = relay.websocketUrl
    const prior = this.transports.get(url)
    this.transports.delete(url)
    prior?.close()
    const transport = new ImmortalRelayTransport(
      url,
      this.identity,
      relay.contractIdentity
    )
    try {
      const information = await transport.connect({
        onSnapshot: (snapshot) => this.consumeSnapshot(snapshot),
        onPublicEvent: (event) => this.consumePublicEvent(event),
        onPrivateEvent: (event) => this.consumePrivateEvent(event),
        onDisconnect: () => this.handleDisconnect(url, transport),
      })
      if (this.stopped) {
        transport.close()
        return
      }
      this.transports.set(url, transport)
      this.relayInformationByUrl.set(url, information)
      if (url === this.config?.relay.websocketUrl) {
        this.transport = transport
        this.relayInformation = information
      }
      this.reconnectAttempts.delete(url)
      this.updateRelayReadiness()
    } catch (cause) {
      transport.close()
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
      this.scheduleReconnect(url, attempt + 1)
    }
  }

  private handleDisconnect(
    url: string,
    disconnected: ImmortalRelayTransport
  ): void {
    if (this.transports.get(url) !== disconnected) return
    this.transports.delete(url)
    this.relayInformationByUrl.delete(url)
    if (this.transport === disconnected) {
      this.transport = null
      this.relayInformation = null
    }
    this.scheduleReconnect(url)
  }

  private scheduleReconnect(url: string, initialAttempt?: number): void {
    if (this.stopped || this.reconnectTimers.has(url)) return
    this.relayReady = false
    const attempt =
      initialAttempt ?? (this.reconnectAttempts.get(url) ?? 0) + 1
    this.reconnectAttempts.set(url, attempt)
    this.emit({
      state: "reconnecting",
      attempt,
      detail:
        "A relay disconnected; restoring every authenticated provider lane before live updates.",
    })
    const delay = Math.min(8_000, 500 * 2 ** Math.min(attempt - 1, 4))
    const timer = setTimeout(() => {
      this.reconnectTimers.delete(url)
      const relay = this.configuredRelays().find(
        (candidate) => candidate.websocketUrl === url
      )
      if (relay) void this.connectRelay(relay, attempt)
    }, delay)
    this.reconnectTimers.set(url, timer)
  }

  private updateRelayReadiness(): void {
    const targets = this.configuredRelays()
    this.relayReady =
      targets.length > 0 &&
      targets.every((relay) => this.transports.has(relay.websocketUrl))
    if (!this.relayReady) return
    this.publishProvenance()
    this.emitLive()
    if (this.lockedSessionId) {
      this.scheduleLifecycleAdvance(this.lockedSessionId, 0)
    }
  }

  private configuredRelays(): NonNullable<ImmortalDemoConfig["relayPool"]> {
    if (!this.config) return []
    return this.config.relayPool?.length
      ? this.config.relayPool
      : [this.config.relay]
  }

  private transportForRelay(url: string): ImmortalRelayTransport | null {
    return this.transports.get(url) ?? null
  }

  private async refreshSessionRelay(sessionId: string): Promise<void> {
    if (!this.store) return
    const session = await this.store.get(sessionId)
    const relay = this.configuredRelays().find(
      (candidate) => candidate.websocketUrl === session.relayUrl
    )
    if (!relay) return
    const transport = this.transports.get(session.relayUrl)
    this.transports.delete(session.relayUrl)
    transport?.close()
    if (this.transport === transport) {
      this.transport = null
      this.relayInformation = null
    }
    this.relayReady = false
    await this.connectRelay(relay, 1)
  }

  private async consumeSnapshot(snapshot: RelaySnapshot): Promise<void> {
    for (const event of snapshot.publicEvents)
      await this.consumePublicEvent(event)
    if (!this.client || !this.identity) return
    const client = this.client
    const identity = this.identity
    const deliveries = await Promise.all(
      snapshot.privateEvents.map((event) =>
        validatePrivateDelivery(client, event, identity)
      )
    )
    deliveries.sort((left, right) =>
      comparePrivateSnapshotDelivery(left, right, identity.pubkey)
    )
    for (const delivery of deliveries) {
      await this.consumeValidatedPrivateDelivery(delivery)
    }
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
    let delivery: ValidatedPrivateDelivery
    try {
      delivery = await validatePrivateDelivery(
        this.client,
        event,
        this.identity
      )
    } catch (cause) {
      if (this.lockedSessionId) {
        this.emitLifecycleFailure(this.lockedSessionId, cause)
      }
      return
    }
    await this.consumeValidatedPrivateDelivery(delivery)
  }

  private async consumeValidatedPrivateDelivery(
    delivery: ValidatedPrivateDelivery
  ): Promise<void> {
    if (!this.client || !this.store) return
    const client = this.client
    const store = this.store
    try {
      await store.get(delivery.sessionId)
    } catch {
      // A Quote can race the durable RFQ session creation. The live lifecycle
      // creates the session before publishing its RFQ; unknown sessions are
      // refused rather than becoming unbound inbox authority.
      return
    }
    try {
      await this.serialSession(delivery.sessionId, async () => {
        let session = await store.get(delivery.sessionId)
        const candidate = sessionWithDelivery(
          session,
          delivery.signedRecord,
          delivery.storedDelivery
        )
        let result = candidate.engineSnapshotJsonHex
          ? await Effect.runPromise(
              ingestRequesterSession(
                client,
                jsonValue({
                  snapshot_json_hex: candidate.engineSnapshotJsonHex,
                  records: [delivery.unwrapped.event],
                  deliveries: engineInputsForSession(candidate),
                })
              )
            )
          : delivery.unwrapped.event.kind === 39_605
            ? await Effect.runPromise(
                createRequesterSession(
                  client,
                  jsonValue({
                    config: sessionConfig(candidate),
                    records: candidate.signedRecords.map(storedRecordEvent),
                    exit_packages: [],
                    deliveries: engineInputsForSession(candidate),
                  })
                )
              )
            : null
        if (!result) return
        if (delivery.unwrapped.event.kind === 39_609) {
          result = await Effect.runPromise(
            restoreRequesterSession(
              client,
              jsonValue({
                snapshot_json_hex: result.snapshot_json_hex,
                deliveries: engineInputsForSession(candidate),
              })
            )
          )
        }
        session = await store.commitDeliveryAndEngineSnapshot(
          delivery.sessionId,
          delivery.signedRecord,
          delivery.storedDelivery,
          result.snapshot_json_hex,
          result.view
        )
        if (delivery.unwrapped.event.kind === 39_605) {
          this.acceptQuote(result.view, delivery.unwrapped.event)
        }
        if (this.lockedSessionId === session.sessionId) {
          this.emitSessionLifecycle(session)
          if (this.lifecycleState.state === "running") {
            this.scheduleLifecycleAdvance(session.sessionId)
          }
        }
      })
    } catch (cause) {
      if (this.lockedSessionId === delivery.sessionId) {
        this.emitLifecycleFailure(delivery.sessionId, cause)
        return
      }
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
    const started: StoredImmortalSession[] = []
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
      const updated = await this.store.saveEngineSnapshot(
        session.sessionId,
        result.snapshot_json_hex,
        result.view
      )
      if (isStartedDemoSession(updated)) started.push(updated)
      restored += 1
    }
    const selected = started.toSorted(
      (left, right) => right.updatedAt - left.updatedAt
    )[0]
    if (selected) {
      this.lockedSessionId = selected.sessionId
      this.emitSessionLifecycle(selected)
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
  const constraints: Record<string, unknown> = {
    allowed_script_modes: route.scriptModes,
    asset_pair: [input.inputAssetId, input.outputAssetId],
    confirmation_policy: route.confirmationPolicy,
    desired_completion_time: now + 600,
    destination_commitment_sha256: input.destination.commitmentSha256,
    firm_quote_required: true,
    input_amount: input.inputAmount,
    maximum_total_fee: input.inputAmount,
    payment_hash: input.destination.paymentHash ?? template.paymentHash,
    requester_public_keys: template.requesterPublicKeys.map((key) => ({
      leg_id: key.legId,
      path: key.path,
      public_key: key.publicKey,
    })),
    swap_type: route.swapType,
  }
  if (route.swapType === "submarine") {
    constraints.invoice_sha256 = input.destination.commitmentSha256
  }
  return {
    constraints: {
      ...constraints,
    },
    ...(input.destination.kind === "bolt11_invoice"
      ? { invoice: input.destination.canonicalValue }
      : {}),
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

async function requesterLocalContractInputs(
  swapType: string,
  sessionId: string
): Promise<Record<string, unknown>> {
  const topology = {
    submarine: {
      effects: [
        { role: "chain_fund", leg_id: "source" },
        { role: "chain_refund", leg_id: "source" },
      ],
      exits: [{ leg_id: "source", path: "refund", package_mode: "presigned" }],
    },
    reverse: {
      effects: [
        { role: "invoice_pay", leg_id: "lightning" },
        { role: "chain_claim", leg_id: "destination" },
      ],
      exits: [
        {
          leg_id: "destination",
          path: "claim",
          package_mode: "wallet_sign",
        },
      ],
    },
    chain: {
      effects: [
        { role: "chain_fund", leg_id: "source" },
        { role: "chain_refund", leg_id: "source" },
        { role: "chain_claim", leg_id: "destination" },
      ],
      exits: [
        { leg_id: "source", path: "refund", package_mode: "presigned" },
        {
          leg_id: "destination",
          path: "claim",
          package_mode: "wallet_sign",
        },
      ],
    },
  }[swapType]
  if (!topology) {
    throw new Error(
      "swp_contract_terms_mismatch: the selected Quote has an unsupported swap type"
    )
  }
  return {
    effect_bindings: topology.effects,
    exit_package_commitments: await Promise.all(
      topology.exits.map(async (exit) => ({
        participant_role: "requester",
        ...exit,
        package_sha256: await digestJson({
          schema: "openagents.bazaar.no-spend-exit-commitment.v1",
          sessionId,
          legId: exit.leg_id,
          path: exit.path,
          packageMode: exit.package_mode,
          executable: false,
        }),
      }))
    ),
  }
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `swp_contract_terms_mismatch: the selected ${label} are malformed`
    )
  }
  return value as Record<string, unknown>
}

function stringMember(value: Record<string, unknown>, name: string): string {
  const member = value[name]
  if (typeof member !== "string" || member.length === 0) {
    throw new Error(
      `swp_contract_terms_mismatch: the selected Quote omits ${name}`
    )
  }
  return member
}

function storedRecordEvent(
  record: StoredImmortalSession["signedRecords"][number]
): Event {
  return JSON.parse(record.rawSignedEvent) as Event
}

function sessionWithDelivery(
  session: StoredImmortalSession,
  signedRecord: StoredSignedRecord,
  delivery: StoredValidatedDelivery
): StoredImmortalSession {
  const hasRecord = session.signedRecords.some(
    (candidate) => candidate.id === signedRecord.id
  )
  const hasDelivery = session.validatedDeliveries.some(
    (candidate) =>
      candidate.eventId === delivery.eventId &&
      candidate.wrapId === delivery.wrapId
  )
  return {
    ...session,
    signedRecords: hasRecord
      ? session.signedRecords
      : [...session.signedRecords, signedRecord],
    validatedDeliveries: hasDelivery
      ? session.validatedDeliveries
      : [...session.validatedDeliveries, delivery],
  }
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

function comparePrivateSnapshotDelivery(
  left: ValidatedPrivateDelivery,
  right: ValidatedPrivateDelivery,
  requesterPubkey: string
): number {
  return (
    left.sessionId.localeCompare(right.sessionId) ||
    privateRecordRank(left.unwrapped.event, requesterPubkey) -
      privateRecordRank(right.unwrapped.event, requesterPubkey) ||
    left.unwrapped.event.created_at - right.unwrapped.event.created_at ||
    left.unwrapped.event.id.localeCompare(right.unwrapped.event.id) ||
    left.unwrapped.wrapId.localeCompare(right.unwrapped.wrapId)
  )
}

function privateRecordRank(event: Event, requesterPubkey: string): number {
  if (event.kind === 39_604) return 0
  if (event.kind === 39_605) return 1
  if (event.kind === 39_606) return 2
  if (event.kind === 39_610) return event.pubkey === requesterPubkey ? 3 : 4
  if (event.kind === 39_607) return 5
  if (event.kind === 39_608) {
    const action = tagValue(event.tags, "action")
    return { request: 6, accepted: 7, effective: 8 }[action] ?? 9
  }
  if (event.kind === 39_609) return 10
  return 11
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
