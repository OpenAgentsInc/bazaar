import {
  FUNDED_REGTEST_NETWORK,
  isLowerHex32,
  type FundedRegtestConfig,
} from "./funded-config"

export type FundedJourneyName = "submarine" | "reverse"

export interface FundedEffectRequest {
  readonly schema: "openagents.immortal.browser-demo-effect.v1"
  readonly network: typeof FUNDED_REGTEST_NETWORK
  readonly journey: FundedJourneyName
  readonly sessionId: string
  readonly orderId: string
  readonly effectId: string
  readonly idempotencyDigest: string
  readonly method: "broadcast_bitcoin_funding" | "pay_lightning_invoice"
  readonly amountSat: number
}

export interface FundedEffectReceipt {
  readonly schema: "openagents.immortal.browser-demo-effect-receipt.v1"
  readonly request: FundedEffectRequest
  readonly externalIdentifier: string
  readonly resultDigest: string
  readonly state: "admitted"
  readonly admittedAt: number
}

export type FundedRailEvidence =
  | {
      readonly rail: "bitcoin"
      readonly lockupTxid: string
      readonly claimTxid: string
    }
  | {
      readonly rail: "lightning"
      readonly paymentHash: string
      readonly state: "paid"
    }

export interface FundedJourney {
  readonly name: FundedJourneyName
  readonly swapType: FundedJourneyName
  readonly sessionId: string
  readonly orderId: string
  readonly providerPubkey: string
  readonly relayUrl: string
  readonly providerStatusClaim: {
    readonly state: string
    readonly verified: false
  }
  readonly requesterVerification: {
    readonly state:
      | "effect_authorized"
      | "effect_admitted"
      | "terminal_rail_evidence_verified"
    readonly engine: "immortal-client"
    readonly independentRailEvidence: readonly FundedRailEvidence[]
  }
  readonly pendingEffect: FundedEffectRequest | null
  readonly effectReceipt: FundedEffectReceipt | null
  readonly presentation: { readonly settledAllowed: boolean }
}

export interface FundedSessionManifest {
  readonly schema: "openagents.immortal.browser-demo-manifest.v1"
  readonly mode: "unsafe_local_funded_regtest_demo"
  readonly warning: string
  readonly network: typeof FUNDED_REGTEST_NETWORK
  readonly allowedOrigin: string
  readonly activeJourney: FundedJourneyName
  readonly requesterPubkey: string
  readonly journeys: Readonly<Partial<Record<FundedJourneyName, FundedJourney>>>
}

export class FundedSessionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FundedSessionError"
  }
}

export function parseFundedSessionManifest(
  value: unknown,
  config: FundedRegtestConfig,
  browserOrigin: string
): FundedSessionManifest {
  rejectCustodyMaterial(value)
  if (browserOrigin !== config.adapter.allowedOrigin) {
    fail("The browser origin differs from the funded adapter allowlist.")
  }
  const document = object(value, "funded session manifest")
  exactKeys(document, [
    "schema",
    "mode",
    "warning",
    "network",
    "allowed_origin",
    "active_journey",
    "requester_pubkey",
    "journeys",
  ])
  equal(
    document.schema,
    "openagents.immortal.browser-demo-manifest.v1",
    "session schema"
  )
  equal(document.mode, "unsafe_local_funded_regtest_demo", "session mode")
  equal(document.network, FUNDED_REGTEST_NETWORK, "session network")
  equal(document.allowed_origin, browserOrigin, "session origin")
  const warning = boundedString(document.warning, "session warning")
  const requesterPubkey = hex32(document.requester_pubkey, "requester key")
  const activeJourney = journeyName(document.active_journey, "active journey")

  const journeyDocument = object(document.journeys, "funded journeys")
  const names = Object.keys(journeyDocument)
  if (
    names.length < 1 ||
    names.length > 2 ||
    names.some((name) => !["submarine", "reverse"].includes(name))
  ) {
    fail("Funded journeys are outside the closed submarine/reverse set.")
  }
  const journeys: Partial<Record<FundedJourneyName, FundedJourney>> = {}
  for (const name of names) {
    const parsedName = name as FundedJourneyName
    journeys[parsedName] = parseJourney(parsedName, journeyDocument[name])
  }
  if (!journeys[activeJourney]) {
    fail("The active funded journey is missing from the manifest.")
  }

  return {
    schema: "openagents.immortal.browser-demo-manifest.v1",
    mode: "unsafe_local_funded_regtest_demo",
    warning,
    network: FUNDED_REGTEST_NETWORK,
    allowedOrigin: browserOrigin,
    activeJourney,
    requesterPubkey,
    journeys,
  }
}

