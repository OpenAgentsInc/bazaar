import "server-only"

import { lstat, readFile } from "node:fs/promises"

import type {
  ImmortalConfigResult,
  ImmortalContractIdentity,
  ImmortalDemoConfig,
  ImmortalDemoProvider,
} from "./config"

const MAXIMUM_MANIFEST_BYTES = 32_768
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const LOWER_HEX_20 = /^[0-9a-f]{40}$/
const ROLE_SET = new Set(["provider-a", "provider-b"])

class ManifestError extends Error {
  constructor(
    readonly code: "manifest_unavailable" | "manifest_incompatible",
    message: string
  ) {
    super(message)
  }
}

export async function readImmortalDemoConfig(): Promise<ImmortalConfigResult> {
  const manifestPath = process.env.IMMORTAL_DEMO_MANIFEST
  if (!manifestPath) {
    return {
      state: "unavailable",
      code: "manifest_not_configured",
      detail: "Start the Immortal demo topology and configure its manifest path.",
    }
  }

  try {
    const metadata = await lstat(manifestPath)
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new ManifestError(
        "manifest_unavailable",
        "The configured demo manifest is not a regular file."
      )
    }
    if (metadata.size < 2 || metadata.size > MAXIMUM_MANIFEST_BYTES) {
      throw new ManifestError(
        "manifest_incompatible",
        "The configured demo manifest is empty or exceeds its public bound."
      )
    }
    const parsed: unknown = JSON.parse(await readFile(manifestPath, "utf8"))
    return { state: "ready", config: parseManifest(parsed) }
  } catch (cause) {
    if (cause instanceof ManifestError) {
      return { state: "unavailable", code: cause.code, detail: cause.message }
    }
    return {
      state: "unavailable",
      code: "manifest_unavailable",
      detail: "The configured Immortal demo manifest could not be read.",
    }
  }
}

function parseManifest(value: unknown): ImmortalDemoConfig {
  const document = object(value, "manifest")
  exactKeys(document, [
    "schema",
    "source_revision",
    "network",
    "mode",
    "relay",
    "providers",
    "lifecycle",
    "bounds",
  ])
  requireEqual(
    document.schema,
    "openagents.immortal.no-spend-demo-manifest.v1",
    "manifest schema"
  )
  requireEqual(document.network, "regtest", "network")
  requireEqual(document.mode, "no_spend", "mode")
  const sourceRevision = string(document.source_revision, "source revision")
  if (!LOWER_HEX_20.test(sourceRevision)) fail("source revision is invalid")

  const relay = object(document.relay, "relay")
  exactKeys(relay, [
    "websocket_url",
    "health_url",
    "contract_sha256",
    "contract_identity",
    "health",
  ])
  const websocketUrl = loopbackWebSocket(
    string(relay.websocket_url, "relay WebSocket URL")
  )
  const healthUrl = loopbackHttp(string(relay.health_url, "relay health URL"))
  const contractSha256 = string(relay.contract_sha256, "relay contract digest")
  if (!LOWER_HEX_32.test(contractSha256)) fail("relay contract digest is invalid")
  const relayHealth = object(relay.health, "relay health")
  exactKeys(relayHealth, ["state"])
  requireEqual(relayHealth.state, "ready", "relay health")
  const contractIdentity = parseContractIdentity(relay.contract_identity)

  const providersValue = array(document.providers, "providers")
  if (providersValue.length !== 2) fail("the demo must expose exactly two providers")
  const providers = providersValue.map(parseProvider)
  if (
    new Set(providers.map((provider) => provider.role)).size !== 2 ||
    new Set(providers.map((provider) => provider.pubkey)).size !== 2
  ) {
    fail("the demo providers are not distinct")
  }

  const lifecycle = object(document.lifecycle, "lifecycle")
  exactKeys(lifecycle, [
    "terminal_path",
    "external_spend_effects",
    "close_loss_classification",
  ])
  requireEqual(
    lifecycle.terminal_path,
    "bilateral_contract_then_mutual_cancel",
    "terminal path"
  )
  requireEqual(lifecycle.external_spend_effects, 0, "external spend effects")
  requireEqual(lifecycle.close_loss_classification, "none", "loss classification")

  const bounds = object(document.bounds, "bounds")
  exactKeys(bounds, ["relay_count", "provider_count", "maximum_manifest_bytes"])
  requireEqual(bounds.relay_count, 1, "relay count")
  requireEqual(bounds.provider_count, 2, "provider count")
  requireEqual(bounds.maximum_manifest_bytes, MAXIMUM_MANIFEST_BYTES, "manifest bound")

  return {
    schema: "openagents.bazaar.immortal-demo-config.v1",
    sourceRevision,
    network: "regtest",
    mode: "no_spend",
    relay: { websocketUrl, healthUrl, contractSha256, contractIdentity },
    providers: providers as [ImmortalDemoProvider, ImmortalDemoProvider],
    lifecycle: {
      terminalPath: "bilateral_contract_then_mutual_cancel",
      externalSpendEffects: 0,
      closeLossClassification: "none",
    },
  }
}

