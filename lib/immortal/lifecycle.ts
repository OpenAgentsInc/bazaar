import type { Event } from "@openagentsinc/nip-mkt"

import type { StoredImmortalSession } from "./store"

export const DEMO_LIFECYCLE_STAGES = [
  {
    id: "providers_discovered",
    label: "Providers discovered",
  },
  {
    id: "encrypted_rfq_delivered",
    label: "Encrypted RFQ delivered",
  },
  {
    id: "signed_quote_selected",
    label: "Signed Quote selected",
  },
  {
    id: "reservation_recorded",
    label: "Reservation recorded",
  },
  {
    id: "contracts_signed",
    label: "Contracts signed by both parties",
  },
  {
    id: "verification_passed",
    label: "Verification passed",
  },
  {
    id: "cancellation_effective",
    label: "Cancellation accepted and effective",
  },
  {
    id: "zero_loss_close_verified",
    label: "Zero-loss Close verified",
  },
] as const

export type DemoLifecycleStage = (typeof DEMO_LIFECYCLE_STAGES)[number]["id"]

export type DemoLifecycleState =
  | {
      readonly state: "idle"
      readonly detail: string
      readonly completedStages: readonly DemoLifecycleStage[]
    }
  | {
      readonly state: "running"
      readonly sessionId: string
      readonly providerRole: "provider-a" | "provider-b"
      readonly activeStage: DemoLifecycleStage
      readonly completedStages: readonly DemoLifecycleStage[]
      readonly detail: string
    }
  | {
      readonly state: "complete"
      readonly sessionId: string
      readonly providerRole: "provider-a" | "provider-b"
      readonly completedStages: readonly DemoLifecycleStage[]
      readonly detail: "Demo complete — reservation released, 0 sats moved."
    }
  | {
      readonly state: "error"
      readonly sessionId: string | null
      readonly providerRole: "provider-a" | "provider-b" | null
      readonly activeStage: DemoLifecycleStage | null
      readonly completedStages: readonly DemoLifecycleStage[]
      readonly code: string
      readonly detail: string
      readonly recoverable: boolean
    }

export const IDLE_LIFECYCLE: DemoLifecycleState = {
  state: "idle",
  detail: "A real no-spend session will appear here after Create Swap.",
  completedStages: [],
}

const MKT_RFQ_KIND = 39_604
const MKT_QUOTE_KIND = 39_605
const MKT_ORDER_KIND = 39_606
const MKT_STATUS_KIND = 39_607
const MKT_CANCEL_KIND = 39_608
const MKT_CLOSE_KIND = 39_609
const MKT_SWAP_CONTRACT_KIND = 39_610

interface RequesterEngineView {
  readonly verification?: {
    readonly state?: string
    readonly funding_authorized?: boolean
    readonly status_gaps?: readonly string[]
    readonly status_forks?: readonly string[]
    readonly invalid_status_claims?: readonly string[]
  }
  readonly terminal?: {
    readonly claimed_state?: string
    readonly canonical_close_id?: string | null
    readonly loss_accounting_complete?: boolean
    readonly local_effects_verified?: boolean
    readonly watch_terminal?: boolean
  }
}

export interface DemoSessionRecords {
  readonly rfq: Event
  readonly quote: Event
  readonly order: Event | null
  readonly requesterContract: Event | null
  readonly providerContract: Event | null
  readonly providerStatus: Event | null
  readonly cancelRequest: Event | null
  readonly cancelAccepted: Event | null
  readonly cancelEffective: Event | null
  readonly close: Event | null
}