export function parseFundedEffectReceipt(
  value: unknown,
  expected: FundedEffectRequest
): FundedEffectReceipt {
  rejectCustodyMaterial(value)
  const receipt = object(value, "funded effect receipt")
  exactKeys(receipt, [
    "schema",
    "request",
    "external_identifier",
    "result_digest",
    "state",
    "admitted_at",
  ])
  equal(
    receipt.schema,
    "openagents.immortal.browser-demo-effect-receipt.v1",
    "receipt schema"
  )
  const request = parseEffect(receipt.request)
  if (!sameEffect(request, expected)) {
    fail("The funded receipt is not bound to the submitted engine effect.")
  }
  equal(receipt.state, "admitted", "receipt state")
  return {
    schema: "openagents.immortal.browser-demo-effect-receipt.v1",
    request,
    externalIdentifier: hex32(
      receipt.external_identifier,
      "receipt external identifier"
    ),
    resultDigest: hex32(receipt.result_digest, "receipt result digest"),
    state: "admitted",
    admittedAt: positiveInteger(receipt.admitted_at, "receipt admission time"),
  }
}

export function fundedEffectWire(
  effect: FundedEffectRequest
): Record<string, string | number> {
  return {
    schema: effect.schema,
    network: effect.network,
    journey: effect.journey,
    session_id: effect.sessionId,
    order_id: effect.orderId,
    effect_id: effect.effectId,
    idempotency_digest: effect.idempotencyDigest,
    method: effect.method,
    amount_sat: effect.amountSat,
  }
}

function parseJourney(name: FundedJourneyName, value: unknown): FundedJourney {
  const journey = object(value, `${name} journey`)
  exactKeys(journey, [
    "swap_type",
    "session_id",
    "order_id",
    "provider_pubkey",
    "relay_url",
    "provider_status_claim",
    "requester_verification",
    "pending_effect",
    "effect_receipt",
    "presentation",
  ])
  equal(journey.swap_type, name, `${name} swap type`)
  const sessionId = hex32(journey.session_id, `${name} session ID`)
  const orderId = hex32(journey.order_id, `${name} Order ID`)
  const providerPubkey = hex32(journey.provider_pubkey, `${name} provider key`)
  const relayUrl = loopbackWebSocket(
    boundedString(journey.relay_url, `${name} relay URL`)
  )

  const providerClaim = object(
    journey.provider_status_claim,
    `${name} provider claim`
  )
  exactKeys(providerClaim, ["state", "verified"])
  if (providerClaim.verified !== false) {
    fail("Provider Status must remain an attributed, unverified claim.")
  }
  const providerState = boundedString(
    providerClaim.state,
    `${name} provider claim state`
  )

  const verification = object(
    journey.requester_verification,
    `${name} requester verification`
  )
  exactKeys(verification, ["state", "engine", "independent_rail_evidence"])
  equal(verification.engine, "immortal-client", "verification engine")
  const verificationState = verification.state
  if (
    ![
      "effect_authorized",
      "effect_admitted",
      "terminal_rail_evidence_verified",
    ].includes(String(verificationState))
  ) {
    fail("Requester verification has an unsupported state.")
  }
  const evidence = array(
    verification.independent_rail_evidence,
    `${name} rail evidence`
  ).map(parseRailEvidence)

  const pendingEffect =
    journey.pending_effect === null ? null : parseEffect(journey.pending_effect)
  if (pendingEffect)
    bindEffectToJourney(pendingEffect, name, sessionId, orderId)
  const effectReceipt =
    journey.effect_receipt === null
      ? null
      : parseFundedEffectReceipt(
          journey.effect_receipt,
          pendingEffect ?? effectFromReceipt(journey.effect_receipt)
        )
  if (effectReceipt) {
    bindEffectToJourney(effectReceipt.request, name, sessionId, orderId)
  }

  const presentation = object(
    journey.presentation,
    `${name} presentation policy`
  )
  exactKeys(presentation, ["settled_allowed"])
  if (typeof presentation.settled_allowed !== "boolean") {
    fail("Funded presentation policy must be boolean.")
  }
  const settledAllowed = presentation.settled_allowed
  const terminal = verificationState === "terminal_rail_evidence_verified"
  if (settledAllowed !== terminal) {
    fail("Presentation authority differs from requester rail verification.")
  }
  if (terminal) {
    if (
      pendingEffect !== null ||
      !effectReceipt ||
      evidence.length !== 2 ||
      !evidence.some((item) => item.rail === "bitcoin") ||
      !evidence.some((item) => item.rail === "lightning")
    ) {
      fail("Terminal funded presentation lacks both independent rail proofs.")
    }
  } else if (evidence.length !== 0) {
    fail("Pre-terminal funded state cannot expose terminal rail evidence.")
  }

  return {
    name,
    swapType: name,
    sessionId,
    orderId,
    providerPubkey,
    relayUrl,
    providerStatusClaim: { state: providerState, verified: false },
    requesterVerification: {
      state:
        verificationState as FundedJourney["requesterVerification"]["state"],
      engine: "immortal-client",
      independentRailEvidence: evidence,
    },
    pendingEffect,
    effectReceipt,
    presentation: { settledAllowed },
  }
}

