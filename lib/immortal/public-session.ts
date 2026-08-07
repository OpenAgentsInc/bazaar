import {
  parseJsonRejectingDuplicateMembers,
  verifyEvent,
  type Event,
} from "@openagentsinc/nip-mkt"

import { IMMORTAL_ARTIFACT } from "./config"
import {
  canonicalJson,
  PUBLIC_REGTEST_BROWSER_ABI_VERSION,
  PUBLIC_REGTEST_NETWORK,
  type PublicRegtestConfig,
} from "./public-config"

const CREATE_SCHEMA = "openagents.immortal.public-regtest-session-create.v1"
const RESPONSE_SCHEMA = "openagents.immortal.public-regtest-session-response.v1"
const MANIFEST_SCHEMA = "openagents.immortal.public-regtest-session-manifest.v1"
const DYNAMIC_SUBMISSION_SCHEMA =
  "openagents.immortal.public-regtest-dynamic-submission.v1"
const DYNAMIC_REQUEST_SCHEMA =
  "openagents.immortal.dynamic-public-regtest-request.v1"
const JOURNEY_SCHEMA = "openagents.immortal.public-regtest-journey.v1"
const EFFECT_SCHEMA = "openagents.immortal.public-regtest-effect.v1"
const BROWSER_EFFECT_SCHEMA = "openagents.immortal.browser-demo-effect.v1"
const RECEIPT_SCHEMA = "openagents.immortal.public-regtest-effect-receipt.v1"
const MANIFEST_EVENT_KIND = 27_236
const MAXIMUM_RESPONSE_BYTES = 65_536
const STORAGE_KEY = "openagents.bazaar.public-regtest-session.v1"
const LOWER_HEX_32 = /^[0-9a-f]{64}$/

export interface PublicRegtestCapability {
  readonly schema: "openagents.bazaar.public-regtest-capability.v1"
  readonly gatewayBaseUrl: string
  readonly sandboxSessionId: string
  readonly requesterIdentity: string
  readonly capability: string
  readonly expiresAt: number
  readonly launchSignatureEventId: string
}

export interface PublicRegtestEffect {
  readonly providerPubkey: string
  readonly network: typeof PUBLIC_REGTEST_NETWORK
  readonly sessionId: string
  readonly orderId: string
  readonly effectId: string
  readonly idempotencyDigest: string
  readonly method: "broadcast_bitcoin_funding" | "pay_lightning_invoice"
  readonly amountSat: number
  readonly state: "authorized" | "admitted"
  readonly receipt: PublicRegtestEffectReceipt | null
}

export interface PublicRegtestEffectReceipt {
  readonly sandboxSessionId: string
  readonly providerPubkey: string
  readonly effectId: string
  readonly idempotencyDigest: string
  readonly externalIdentifier: string
  readonly resultDigest: string
  readonly state: "admitted"
  readonly admittedAt: number
}

export interface PublicDynamicRequestView {
  readonly requestId: string
  readonly swapType: "reverse" | "submarine"
  readonly inputAmountSat: number
  readonly maximumTotalFeeSat: number
  readonly destinationKind: "bitcoin_address" | "bolt11_invoice"
  readonly destinationCommitmentSha256: string
  readonly destinationAmountSat: number | null
  readonly paymentHash: string | null
  readonly expiresAt: number
}

export interface PublicRailEvidence {
  readonly rail: "bitcoin" | "lightning"
  readonly reference: string
  readonly state: "admitted" | "verified"
}

export interface PublicRegtestJourney {
  readonly requestId: string
  readonly stage:
    | "accepted"
    | "quotes_verified"
    | "provider_selected"
    | "effect_authorized"
    | "effect_admitted"
    | "completed"
    | "recoverable"
    | "failed"
  readonly quoteProviderPubkeys: readonly string[]
  readonly selectedProviderPubkey: string | null
  readonly unselectedProviderPubkey: string | null
  readonly unselectedReleased: boolean
  readonly providerStatus: string | null
  readonly requesterEvidence: readonly PublicRailEvidence[]
  readonly errorCode: string | null
  readonly updatedAt: number
}

