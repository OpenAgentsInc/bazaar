import { IMMORTAL_ARTIFACT } from "./config"

export const FUNDED_REGTEST_NETWORK =
  "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4" as const
export const FUNDED_ADAPTER_CONTRACT_SCHEMA =
  "openagents.immortal.browser-demo-contract.v1" as const
export const FUNDED_ADAPTER_CONTRACT_SHA256 =
  "1edc8f07b859832dd95f11fbed9831ebfd53bc11cf8d8d5156509556c023856d" as const
export const FUNDED_BROWSER_ABI_VERSION = 1 as const

const LOWER_HEX_20 = /^[0-9a-f]{40}$/
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const MAXIMUM_LAUNCH_LIFETIME_SECONDS = 3_600

export interface FundedRegtestConfig {
  readonly schema: "openagents.bazaar.funded-regtest-config.v1"
  readonly mode: "unsafe_local_funded_regtest_demo"
  readonly network: typeof FUNDED_REGTEST_NETWORK
  readonly createdAt: number
  readonly expiresAt: number
  readonly adapter: {
    readonly baseUrl: string
    readonly allowedOrigin: string
    readonly contractSchema: typeof FUNDED_ADAPTER_CONTRACT_SCHEMA
    readonly contractSha256: typeof FUNDED_ADAPTER_CONTRACT_SHA256
  }
  readonly engine: {
    readonly sourceRevision: typeof IMMORTAL_ARTIFACT.sourceRevision
    readonly requesterApiSha256: typeof IMMORTAL_ARTIFACT.requesterApiSha256
    readonly wasmSha256: typeof IMMORTAL_ARTIFACT.wasmSha256
    readonly browserAbiVersion: typeof FUNDED_BROWSER_ABI_VERSION
  }
  readonly launcher: {
    readonly immortalRevision: string
    readonly bazaarRevision: string
  }
}

export type FundedRegtestConfigResult =
  | { readonly state: "ready"; readonly config: FundedRegtestConfig }
  | {
      readonly state: "unavailable"
      readonly code:
        | "funded_manifest_not_configured"
        | "funded_manifest_unavailable"
        | "funded_manifest_incompatible"
      readonly detail: string
    }

export class FundedConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FundedConfigError"
  }
}

export function parseFundedRegtestLaunchManifest(
  value: unknown,
  now = Math.floor(Date.now() / 1_000)
): FundedRegtestConfig {
  const document = object(value, "funded launch manifest")
  exactKeys(document, [
    "schema",
    "mode",
    "network",
    "created_at",
    "expires_at",
    "adapter",
    "engine",
    "launcher",
  ])
  equal(
    document.schema,
    "openagents.bazaar.funded-regtest-launch.v1",
    "launch schema"
  )
  equal(document.mode, "unsafe_local_funded_regtest_demo", "funded mode")
  equal(document.network, FUNDED_REGTEST_NETWORK, "funded network")

  const createdAt = integer(document.created_at, "creation time")
  const expiresAt = integer(document.expires_at, "expiry time")
  if (
    createdAt > now + 60 ||
    expiresAt <= now ||
    expiresAt <= createdAt ||
    expiresAt - createdAt > MAXIMUM_LAUNCH_LIFETIME_SECONDS
  ) {
    fail("funded launch manifest is stale or has an invalid lifetime")
  }

  const adapter = object(document.adapter, "funded adapter")
  exactKeys(adapter, [
    "base_url",
    "allowed_origin",
    "contract_schema",
    "contract_sha256",
  ])
  const baseUrl = loopbackHttpUrl(
    string(adapter.base_url, "adapter base URL"),
    false
  )
  const allowedOrigin = loopbackHttpUrl(
    string(adapter.allowed_origin, "adapter allowed origin"),
    true
  )
  equal(
    adapter.contract_schema,
    FUNDED_ADAPTER_CONTRACT_SCHEMA,
    "adapter contract schema"
  )
  equal(
    adapter.contract_sha256,
    FUNDED_ADAPTER_CONTRACT_SHA256,
    "adapter contract digest"
  )

  const engine = object(document.engine, "funded engine")
  exactKeys(engine, [
    "source_revision",
    "requester_api_sha256",
    "wasm_sha256",
    "browser_abi_version",
  ])
  equal(
    engine.source_revision,
    IMMORTAL_ARTIFACT.sourceRevision,
    "engine source revision"
  )
  equal(
    engine.requester_api_sha256,
    IMMORTAL_ARTIFACT.requesterApiSha256,
    "requester API digest"
  )
  equal(engine.wasm_sha256, IMMORTAL_ARTIFACT.wasmSha256, "browser WASM digest")
  equal(
    engine.browser_abi_version,
    FUNDED_BROWSER_ABI_VERSION,
    "browser ABI version"
  )

  const launcher = object(document.launcher, "funded launcher")
  exactKeys(launcher, ["immortal_revision", "bazaar_revision"])
  const immortalRevision = revision(
    launcher.immortal_revision,
    "Immortal revision"
  )
  const bazaarRevision = revision(launcher.bazaar_revision, "Bazaar revision")

  return {
    schema: "openagents.bazaar.funded-regtest-config.v1",
    mode: "unsafe_local_funded_regtest_demo",
    network: FUNDED_REGTEST_NETWORK,
    createdAt,
    expiresAt,
    adapter: {
      baseUrl,
      allowedOrigin,
      contractSchema: FUNDED_ADAPTER_CONTRACT_SCHEMA,
      contractSha256: FUNDED_ADAPTER_CONTRACT_SHA256,
    },
    engine: {
      sourceRevision: IMMORTAL_ARTIFACT.sourceRevision,
      requesterApiSha256: IMMORTAL_ARTIFACT.requesterApiSha256,
      wasmSha256: IMMORTAL_ARTIFACT.wasmSha256,
      browserAbiVersion: FUNDED_BROWSER_ABI_VERSION,
    },
    launcher: { immortalRevision, bazaarRevision },
  }
}

function loopbackHttpUrl(value: string, originOnly: boolean): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    fail("funded URL is invalid")
  }
  if (
    parsed.protocol !== "http:" ||
    parsed.username ||
    parsed.password ||
    parsed.hash ||
    parsed.search ||
    !numericIpv4Loopback(parsed.hostname) ||
    !parsed.port ||
    (originOnly
      ? parsed.pathname !== "/"
      : !["", "/"].includes(parsed.pathname))
  ) {
    fail("funded URL must be an exact numeric IPv4 loopback HTTP authority")
  }
  return parsed.origin
}

function numericIpv4Loopback(hostname: string): boolean {
  const octets = hostname.split(".")
  return (
    octets.length === 4 &&
    octets.every(
      (octet) => /^(0|[1-9][0-9]{0,2})$/.test(octet) && Number(octet) <= 255
    ) &&
    Number(octets[0]) === 127
  )
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail(`${label} must be a bounded string`)
  }
  return value
}

function integer(value: unknown, label: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    fail(`${label} must be a non-negative safe integer`)
  }
  return value as number
}

function revision(value: unknown, label: string): string {
  const parsed = string(value, label)
  if (!LOWER_HEX_20.test(parsed)) fail(`${label} must be lower hex-20`)
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
  ) {
    fail("funded launch manifest contains missing or unknown members")
  }
}

function equal(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label} is incompatible`)
}

function fail(message: string): never {
  throw new FundedConfigError(message)
}

export function isLowerHex32(value: unknown): value is string {
  return typeof value === "string" && LOWER_HEX_32.test(value)
}