function bindEffectToJourney(
  effect: FundedEffectRequest,
  name: FundedJourneyName,
  sessionId: string,
  orderId: string
): void {
  if (
    effect.journey !== name ||
    effect.sessionId !== sessionId ||
    effect.orderId !== orderId
  ) {
    fail("Funded effect coordinates differ from their journey.")
  }
}

function effectFromReceipt(value: unknown): FundedEffectRequest {
  const receipt = object(value, "funded effect receipt")
  return parseEffect(receipt.request)
}

function parseEffect(value: unknown): FundedEffectRequest {
  const effect = object(value, "funded engine effect")
  exactKeys(effect, [
    "schema",
    "network",
    "journey",
    "session_id",
    "order_id",
    "effect_id",
    "idempotency_digest",
    "method",
    "amount_sat",
  ])
  equal(
    effect.schema,
    "openagents.immortal.browser-demo-effect.v1",
    "effect schema"
  )
  equal(effect.network, FUNDED_REGTEST_NETWORK, "effect network")
  const journey = journeyName(effect.journey, "effect journey")
  const method = effect.method
  const expectedMethod =
    journey === "submarine"
      ? "broadcast_bitcoin_funding"
      : "pay_lightning_invoice"
  equal(method, expectedMethod, "effect method")
  const amountSat = positiveInteger(effect.amount_sat, "effect amount")
  if (amountSat > 1_000_000) fail("Effect amount exceeds the funded lab bound.")
  return {
    schema: "openagents.immortal.browser-demo-effect.v1",
    network: FUNDED_REGTEST_NETWORK,
    journey,
    sessionId: hex32(effect.session_id, "effect session ID"),
    orderId: hex32(effect.order_id, "effect Order ID"),
    effectId: hex32(effect.effect_id, "effect ID"),
    idempotencyDigest: hex32(
      effect.idempotency_digest,
      "effect idempotency digest"
    ),
    method: expectedMethod,
    amountSat,
  }
}

function parseRailEvidence(value: unknown): FundedRailEvidence {
  const evidence = object(value, "rail evidence")
  if (evidence.rail === "bitcoin") {
    exactKeys(evidence, ["rail", "lockup_txid", "claim_txid"])
    return {
      rail: "bitcoin",
      lockupTxid: hex32(evidence.lockup_txid, "Bitcoin lockup transaction"),
      claimTxid: hex32(evidence.claim_txid, "Bitcoin claim transaction"),
    }
  }
  if (evidence.rail === "lightning") {
    exactKeys(evidence, ["rail", "payment_hash", "state"])
    equal(evidence.state, "paid", "Lightning terminal state")
    return {
      rail: "lightning",
      paymentHash: hex32(evidence.payment_hash, "Lightning payment hash"),
      state: "paid",
    }
  }
  fail("Requester evidence contains an unsupported rail.")
}

function sameEffect(
  left: FundedEffectRequest,
  right: FundedEffectRequest
): boolean {
  return (
    left.schema === right.schema &&
    left.network === right.network &&
    left.journey === right.journey &&
    left.sessionId === right.sessionId &&
    left.orderId === right.orderId &&
    left.effectId === right.effectId &&
    left.idempotencyDigest === right.idempotencyDigest &&
    left.method === right.method &&
    left.amountSat === right.amountSat
  )
}

function rejectCustodyMaterial(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectCustodyMaterial)
    return
  }
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    const normalized = key.toLowerCase()
    if (
      [
        "private_key",
        "secret_key",
        "wallet_seed",
        "seed_phrase",
        "mnemonic",
        "preimage",
        "macaroon",
        "credential",
        "rpc_password",
        "raw_transaction",
        "transaction_hex",
      ].some((forbidden) => normalized.includes(forbidden))
    ) {
      fail("Funded session response contains custody or node material.")
    }
    rejectCustodyMaterial(item)
  }
}

function loopbackWebSocket(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    fail("Funded relay URL is invalid.")
  }
  const octets = parsed.hostname.split(".")
  if (
    parsed.protocol !== "ws:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !parsed.port ||
    octets.length !== 4 ||
    octets.some(
      (octet) => !/^(0|[1-9][0-9]{0,2})$/.test(octet) || Number(octet) > 255
    ) ||
    Number(octets[0]) !== 127
  ) {
    fail("Funded relay URL must be numeric IPv4 loopback WebSocket.")
  }
  return parsed.toString()
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array.`)
  return value
}

function boundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail(`${label} must be a bounded string.`)
  }
  return value
}

function hex32(value: unknown, label: string): string {
  if (!isLowerHex32(value)) fail(`${label} must be lower hex-32.`)
  return value
}

function positiveInteger(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    fail(`${label} must be a positive safe integer.`)
  }
  return value as number
}

function journeyName(value: unknown, label: string): FundedJourneyName {
  if (value !== "submarine" && value !== "reverse") {
    fail(`${label} must be submarine or reverse.`)
  }
  return value
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail("Funded session response contains missing or unknown members.")
  }
}

function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label} is incompatible.`)
}

function fail(message: string): never {
  throw new FundedSessionError(message)
}