export interface PublicRegtestSessionManifest {
  readonly sandboxSessionId: string
  readonly requesterIdentity: string
  readonly requesterEngineIdentity: string | null
  readonly issuedAt: number
  readonly expiresAt: number
  readonly revoked: boolean
  readonly providers: readonly string[]
  readonly dynamicRequest: PublicDynamicRequestView | null
  readonly journey: PublicRegtestJourney | null
  readonly effects: readonly PublicRegtestEffect[]
  readonly signatureEventId: string
}

export interface PublicSessionStorage {
  readonly load: () => PublicRegtestCapability | null
  readonly save: (capability: PublicRegtestCapability) => void
  readonly clear: () => void
}

export class BrowserPublicSessionStorage implements PublicSessionStorage {
  load(): PublicRegtestCapability | null {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    try {
      return parseStoredCapability(JSON.parse(raw))
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
  }

  save(capability: PublicRegtestCapability): void {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(capability))
  }

  clear(): void {
    window.sessionStorage.removeItem(STORAGE_KEY)
  }
}

export class PublicRegtestGatewayError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    readonly retryAfterSeconds: number | null,
    message = "The public regtest service refused the request."
  ) {
    super(message)
    this.name = "PublicRegtestGatewayError"
  }
}

export class PublicRegtestGatewayClient {
  constructor(
    private readonly config: PublicRegtestConfig,
    private readonly origin: string,
    private readonly storage: PublicSessionStorage,
    private readonly request: typeof fetch = fetch
  ) {
    if (origin !== config.allowedOrigins[0]) {
      throw new PublicRegtestGatewayError(
        "origin_refused",
        false,
        null,
        "The browser origin differs from the signed public-regtest launch."
      )
    }
  }

  restore(requesterIdentity: string): PublicRegtestCapability | null {
    const capability = this.storage.load()
    if (
      !capability ||
      capability.gatewayBaseUrl !== this.config.gateway.baseUrl ||
      capability.launchSignatureEventId !== this.config.signatureEventId ||
      capability.requesterIdentity !== requesterIdentity
    ) {
      this.storage.clear()
      return null
    }
    return capability
  }