export function demoSessionRecords(
  session: StoredImmortalSession
): DemoSessionRecords {
  const events = session.signedRecords.map(parseStoredEvent)
  const rfq = exactlyOne(
    events.filter(
      (event) =>
        event.kind === MKT_RFQ_KIND && event.pubkey === session.requesterPubkey
    ),
    "requester RFQ"
  )
  const quote = exactlyOne(
    events.filter(
      (event) =>
        event.kind === MKT_QUOTE_KIND && event.pubkey === session.providerPubkey
    ),
    "provider Quote"
  )
  return {
    rfq,
    quote,
    order: findByAuthor(events, MKT_ORDER_KIND, session.requesterPubkey),
    requesterContract: findByAuthor(
      events,
      MKT_SWAP_CONTRACT_KIND,
      session.requesterPubkey
    ),
    providerContract: findByAuthor(
      events,
      MKT_SWAP_CONTRACT_KIND,
      session.providerPubkey
    ),
    providerStatus: findByAuthor(
      events,
      MKT_STATUS_KIND,
      session.providerPubkey
    ),
    cancelRequest: findByAction(events, session.requesterPubkey, "request"),
    cancelAccepted: findByAction(events, session.providerPubkey, "accepted"),
    cancelEffective: findByAction(events, session.providerPubkey, "effective"),
    close: findByAuthor(events, MKT_CLOSE_KIND, session.providerPubkey),
  }
}

export function projectDemoLifecycle(
  session: StoredImmortalSession
): DemoLifecycleState {
  const records = demoSessionRecords(session)
  const completed: DemoLifecycleStage[] = [
    "providers_discovered",
    "encrypted_rfq_delivered",
    "signed_quote_selected",
  ]

  if (records.order) completed.push("reservation_recorded")
  if (records.requesterContract && records.providerContract) {
    completed.push("contracts_signed")
  }
  if (
    records.providerStatus &&
    contractVerificationPassed(session.engineView)
  ) {
    completed.push("verification_passed")
  }
  if (records.cancelAccepted && records.cancelEffective) {
    completed.push("cancellation_effective")
  }
  if (records.close) {
    assertExactNoSpendClose(records.close, session)
    completed.push("zero_loss_close_verified")
  }

  const providerRole = session.selectedProviderRoute.role
  if (completed.includes("zero_loss_close_verified")) {
    return {
      state: "complete",
      sessionId: session.sessionId,
      providerRole,
      completedStages: completed,
      detail: "Demo complete — reservation released, 0 sats moved.",
    }
  }

  const activeStage = DEMO_LIFECYCLE_STAGES.find(
    (stage) => !completed.includes(stage.id)
  )?.id
  if (!activeStage) {
    throw lifecycleError(
      "session_projection_invalid",
      "The durable session has no terminal stage to run."
    )
  }
  return {
    state: "running",
    sessionId: session.sessionId,
    providerRole,
    activeStage,
    completedStages: completed,
    detail: runningDetail(activeStage),
  }
}

export function isStartedDemoSession(session: StoredImmortalSession): boolean {
  return session.signedRecords.some(
    (record) =>
      record.kind === MKT_ORDER_KIND &&
      record.pubkey === session.requesterPubkey
  )
}

export function parseMktProfile(event: Event): Record<string, unknown> {
  let value: unknown
  try {
    value = JSON.parse(event.content)
  } catch {
    throw lifecycleError(
      "signed_record_invalid",
      "A durable signed record contains malformed JSON."
    )
  }
  const root = object(value)
  const profile = root ? object(root.mkt_swp) : null
  if (!profile) {
    throw lifecycleError(
      "signed_record_invalid",
      "A durable signed record has no MKT-SWP profile."
    )
  }
  return profile
}

function contractVerificationPassed(value: unknown): boolean {
  const view = (object(value) ?? {}) as RequesterEngineView
  const verification = view.verification
  return Boolean(
    verification &&
    ["contract_terms_verified", "terminal_verified"].includes(
      verification.state ?? ""
    ) &&
    verification.funding_authorized === false &&
    verification.status_gaps?.length === 0 &&
    verification.status_forks?.length === 0 &&
    verification.invalid_status_claims?.length === 0
  )
}

