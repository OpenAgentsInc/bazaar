import {
  parseJsonRejectingDuplicateMembers,
  verifyEvent,
  type Event,
} from "@openagentsinc/nip-mkt"

import { IMMORTAL_ARTIFACT, type ImmortalContractIdentity } from "./config"

export const PUBLIC_REGTEST_NETWORK =
  "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4" as const
export const PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA =
  "openagents.immortal.public-regtest-gateway-contract.v1" as const
export const PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256 =
  "3f54404a874ecc99caaadf929d85ce0a372d9f3cb978656b9fe5be4c6b88ca93" as const
export const PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256 =
  "d8bff6d86bf04f5b050e5ec7f646f5482932f9f66824121e7c6888642d787431" as const
export const PUBLIC_REGTEST_RELAY_CONTRACT_SHA256 =
  "2dc403d00574be2c531f88468a6cadbca1fd9b3192259a5ecbd03833d55ae1cc" as const
export const PUBLIC_REGTEST_BROWSER_ABI_VERSION = 1 as const
export const PUBLIC_REGTEST_MANIFEST_EVENT_KIND = 27_237 as const
export const MAXIMUM_PUBLIC_MANIFEST_BYTES = 65_536
export const MAXIMUM_PUBLIC_MANIFEST_LIFETIME_SECONDS = 86_400
export const MAXIMUM_PUBLIC_MANIFEST_REFRESH_SECONDS = 300

const LOWER_HEX_20 = /^[0-9a-f]{40}$/
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const DNS_HOST =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

export interface PublicRegtestTrust {
  readonly signingPubkey: string
  readonly bazaarRevision: string
  readonly immortalRevision: string
  readonly allowedOrigin: string
  readonly allowedHosts: ReadonlySet<string>
}

export interface PublicRegtestRelay {
  readonly websocketUrl: string
  readonly contractSha256: typeof PUBLIC_REGTEST_RELAY_CONTRACT_SHA256
  readonly contractIdentity: ImmortalContractIdentity
}

export interface PublicRegtestProvider {
  readonly role: "provider-a" | "provider-b"
  readonly pubkey: string
  readonly offeringCoordinate: string
}

export interface PublicRegtestConfig {
  readonly schema: "openagents.bazaar.public-regtest-config.v1"
  readonly mode: "public_regtest"
  readonly network: typeof PUBLIC_REGTEST_NETWORK
  readonly issuedAt: number
  readonly expiresAt: number
  readonly refreshAfterSeconds: number
  readonly serviceState: "live"
  readonly bazaarRevision: string
  readonly immortalRevision: string
  readonly engine: {
    readonly sourceRevision: typeof IMMORTAL_ARTIFACT.sourceRevision
    readonly requesterApiSha256: typeof IMMORTAL_ARTIFACT.requesterApiSha256
    readonly wasmSha256: typeof IMMORTAL_ARTIFACT.wasmSha256
    readonly wasmBytes: typeof IMMORTAL_ARTIFACT.wasmBytes
    readonly browserAbiVersion: typeof PUBLIC_REGTEST_BROWSER_ABI_VERSION
  }
  readonly gateway: {
    readonly baseUrl: string
    readonly signingPubkey: string
    readonly contractSchema: typeof PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA
    readonly contractSha256: typeof PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256
    readonly serviceContractSha256: typeof PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256
  }
  readonly relays: readonly PublicRegtestRelay[]
  readonly providers: readonly [PublicRegtestProvider, PublicRegtestProvider]
  readonly allowedOrigins: readonly [string]
  readonly bounds: {
    readonly maximumActiveSessions: number
    readonly maximumSessionAmountSat: number
    readonly maximumSessionLifetimeSeconds: number
  }
  readonly signerPubkey: string
  readonly signatureEventId: string
}

export type PublicRegtestConfigResult =
  | {
      readonly state: "ready"
      readonly config: PublicRegtestConfig
      readonly source: "environment" | "https" | "last_known_good"
      readonly refreshAt: number
    }
  | {
      readonly state: "unavailable" | "incompatible" | "expired" | "maintenance"
      readonly code: string
      readonly detail: string
    }