  async create(requesterIdentity: string): Promise<{
    readonly capability: PublicRegtestCapability
    readonly manifest: PublicRegtestSessionManifest
  }> {
    lowerHex32(requesterIdentity, "requester identity")
    const response = await this.fetchJson(
      `${this.config.gateway.baseUrl}/v1/public-regtest/sessions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: CREATE_SCHEMA,
          requester_identity: requesterIdentity,
          client_nonce: randomHex32(),
        }),
      }
    )
    const document = object(response, "session response")
    exactKeys(document, ["schema", "capability", "signed_manifest"])
    equal(document.schema, RESPONSE_SCHEMA, "session response schema")
    const capabilityValue = lowerHex32(document.capability, "capability")
    const manifest = parseSignedGatewayManifest(
      document.signed_manifest,
      this.config,
      this.origin,
      requesterIdentity
    )
    const capability: PublicRegtestCapability = {
      schema: "openagents.bazaar.public-regtest-capability.v1",
      gatewayBaseUrl: this.config.gateway.baseUrl,
      sandboxSessionId: manifest.sandboxSessionId,
      requesterIdentity,
      capability: capabilityValue,
      expiresAt: manifest.expiresAt,
      launchSignatureEventId: this.config.signatureEventId,
    }
    this.storage.save(capability)
    return { capability, manifest }
  }

  async refresh(
    capability: PublicRegtestCapability
  ): Promise<PublicRegtestSessionManifest> {
    const value = await this.authorizedFetch(
      capability,
      `/v1/public-regtest/sessions/${capability.sandboxSessionId}`,
      { method: "GET" }
    )
    return parseSignedGatewayManifest(
      value,
      this.config,
      this.origin,
      capability.requesterIdentity
    )
  }

  async submitDynamicRequest(
    capability: PublicRegtestCapability,
    dynamicRequestJson: string
  ): Promise<void> {
    assertEffectAuthorityActive(capability)
    const request = parseJsonRejectingDuplicateMembers(dynamicRequestJson)
    const document = object(request, "dynamic request")
    equal(document.schema, DYNAMIC_REQUEST_SCHEMA, "dynamic request schema")
    await this.authorizedFetch(
      capability,
      `/v1/public-regtest/sessions/${capability.sandboxSessionId}/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: DYNAMIC_SUBMISSION_SCHEMA,
          sandbox_session_id: capability.sandboxSessionId,
          request,
        }),
      }
    )
  }

  async admitEffect(
    capability: PublicRegtestCapability,
    effect: PublicRegtestEffect
  ): Promise<PublicRegtestEffectReceipt> {
    assertEffectAuthorityActive(capability)
    const value = await this.authorizedFetch(
      capability,
      `/v1/public-regtest/sessions/${capability.sandboxSessionId}/effects`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schema: EFFECT_SCHEMA,
          sandbox_session_id: capability.sandboxSessionId,
          provider_pubkey: effect.providerPubkey,
          effect: effectWire(effect),
        }),
      }
    )
    return parseReceipt(value, effect, capability.sandboxSessionId)
  }

  async revoke(capability: PublicRegtestCapability): Promise<void> {
    await this.authorizedFetch(
      capability,
      `/v1/public-regtest/sessions/${capability.sandboxSessionId}`,
      { method: "DELETE" }
    )
    this.storage.clear()
  }

  private authorizedFetch(
    capability: PublicRegtestCapability,
    path: string,
    init: RequestInit
  ): Promise<unknown> {
    return this.fetchJson(`${this.config.gateway.baseUrl}${path}`, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `ImmortalRegtest ${capability.capability}`,
      },
    })
  }

  private async fetchJson(url: string, init: RequestInit): Promise<unknown> {
    const response = await this.request(url, {
      ...init,
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      headers: { Accept: "application/json", ...init.headers },
    })
    const value = await readBoundedJson(response)
    if (!response.ok) {
      const error = object(value, "gateway error")
      throw new PublicRegtestGatewayError(
        boundedString(error.code, "gateway error code"),
        error.retryable === true,
        error.retry_after_seconds === null
          ? null
          : integer(error.retry_after_seconds, "retry delay")
      )
    }
    return value
  }
}