function assertExactNoSpendClose(
  event: Event,
  session: StoredImmortalSession
): void {
  const profile = parseMktProfile(event)
  const loss = object(profile.loss_accounting)
  const view = (object(session.engineView) ?? {}) as RequesterEngineView
  const terminal = view.terminal
  const exactZeroMembers = [
    "input_committed",
    "input_recovered",
    "output_received",
    "provider_fee_paid",
    "miner_fee_paid",
    "lightning_routing_fee_paid",
    "guarantee_recovery_received",
    "principal_unresolved",
  ]
  if (
    profile.final_state !== "cancelled" ||
    profile.external_spend_effects !== 0 ||
    profile.loss_classification !== "none" ||
    !loss ||
    exactZeroMembers.some((name) => loss[name] !== "0") ||
    typeof loss.reservation_released !== "string" ||
    !/^(0|[1-9][0-9]*)$/.test(loss.reservation_released) ||
    terminal?.claimed_state !== "cancelled" ||
    terminal.canonical_close_id !== event.id ||
    terminal.loss_accounting_complete !== true ||
    terminal.local_effects_verified !== false ||
    terminal.watch_terminal !== false ||
    session.effects.length !== 0 ||
    !contractVerificationPassed(session.engineView)
  ) {
    throw lifecycleError(
      "zero_loss_close_invalid",
      "The provider Close did not prove an engine-verified zero-loss cancellation."
    )
  }
}

function parseStoredEvent(
  record: StoredImmortalSession["signedRecords"][number]
): Event {
  let value: unknown
  try {
    value = JSON.parse(record.rawSignedEvent)
  } catch {
    throw lifecycleError(
      "signed_record_invalid",
      "A durable signed record cannot be decoded."
    )
  }
  if (!object(value) || (value as Event).id !== record.id) {
    throw lifecycleError(
      "signed_record_invalid",
      "A durable signed record no longer matches its event ID."
    )
  }
  return value as Event
}

function exactlyOne(events: readonly Event[], label: string): Event {
  if (events.length !== 1 || !events[0]) {
    throw lifecycleError(
      "session_projection_invalid",
      `The selected session requires exactly one ${label}.`
    )
  }
  return events[0]
}

function findByAuthor(
  events: readonly Event[],
  kind: number,
  pubkey: string
): Event | null {
  const matches = events.filter(
    (event) => event.kind === kind && event.pubkey === pubkey
  )
  if (matches.length > 1) {
    throw lifecycleError(
      "session_projection_invalid",
      "The selected session contains a duplicate protocol record."
    )
  }
  return matches[0] ?? null
}

function findByAction(
  events: readonly Event[],
  pubkey: string,
  action: string
): Event | null {
  const matches = events.filter(
    (event) =>
      event.kind === MKT_CANCEL_KIND &&
      event.pubkey === pubkey &&
      tagValue(event, "action") === action
  )
  if (matches.length > 1) {
    throw lifecycleError(
      "session_projection_invalid",
      "The selected session contains a duplicate cancellation record."
    )
  }
  return matches[0] ?? null
}

function tagValue(event: Event, name: string): string | null {
  const matches = event.tags.filter(
    (tag) => tag.length === 2 && tag[0] === name
  )
  return matches.length === 1 ? (matches[0]?.[1] ?? null) : null
}

function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function lifecycleError(code: string, message: string): Error {
  return new Error(`${code}: ${message}`)
}

function runningDetail(stage: DemoLifecycleStage): string {
  return {
    providers_discovered: "Waiting for two signed provider Offerings…",
    encrypted_rfq_delivered: "Delivering the encrypted RFQ…",
    signed_quote_selected: "Verifying and selecting a signed Quote…",
    reservation_recorded: "Recording the selected reservation…",
    contracts_signed: "Waiting for the provider countersignature…",
    verification_passed: "Verifying the bilateral contract and Status…",
    cancellation_effective: "Requesting mutual no-spend cancellation…",
    zero_loss_close_verified: "Verifying the provider's zero-loss Close…",
  }[stage]
}