export class PublicRegtestConfigError extends Error {
  constructor(
    readonly code:
      | "public_manifest_invalid"
      | "public_manifest_unauthenticated"
      | "public_manifest_expired"
      | "public_manifest_incompatible"
      | "public_manifest_maintenance",
    message: string
  ) {
    super(message)
    this.name = "PublicRegtestConfigError"
  }
}

export function parseSignedPublicRegtestManifest(
  raw: string,
  trust: PublicRegtestTrust,
  now = Math.floor(Date.now() / 1_000)
): PublicRegtestConfig {
  if (
    new TextEncoder().encode(raw).byteLength > MAXIMUM_PUBLIC_MANIFEST_BYTES
  ) {
    fail(
      "public_manifest_invalid",
      "The public manifest exceeds its byte bound."
    )
  }
  let parsed: unknown
  try {
    parsed = parseJsonRejectingDuplicateMembers(raw)
  } catch {
    fail(
      "public_manifest_invalid",
      "The public manifest is malformed or has duplicate members."
    )
  }
  const envelope = object(parsed, "public manifest envelope")
  exactKeys(envelope, ["schema", "manifest", "signature_event"])
  equal(
    envelope.schema,
    "openagents.bazaar.public-regtest-envelope.v1",
    "public envelope schema"
  )
  const event = parseEvent(envelope.signature_event)
  if (
    event.kind !== PUBLIC_REGTEST_MANIFEST_EVENT_KIND ||
    event.pubkey !== trust.signingPubkey ||
    event.content !== canonicalJson(envelope.manifest) ||
    !verifyEvent(event)
  ) {
    fail(
      "public_manifest_unauthenticated",
      "The public manifest signature or signer is invalid."
    )
  }
  const manifest = parseManifest(envelope.manifest, trust, now)
  if (event.created_at !== manifest.issuedAt) {
    fail(
      "public_manifest_unauthenticated",
      "The manifest signature timestamp is not bound to the launch."
    )
  }
  const expectedTags = [
    ["d", "bazaar-public-regtest"],
    ["expiration", String(manifest.expiresAt)],
    ["network", PUBLIC_REGTEST_NETWORK],
    ["origin", trust.allowedOrigin],
  ]
  if (canonicalJson(event.tags) !== canonicalJson(expectedTags)) {
    fail(
      "public_manifest_unauthenticated",
      "The public manifest signature tags changed."
    )
  }
  return { ...manifest, signerPubkey: event.pubkey, signatureEventId: event.id }
}