export function parseSignedGatewayManifest(
  value: unknown,
  config: PublicRegtestConfig,
  origin: string,
  requesterIdentity: string,
  now = Math.floor(Date.now() / 1_000)
): PublicRegtestSessionManifest {
  const signed = object(value, "signed session manifest")
  exactKeys(signed, ["manifest", "signature_event"])
  const manifest = object(signed.manifest, "session manifest")
  const event = parseEvent(signed.signature_event)
  if (
    event.kind !== MANIFEST_EVENT_KIND ||
    event.pubkey !== config.gateway.signingPubkey ||
    event.content !== canonicalJson(manifest) ||
    event.created_at > now + 60 ||
    !verifyEvent(event)
  ) {
    fail("The public-regtest session manifest signature is invalid.")
  }
  exactKeys(manifest, [
    "schema",
    "mode",
    "network",
    "origin",
    "sandbox_session_id",
    "requester_identity",
    "requester_engine_identity",
    "issued_at",
    "expires_at",
    "revoked",
    "source_revision",
    "requester_contract_digest",
    "browser_abi_version",
    "providers",
    "quotas",
    "allowed_operations",
    "dynamic_request",
    "journey",
    "effects",
  ])
  equal(manifest.schema, MANIFEST_SCHEMA, "session manifest schema")
  equal(manifest.mode, "public_regtest_capability_v1", "session mode")
  equal(manifest.network, PUBLIC_REGTEST_NETWORK, "session network")
  equal(manifest.origin, origin, "session origin")
  equal(
    manifest.requester_identity,
    requesterIdentity,
    "session requester identity"
  )
  equal(manifest.source_revision, config.immortalRevision, "Immortal revision")
  equal(
    manifest.requester_contract_digest,
    IMMORTAL_ARTIFACT.requesterApiSha256,
    "requester contract digest"
  )
  equal(
    manifest.browser_abi_version,
    PUBLIC_REGTEST_BROWSER_ABI_VERSION,
    "browser ABI"
  )
  const sandboxSessionId = lowerHex32(
    manifest.sandbox_session_id,
    "sandbox session ID"
  )
  const issuedAt = integer(manifest.issued_at, "session issue time")
  const expiresAt = integer(manifest.expires_at, "session expiry time")
  if (expiresAt <= issuedAt || expiresAt - issuedAt > 3_600) {
    fail("The public-regtest session lifetime is invalid.")
  }
  const providers = array(manifest.providers, "session providers").map(
    (provider) => lowerHex32(provider, "session provider")
  )
  const configuredProviders = config.providers
    .map((provider) => provider.pubkey)
    .toSorted()
  if (canonicalJson(providers) !== canonicalJson(configuredProviders)) {
    fail("The session provider set differs from the signed launch.")
  }
  const requesterEngineIdentity =
    manifest.requester_engine_identity === null
      ? null
      : lowerHex32(
          manifest.requester_engine_identity,
          "requester engine identity"
        )
  parseQuotas(manifest.quotas)
  const operations = array(manifest.allowed_operations, "allowed operations")
  if (
    canonicalJson(operations) !==
    canonicalJson([
      "submit_dynamic_request",
      "broadcast_bitcoin_funding",
      "pay_lightning_invoice",
    ])
  ) {
    fail("The session operation inventory changed.")
  }
  const dynamicRequest =
    manifest.dynamic_request === null
      ? null
      : parseDynamicRequestView(manifest.dynamic_request)
  const journey =
    manifest.journey === null ? null : parseJourney(manifest.journey)
  if (
    journey &&
    (!dynamicRequest || journey.requestId !== dynamicRequest.requestId)
  ) {
    fail("The public journey is not bound to its dynamic request.")
  }
  const effects = array(manifest.effects, "session effects").map((effect) =>
    parseEffect(effect, sandboxSessionId)
  )
  if (journey) validateJourney(journey, providers, effects)
  const expectedTags = [
    ["d", sandboxSessionId],
    ["network", PUBLIC_REGTEST_NETWORK],
  ]
  if (canonicalJson(event.tags) !== canonicalJson(expectedTags)) {
    fail("The signed session tags changed.")
  }
  return {
    sandboxSessionId,
    requesterIdentity,
    requesterEngineIdentity,
    issuedAt,
    expiresAt,
    revoked: boolean(manifest.revoked, "revocation state"),
    providers,
    dynamicRequest,
    journey,
    effects,
    signatureEventId: event.id,
  }
}

function parseDynamicRequestView(value: unknown): PublicDynamicRequestView {
  const view = object(value, "dynamic request view")
  exactKeys(view, [
    "schema",
    "request_id",
    "network",
    "swap_type",
    "input_amount_sat",
    "maximum_total_fee_sat",
    "destination_kind",
    "destination_commitment_sha256",
    "destination_amount_sat",
    "payment_hash",
    "expires_at",
  ])
  equal(view.schema, DYNAMIC_REQUEST_SCHEMA, "dynamic request schema")
  equal(view.network, PUBLIC_REGTEST_NETWORK, "dynamic request network")
  const swapType = enumeration(
    view.swap_type,
    ["reverse", "submarine"] as const,
    "swap type"
  )
  const destinationKind = enumeration(
    view.destination_kind,
    ["bitcoin_address", "bolt11_invoice"] as const,
    "destination kind"
  )
  if ((swapType === "reverse") !== (destinationKind === "bitcoin_address")) {
    fail("The redacted destination kind differs from the swap type.")
  }
  return {
    requestId: lowerHex32(view.request_id, "dynamic request ID"),
    swapType,
    inputAmountSat: boundedInteger(view.input_amount_sat, 10_000, 1_000_000),
    maximumTotalFeeSat: boundedInteger(view.maximum_total_fee_sat, 1, 50_000),
    destinationKind,
    destinationCommitmentSha256: lowerHex32(
      view.destination_commitment_sha256,
      "destination commitment"
    ),
    destinationAmountSat:
      view.destination_amount_sat === null
        ? null
        : boundedInteger(view.destination_amount_sat, 1, 1_000_000),
    paymentHash:
      view.payment_hash === null
        ? null
        : lowerHex32(view.payment_hash, "payment hash"),
    expiresAt: integer(view.expires_at, "dynamic request expiry"),
  }
}