function parseContractIdentity(value: unknown): ImmortalContractIdentity {
  const identity = object(value, "contract identity")
  exactKeys(identity, [
    "schema",
    "contract_version",
    "crate_name",
    "crate_version",
    "nips",
  ])
  requireEqual(identity.schema, "openagents.immortal.contract.v1", "contract schema")
  requireEqual(identity.contract_version, 1, "contract version")
  requireEqual(identity.crate_name, "immortal", "contract crate")
  const crateVersion = string(identity.crate_version, "contract crate version")
  const nips = array(identity.nips, "contract NIP pins").map((entry) => {
    const pin = object(entry, "contract NIP pin")
    exactKeys(pin, ["lane", "repo", "subdir", "commit"])
    const commit = string(pin.commit, "contract NIP commit")
    if (!LOWER_HEX_20.test(commit)) fail("contract NIP commit is invalid")
    return {
      lane: string(pin.lane, "contract NIP lane"),
      repo: string(pin.repo, "contract NIP repository"),
      subdir: string(pin.subdir, "contract NIP subdirectory"),
      commit,
    }
  })
  if (nips.length !== 3) fail("contract identity must pin exactly three NIP lanes")
  return {
    schema: "openagents.immortal.contract.v1",
    contractVersion: 1,
    crateName: "immortal",
    crateVersion,
    nips,
  }
}

function parseProvider(value: unknown): ImmortalDemoProvider {
  const provider = object(value, "provider")
  exactKeys(provider, [
    "role",
    "pubkey",
    "offering_coordinate",
    "policy",
    "health",
  ])
  const role = string(provider.role, "provider role")
  if (!ROLE_SET.has(role)) fail("provider role is invalid")
  const pubkey = string(provider.pubkey, "provider public key")
  if (!LOWER_HEX_32.test(pubkey)) fail("provider public key is invalid")
  const offeringCoordinate = string(
    provider.offering_coordinate,
    "provider Offering coordinate"
  )
  if (!offeringCoordinate.startsWith(`39601:${pubkey}:`)) {
    fail("provider Offering coordinate is not bound to its signer")
  }

  const policy = object(provider.policy, "provider policy")
  exactKeys(policy, [
    "variant",
    "quote_class",
    "reservation_class",
    "quote_lifetime_seconds",
    "completion_discount_seconds",
    "settlement_claim",
  ])
  requireEqual(policy.quote_class, "firm", "provider Quote class")
  requireEqual(policy.reservation_class, "soft", "provider reservation class")
  const quoteLifetimeSeconds = integer(
    policy.quote_lifetime_seconds,
    "provider Quote lifetime"
  )
  const completionDiscountSeconds = integer(
    policy.completion_discount_seconds,
    "provider completion discount"
  )
  if (quoteLifetimeSeconds <= 0 || completionDiscountSeconds < 0) {
    fail("provider timing policy is invalid")
  }
  const health = object(provider.health, "provider health")
  exactKeys(health, ["state", "restart_count"])
  requireEqual(health.state, "ready", "provider health")

  return {
    role: role as ImmortalDemoProvider["role"],
    pubkey,
    offeringCoordinate,
    policy: {
      variant: string(policy.variant, "provider policy variant"),
      quoteClass: "firm",
      reservationClass: "soft",
      quoteLifetimeSeconds,
      completionDiscountSeconds,
      settlementClaim: string(policy.settlement_claim, "provider settlement claim"),
    },
    health: {
      state: "ready",
      restartCount: integer(health.restart_count, "provider restart count"),
    },
  }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`)
  return value
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail(`${label} must be a bounded string`)
  }
  return value
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value)) fail(`${label} must be a safe integer`)
  return value as number
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    fail("manifest contains missing or unknown members")
  }
}

function requireEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label} is incompatible`)
}

function loopbackWebSocket(value: string): string {
  const url = new URL(value)
  if (url.protocol !== "ws:" || url.hostname !== "127.0.0.1" || !url.port) {
    fail("the no-spend relay must use numeric IPv4 loopback WebSocket")
  }
  return url.toString().replace(/\/$/, "")
}

function loopbackHttp(value: string): string {
  const url = new URL(value)
  if (url.protocol !== "http:" || url.hostname !== "127.0.0.1" || !url.port) {
    fail("the no-spend relay health URL must use numeric IPv4 loopback HTTP")
  }
  return url.toString()
}

function fail(message: string): never {
  throw new ManifestError("manifest_incompatible", message)
}