function parseManifest(
  value: unknown,
  trust: PublicRegtestTrust,
  now: number
): Omit<PublicRegtestConfig, "signerPubkey" | "signatureEventId"> {
  const document = object(value, "public manifest")
  exactKeys(document, [
    "schema",
    "mode",
    "network",
    "issued_at",
    "expires_at",
    "refresh_after_seconds",
    "service_state",
    "bazaar_revision",
    "immortal_revision",
    "engine",
    "gateway",
    "relays",
    "providers",
    "allowed_origins",
    "bounds",
  ])
  equal(
    document.schema,
    "openagents.bazaar.public-regtest-launch.v1",
    "launch schema"
  )
  equal(document.mode, "public_regtest", "launch mode")
  equal(document.network, PUBLIC_REGTEST_NETWORK, "network")
  const issuedAt = integer(document.issued_at, "issue time")
  const expiresAt = integer(document.expires_at, "expiry time")
  const refreshAfterSeconds = integer(
    document.refresh_after_seconds,
    "refresh interval"
  )
  if (
    issuedAt > now + 60 ||
    expiresAt <= issuedAt ||
    expiresAt - issuedAt > MAXIMUM_PUBLIC_MANIFEST_LIFETIME_SECONDS
  ) {
    fail("public_manifest_invalid", "The public manifest lifetime is invalid.")
  }
  if (expiresAt <= now)
    fail("public_manifest_expired", "The signed public manifest expired.")
  if (
    refreshAfterSeconds < 10 ||
    refreshAfterSeconds > MAXIMUM_PUBLIC_MANIFEST_REFRESH_SECONDS
  ) {
    fail(
      "public_manifest_invalid",
      "The public manifest refresh interval is invalid."
    )
  }
  if (document.service_state === "maintenance") {
    fail(
      "public_manifest_maintenance",
      "The public regtest service is in maintenance mode."
    )
  }
  equal(document.service_state, "live", "service state")
  equal(document.bazaar_revision, trust.bazaarRevision, "Bazaar revision")
  equal(document.immortal_revision, trust.immortalRevision, "Immortal revision")

  const engine = object(document.engine, "engine")
  exactKeys(engine, [
    "source_revision",
    "requester_api_sha256",
    "wasm_sha256",
    "wasm_bytes",
    "browser_abi_version",
  ])
  equal(
    engine.source_revision,
    IMMORTAL_ARTIFACT.sourceRevision,
    "engine revision"
  )
  equal(
    engine.requester_api_sha256,
    IMMORTAL_ARTIFACT.requesterApiSha256,
    "requester API digest"
  )
  equal(engine.wasm_sha256, IMMORTAL_ARTIFACT.wasmSha256, "WASM digest")
  equal(engine.wasm_bytes, IMMORTAL_ARTIFACT.wasmBytes, "WASM byte length")
  equal(
    engine.browser_abi_version,
    PUBLIC_REGTEST_BROWSER_ABI_VERSION,
    "browser ABI"
  )

  const gateway = object(document.gateway, "gateway")
  exactKeys(gateway, [
    "base_url",
    "signing_pubkey",
    "contract_schema",
    "contract_sha256",
    "service_contract_sha256",
  ])
  const baseUrl = publicUrl(
    string(gateway.base_url, "gateway URL"),
    "https:",
    trust.allowedHosts
  )
  const gatewaySigningPubkey = string(
    gateway.signing_pubkey,
    "gateway signing pubkey"
  )
  if (!LOWER_HEX_32.test(gatewaySigningPubkey)) {
    fail("public_manifest_invalid", "The gateway signing pubkey is invalid.")
  }
  equal(
    gateway.contract_schema,
    PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
    "gateway contract schema"
  )
  equal(
    gateway.contract_sha256,
    PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
    "gateway contract digest"
  )
  equal(
    gateway.service_contract_sha256,
    PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
    "service contract digest"
  )

  const relayValues = array(document.relays, "relays")
  if (relayValues.length < 1 || relayValues.length > 2) {
    fail(
      "public_manifest_invalid",
      "The public manifest requires one or two relays."
    )
  }
  const relays = relayValues.map((entry) =>
    parseRelay(entry, trust.allowedHosts)
  )
  if (
    new Set(relays.map((relay) => relay.websocketUrl)).size !== relays.length
  ) {
    fail("public_manifest_invalid", "The public relays are not distinct.")
  }

  const providerValues = array(document.providers, "providers")
  if (providerValues.length !== 2)
    fail("public_manifest_invalid", "Exactly two providers are required.")
  const providers = providerValues.map(parseProvider)
  if (
    new Set(providers.map((provider) => provider.pubkey)).size !== 2 ||
    new Set(providers.map((provider) => provider.role)).size !== 2
  ) {
    fail("public_manifest_invalid", "The public providers are not distinct.")
  }

  const originValues = array(document.allowed_origins, "allowed origins")
  if (originValues.length !== 1 || originValues[0] !== trust.allowedOrigin) {
    fail(
      "public_manifest_incompatible",
      "The manifest does not bind the deployed Bazaar origin."
    )
  }
  publicUrl(
    trust.allowedOrigin,
    "https:",
    new Set([new URL(trust.allowedOrigin).hostname]),
    true
  )

  const bounds = object(document.bounds, "bounds")
  exactKeys(bounds, [
    "maximum_active_sessions",
    "maximum_session_amount_sat",
    "maximum_session_lifetime_seconds",
  ])
  equal(bounds.maximum_active_sessions, 16, "active-session bound")
  equal(bounds.maximum_session_amount_sat, 1_000_000, "session amount bound")
  equal(
    bounds.maximum_session_lifetime_seconds,
    3_600,
    "session lifetime bound"
  )

  return {
    schema: "openagents.bazaar.public-regtest-config.v1",
    mode: "public_regtest",
    network: PUBLIC_REGTEST_NETWORK,
    issuedAt,
    expiresAt,
    refreshAfterSeconds,
    serviceState: "live",
    bazaarRevision: trust.bazaarRevision,
    immortalRevision: trust.immortalRevision,
    engine: {
      sourceRevision: IMMORTAL_ARTIFACT.sourceRevision,
      requesterApiSha256: IMMORTAL_ARTIFACT.requesterApiSha256,
      wasmSha256: IMMORTAL_ARTIFACT.wasmSha256,
      wasmBytes: IMMORTAL_ARTIFACT.wasmBytes,
      browserAbiVersion: PUBLIC_REGTEST_BROWSER_ABI_VERSION,
    },
    gateway: {
      baseUrl,
      signingPubkey: gatewaySigningPubkey,
      contractSchema: PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
      contractSha256: PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
      serviceContractSha256: PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
    },
    relays,
    providers: providers as [PublicRegtestProvider, PublicRegtestProvider],
    allowedOrigins: [trust.allowedOrigin],
    bounds: {
      maximumActiveSessions: 16,
      maximumSessionAmountSat: 1_000_000,
      maximumSessionLifetimeSeconds: 3_600,
    },
  }
}