function parseJourney(value: unknown): PublicRegtestJourney {
  const journey = object(value, "public journey")
  exactKeys(journey, [
    "schema",
    "request_id",
    "stage",
    "quote_provider_pubkeys",
    "selected_provider_pubkey",
    "unselected_provider_pubkey",
    "unselected_released",
    "provider_status",
    "requester_evidence",
    "error_code",
    "updated_at",
  ])
  equal(journey.schema, JOURNEY_SCHEMA, "journey schema")
  return {
    requestId: lowerHex32(journey.request_id, "journey request ID"),
    stage: enumeration(
      journey.stage,
      [
        "accepted",
        "quotes_verified",
        "provider_selected",
        "effect_authorized",
        "effect_admitted",
        "completed",
        "recoverable",
        "failed",
      ] as const,
      "journey stage"
    ),
    quoteProviderPubkeys: array(
      journey.quote_provider_pubkeys,
      "Quote providers"
    ).map((provider) => lowerHex32(provider, "Quote provider")),
    selectedProviderPubkey: nullableHex(
      journey.selected_provider_pubkey,
      "selected provider"
    ),
    unselectedProviderPubkey: nullableHex(
      journey.unselected_provider_pubkey,
      "unselected provider"
    ),
    unselectedReleased: boolean(
      journey.unselected_released,
      "unselected release"
    ),
    providerStatus: nullableString(journey.provider_status, "provider status"),
    requesterEvidence: array(
      journey.requester_evidence,
      "requester evidence"
    ).map(parseRailEvidence),
    errorCode: nullableString(journey.error_code, "journey error code"),
    updatedAt: integer(journey.updated_at, "journey update time"),
  }
}

function parseRailEvidence(value: unknown): PublicRailEvidence {
  const evidence = object(value, "rail evidence")
  exactKeys(evidence, ["rail", "reference", "state"])
  return {
    rail: enumeration(
      evidence.rail,
      ["bitcoin", "lightning"] as const,
      "evidence rail"
    ),
    reference: lowerHex32(evidence.reference, "evidence reference"),
    state: enumeration(
      evidence.state,
      ["admitted", "verified"] as const,
      "evidence state"
    ),
  }
}

function parseEffect(
  value: unknown,
  sandboxSessionId: string
): PublicRegtestEffect {
  const effect = object(value, "manifest effect")
  exactKeys(effect, [
    "provider_pubkey",
    "network",
    "session_id",
    "order_id",
    "effect_id",
    "idempotency_digest",
    "method",
    "amount_sat",
    "state",
    "receipt",
  ])
  equal(effect.network, PUBLIC_REGTEST_NETWORK, "effect network")
  const parsed: PublicRegtestEffect = {
    providerPubkey: lowerHex32(effect.provider_pubkey, "effect provider"),
    network: PUBLIC_REGTEST_NETWORK,
    sessionId: lowerHex32(effect.session_id, "engine session ID"),
    orderId: lowerHex32(effect.order_id, "Order ID"),
    effectId: lowerHex32(effect.effect_id, "effect ID"),
    idempotencyDigest: lowerHex32(
      effect.idempotency_digest,
      "idempotency digest"
    ),
    method: enumeration(
      effect.method,
      ["broadcast_bitcoin_funding", "pay_lightning_invoice"] as const,
      "effect method"
    ),
    amountSat: boundedInteger(effect.amount_sat, 1, 1_000_000),
    state: enumeration(
      effect.state,
      ["authorized", "admitted"] as const,
      "effect state"
    ),
    receipt: null,
  }
  if (
    (parsed.state === "authorized" && effect.receipt !== null) ||
    (parsed.state === "admitted" && effect.receipt === null)
  ) {
    fail("The effect state and receipt disagree.")
  }
  return {
    ...parsed,
    receipt:
      effect.receipt === null
        ? null
        : parseReceipt(effect.receipt, parsed, sandboxSessionId),
  }
}

function validateJourney(
  journey: PublicRegtestJourney,
  providers: readonly string[],
  effects: readonly PublicRegtestEffect[]
): void {
  const quoteProviders = new Set(journey.quoteProviderPubkeys)
  if (
    quoteProviders.size !== journey.quoteProviderPubkeys.length ||
    journey.quoteProviderPubkeys.some(
      (provider) => !providers.includes(provider)
    )
  ) {
    fail("The journey Quote provider set is invalid.")
  }
  if (
    journey.selectedProviderPubkey &&
    !quoteProviders.has(journey.selectedProviderPubkey)
  ) {
    fail("The selected provider did not author a verified Quote.")
  }
  if (
    journey.unselectedProviderPubkey &&
    (!quoteProviders.has(journey.unselectedProviderPubkey) ||
      journey.unselectedProviderPubkey === journey.selectedProviderPubkey)
  ) {
    fail("The unselected provider binding is invalid.")
  }
  if (
    effects.some(
      (effect) => effect.providerPubkey !== journey.selectedProviderPubkey
    )
  ) {
    fail("An effect is not bound to the selected provider.")
  }
  const rails = journey.requesterEvidence.map(({ rail }) => rail)
  if (new Set(rails).size !== rails.length) {
    fail("Requester rail evidence is duplicated.")
  }
  if (
    journey.stage === "completed" &&
    (!journey.unselectedReleased ||
      !journey.selectedProviderPubkey ||
      !rails.includes("bitcoin") ||
      !rails.includes("lightning") ||
      journey.requesterEvidence.some(({ state }) => state !== "verified"))
  ) {
    fail("Terminal requester evidence is incomplete.")
  }
}

function assertEffectAuthorityActive(
  capability: PublicRegtestCapability,
  now = Math.floor(Date.now() / 1_000)
): void {
  if (capability.expiresAt <= now) {
    throw new PublicRegtestGatewayError(
      "session_expired",
      false,
      null,
      "This public regtest capability has expired."
    )
  }
}

function parseReceipt(
  value: unknown,
  effect: PublicRegtestEffect,
  sandboxSessionId: string
): PublicRegtestEffectReceipt {
  const receipt = object(value, "effect receipt")
  exactKeys(receipt, [
    "schema",
    "sandbox_session_id",
    "provider_pubkey",
    "effect_id",
    "idempotency_digest",
    "external_identifier",
    "result_digest",
    "state",
    "admitted_at",
  ])
  equal(receipt.schema, RECEIPT_SCHEMA, "receipt schema")
  equal(receipt.sandbox_session_id, sandboxSessionId, "receipt sandbox session")
  equal(receipt.provider_pubkey, effect.providerPubkey, "receipt provider")
  equal(receipt.effect_id, effect.effectId, "receipt effect ID")
  equal(receipt.idempotency_digest, effect.idempotencyDigest, "receipt digest")
  equal(receipt.state, "admitted", "receipt state")
  return {
    sandboxSessionId,
    providerPubkey: effect.providerPubkey,
    effectId: effect.effectId,
    idempotencyDigest: effect.idempotencyDigest,
    externalIdentifier: lowerHex32(
      receipt.external_identifier,
      "external identifier"
    ),
    resultDigest: lowerHex32(receipt.result_digest, "result digest"),
    state: "admitted",
    admittedAt: integer(receipt.admitted_at, "admission time"),
  }
}