function parseRelay(
  value: unknown,
  allowedHosts: ReadonlySet<string>
): PublicRegtestRelay {
  const relay = object(value, "relay")
  exactKeys(relay, ["websocket_url", "contract_sha256", "contract_identity"])
  equal(
    relay.contract_sha256,
    PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
    "relay contract digest"
  )
  return {
    websocketUrl: publicUrl(
      string(relay.websocket_url, "relay URL"),
      "wss:",
      allowedHosts
    ),
    contractSha256: PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
    contractIdentity: parseContractIdentity(relay.contract_identity),
  }
}

function parseContractIdentity(value: unknown): ImmortalContractIdentity {
  const identity = object(value, "relay contract identity")
  exactKeys(identity, [
    "schema",
    "contract_version",
    "crate_name",
    "crate_version",
    "nips",
  ])
  equal(
    identity.schema,
    "openagents.immortal.contract.v1",
    "relay contract schema"
  )
  equal(identity.contract_version, 1, "relay contract version")
  equal(identity.crate_name, "immortal", "relay crate")
  const crateVersion = string(identity.crate_version, "relay crate version")
  const nips = array(identity.nips, "relay NIP pins").map((value) => {
    const pin = object(value, "relay NIP pin")
    exactKeys(pin, ["lane", "repo", "subdir", "commit"])
    return {
      lane: string(pin.lane, "relay NIP lane"),
      repo: string(pin.repo, "relay NIP repository"),
      subdir: string(pin.subdir, "relay NIP subdirectory"),
      commit: revision(pin.commit, "relay NIP revision"),
    }
  })
  if (nips.length !== 3)
    fail(
      "public_manifest_incompatible",
      "The relay must pin exactly three NIP lanes."
    )
  return {
    schema: "openagents.immortal.contract.v1",
    contractVersion: 1,
    crateName: "immortal",
    crateVersion,
    nips,
  }
}

function parseProvider(value: unknown): PublicRegtestProvider {
  const provider = object(value, "provider")
  exactKeys(provider, ["role", "pubkey", "offering_coordinate"])
  const role = string(provider.role, "provider role")
  if (role !== "provider-a" && role !== "provider-b")
    fail("public_manifest_invalid", "The provider role is invalid.")
  const pubkey = string(provider.pubkey, "provider pubkey")
  if (!LOWER_HEX_32.test(pubkey))
    fail("public_manifest_invalid", "The provider pubkey is invalid.")
  const offeringCoordinate = string(
    provider.offering_coordinate,
    "Offering coordinate"
  )
  if (
    !new RegExp(`^39601:${pubkey}:[a-z0-9][a-z0-9._-]{0,127}$`).test(
      offeringCoordinate
    )
  ) {
    fail(
      "public_manifest_invalid",
      "The Offering coordinate is not bound to its provider."
    )
  }
  return { role, pubkey, offeringCoordinate }
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
  const id = string(event.id, "event ID")
  const pubkey = string(event.pubkey, "event pubkey")
  const signature = string(event.sig, "event signature")
  const createdAt = integer(event.created_at, "event timestamp")
  const kind = integer(event.kind, "event kind")
  const content = event.content
  if (
    typeof content !== "string" ||
    content.length === 0 ||
    new TextEncoder().encode(content).byteLength > MAXIMUM_PUBLIC_MANIFEST_BYTES
  ) {
    fail(
      "public_manifest_unauthenticated",
      "The manifest signature content is malformed."
    )
  }
  const tags = array(event.tags, "event tags").map((entry) => {
    const tag = array(entry, "event tag")
    if (tag.length < 1 || tag.length > 4) {
      fail(
        "public_manifest_unauthenticated",
        "A manifest signature tag is malformed."
      )
    }
    return tag.map((item) => string(item, "event tag value"))
  })
  if (
    !LOWER_HEX_32.test(id) ||
    !LOWER_HEX_32.test(pubkey) ||
    !/^[0-9a-f]{128}$/.test(signature)
  ) {
    fail(
      "public_manifest_unauthenticated",
      "The manifest signature event is malformed."
    )
  }
  return {
    id,
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig: signature,
  }
}

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`
      )
      .join(",")}}`
  }
  const encoded = JSON.stringify(value)
  if (encoded === undefined)
    fail(
      "public_manifest_invalid",
      "The public manifest contains a non-JSON value."
    )
  return encoded
}

function publicUrl(
  value: string,
  protocol: "https:" | "wss:",
  allowedHosts: ReadonlySet<string>,
  originOnly = false
): string {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    fail("public_manifest_invalid", "The public service URL is invalid.")
  }
  const hostname = url.hostname.toLowerCase()
  if (
    url.protocol !== protocol ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.port ||
    !DNS_HOST.test(hostname) ||
    !allowedHosts.has(hostname) ||
    (originOnly ? url.pathname !== "/" : !["", "/"].includes(url.pathname))
  ) {
    fail(
      "public_manifest_incompatible",
      "A public service URL is not an exact allowlisted TLS authority."
    )
  }
  return url.origin.replace(/^https:/, protocol)
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    fail("public_manifest_invalid", `${label} must be an object.`)
  return value as Record<string, unknown>
}
function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value))
    fail("public_manifest_invalid", `${label} must be an array.`)
  return value
}
function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048)
    fail("public_manifest_invalid", `${label} must be a bounded string.`)
  return value
}
function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail(
      "public_manifest_invalid",
      `${label} must be a non-negative safe integer.`
    )
  return value as number
}
function revision(value: unknown, label: string): string {
  const parsed = string(value, label)
  if (!LOWER_HEX_20.test(parsed))
    fail("public_manifest_invalid", `${label} must be lower hex-20.`)
  return parsed
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
  )
    fail(
      "public_manifest_invalid",
      "The public manifest contains missing or unknown members."
    )
}
function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected)
    fail("public_manifest_incompatible", `${label} is incompatible.`)
}
function fail(code: PublicRegtestConfigError["code"], message: string): never {
  throw new PublicRegtestConfigError(code, message)
}