function effectWire(effect: PublicRegtestEffect): Record<string, unknown> {
  return {
    schema: BROWSER_EFFECT_SCHEMA,
    network: effect.network,
    journey:
      effect.method === "pay_lightning_invoice" ? "reverse" : "submarine",
    session_id: effect.sessionId,
    order_id: effect.orderId,
    effect_id: effect.effectId,
    idempotency_digest: effect.idempotencyDigest,
    method: effect.method,
    amount_sat: effect.amountSat,
  }
}

function parseQuotas(value: unknown): void {
  const quotas = object(value, "session quotas")
  exactKeys(quotas, [
    "maximum_amount_sat",
    "maximum_effects",
    "maximum_concurrent_effects",
    "maximum_requests",
  ])
  equal(quotas.maximum_amount_sat, 1_000_000, "maximum amount")
  equal(quotas.maximum_effects, 2, "maximum effects")
  equal(quotas.maximum_concurrent_effects, 1, "concurrent effects")
  equal(quotas.maximum_requests, 64, "maximum requests")
}

function parseStoredCapability(value: unknown): PublicRegtestCapability {
  const stored = object(value, "stored public capability")
  exactKeys(stored, [
    "schema",
    "gatewayBaseUrl",
    "sandboxSessionId",
    "requesterIdentity",
    "capability",
    "expiresAt",
    "launchSignatureEventId",
  ])
  equal(
    stored.schema,
    "openagents.bazaar.public-regtest-capability.v1",
    "stored capability schema"
  )
  return {
    schema: "openagents.bazaar.public-regtest-capability.v1",
    gatewayBaseUrl: boundedString(stored.gatewayBaseUrl, "gateway URL"),
    sandboxSessionId: lowerHex32(stored.sandboxSessionId, "sandbox session"),
    requesterIdentity: lowerHex32(
      stored.requesterIdentity,
      "requester identity"
    ),
    capability: lowerHex32(stored.capability, "capability"),
    expiresAt: integer(stored.expiresAt, "capability expiry"),
    launchSignatureEventId: lowerHex32(
      stored.launchSignatureEventId,
      "launch signature event"
    ),
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > MAXIMUM_RESPONSE_BYTES) {
    fail("The gateway response is empty or exceeds its byte bound.")
  }
  return parseJsonRejectingDuplicateMembers(
    new TextDecoder("utf-8", {
      fatal: true,
    }).decode(bytes)
  )
}

function parseEvent(value: unknown): Event {
  const event = object(value, "manifest signature event")
  exactKeys(event, [
    "id",
    "pubkey",
    "created_at",
    "kind",
    "tags",
    "content",
    "sig",
  ])
  return event as unknown as Event
}

function randomHex32(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array.`)
  return value
}

function exactKeys(
  value: Record<string, unknown>,
  keys: readonly string[]
): void {
  const actual = Object.keys(value).toSorted()
  const expected = [...keys].toSorted()
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    fail("A public-regtest object has missing or unknown members.")
  }
}

function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`The ${label} changed.`)
}

function lowerHex32(value: unknown, label: string): string {
  if (typeof value !== "string" || !LOWER_HEX_32.test(value)) {
    fail(`The ${label} is not lowercase hex-32.`)
  }
  return value
}

function boundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail(`The ${label} is invalid.`)
  }
  return value
}

function nullableString(value: unknown, label: string): string | null {
  return value === null ? null : boundedString(value, label)
}

function nullableHex(value: unknown, label: string): string | null {
  return value === null ? null : lowerHex32(value, label)
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(`The ${label} is invalid.`)
  }
  return value as number
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number
): number {
  const parsed = integer(value, "bounded integer")
  if (parsed < minimum || parsed > maximum) fail("A numeric bound changed.")
  return parsed
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") fail(`The ${label} is invalid.`)
  return value
}

function enumeration<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  label: string
): Values[number] {
  if (typeof value !== "string" || !values.includes(value)) {
    fail(`The ${label} is unsupported.`)
  }
  return value as Values[number]
}

function fail(message: string): never {
  throw new PublicRegtestGatewayError(
    "public_session_incompatible",
    false,
    null,
    message
  )
}
