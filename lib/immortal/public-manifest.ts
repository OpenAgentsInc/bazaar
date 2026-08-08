import {
  MAXIMUM_PUBLIC_MANIFEST_BYTES,
  MAXIMUM_PUBLIC_MANIFEST_REFRESH_SECONDS,
  PublicRegtestConfigError,
  parseSignedPublicRegtestManifest,
  type PublicRegtestConfig,
  type PublicRegtestConfigResult,
  type PublicRegtestTrust,
} from "./public-config"

const FETCH_TIMEOUT_MS = 5_000
const LAST_KNOWN_GOOD_SECONDS = 300
const MANIFEST_PATH = "/bazaar-public-regtest.json"
const LOWER_HEX_20 = /^[0-9a-f]{40}$/
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const DNS_HOST =
  /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/

interface CachedManifest {
  readonly config: PublicRegtestConfig
  readonly raw: string
  readonly trustFingerprint: string
  readonly loadedAt: number
  readonly refreshAt: number
}

let cached: CachedManifest | null = null

export async function readPublicRegtestConfig(
  now = Math.floor(Date.now() / 1_000)
): Promise<PublicRegtestConfigResult> {
  const publicEnvironmentNames = [
    "BAZAAR_PUBLIC_REGTEST_MANIFEST",
    "BAZAAR_PUBLIC_REGTEST_MANIFEST_URL",
    "BAZAAR_PUBLIC_REGTEST_SIGNING_PUBKEY",
    "BAZAAR_PUBLIC_REGTEST_SOURCE_REVISION",
    "BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION",
    "BAZAAR_PUBLIC_REGTEST_ORIGIN",
    "BAZAAR_PUBLIC_REGTEST_ALLOWED_HOSTS",
  ] as const
  if (!publicEnvironmentNames.some((name) => process.env[name])) {
    return {
      state: "unavailable",
      code: "public_manifest_not_configured",
      detail: "The public-regtest launch profile is not configured.",
    }
  }
  let trust: PublicRegtestTrust
  try {
    trust = trustFromEnvironment()
  } catch (cause) {
    return unavailable(cause, "public_trust_invalid")
  }
  const rawEnvironment = process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST
  const sourceUrl = process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST_URL
  if (Boolean(rawEnvironment) === Boolean(sourceUrl)) {
    return {
      state: "unavailable",
      code: "public_manifest_not_configured",
      detail:
        "Configure exactly one deployment-controlled public manifest source.",
    }
  }
  const fingerprint = trustFingerprint(
    trust,
    rawEnvironment ? "environment" : sourceUrl!
  )
  if (
    cached &&
    cached.trustFingerprint === fingerprint &&
    now < cached.refreshAt &&
    now < cached.config.expiresAt
  ) {
    return {
      state: "ready",
      config: cached.config,
      source: rawEnvironment ? "environment" : "https",
      refreshAt: cached.refreshAt,
    }
  }

  try {
    const raw =
      rawEnvironment ?? (await fetchManifest(sourceUrl!, trust.allowedHosts))
    const config = parseSignedPublicRegtestManifest(raw, trust, now)
    const refreshAt = Math.min(
      config.expiresAt,
      now + config.refreshAfterSeconds
    )
    cached = {
      config,
      raw,
      trustFingerprint: fingerprint,
      loadedAt: now,
      refreshAt,
    }
    return {
      state: "ready",
      config,
      source: rawEnvironment ? "environment" : "https",
      refreshAt,
    }
  } catch (cause) {
    if (
      cached &&
      cached.trustFingerprint === fingerprint &&
      now < cached.config.expiresAt &&
      now - cached.loadedAt <= LAST_KNOWN_GOOD_SECONDS
    ) {
      return {
        state: "ready",
        config: cached.config,
        source: "last_known_good",
        refreshAt: Math.min(cached.config.expiresAt, now + 10),
      }
    }
    return unavailable(cause, "public_manifest_unavailable")
  }
}

export async function readPublicRegtestEnvelope(
  now = Math.floor(Date.now() / 1_000)
): Promise<string | null> {
  const result = await readPublicRegtestConfig(now)
  return result.state === "ready" ? (cached?.raw ?? null) : null
}

export function resetPublicManifestCacheForTests(): void {
  cached = null
}

async function fetchManifest(
  urlValue: string,
  allowedHosts: ReadonlySet<string>
): Promise<string> {
  const url = strictManifestUrl(urlValue, allowedHosts)
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  const contentLength = response.headers.get("content-length")
  if (
    !response.ok ||
    !response.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json") ||
    (contentLength !== null &&
      (!/^\d+$/.test(contentLength) ||
        Number(contentLength) > MAXIMUM_PUBLIC_MANIFEST_BYTES))
  ) {
    throw new Error(
      "The HTTPS public manifest source returned an invalid response."
    )
  }
  const bytes = await readBoundedBody(response)
  if (
    bytes.byteLength < 2 ||
    bytes.byteLength > MAXIMUM_PUBLIC_MANIFEST_BYTES
  ) {
    throw new Error("The HTTPS public manifest source exceeded its byte bound.")
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes)
}

async function readBoundedBody(response: Response): Promise<Uint8Array> {
  if (!response.body) throw new Error("The HTTPS public manifest has no body.")
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      length += value.byteLength
      if (length > MAXIMUM_PUBLIC_MANIFEST_BYTES) {
        await reader.cancel()
        throw new Error(
          "The HTTPS public manifest source exceeded its byte bound."
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

function strictManifestUrl(
  value: string,
  allowedHosts: ReadonlySet<string>
): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("The public manifest URL is invalid.")
  }
  const host = url.hostname.toLowerCase()
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.hash ||
    url.search ||
    url.pathname !== MANIFEST_PATH ||
    url.port ||
    !DNS_HOST.test(host) ||
    !allowedHosts.has(host)
  ) {
    throw new Error(
      "The public manifest URL is not an exact allowlisted HTTPS source."
    )
  }
  return url
}

function trustFromEnvironment(): PublicRegtestTrust {
  const signingPubkey = required("BAZAAR_PUBLIC_REGTEST_SIGNING_PUBKEY")
  const bazaarRevision = required("BAZAAR_PUBLIC_REGTEST_SOURCE_REVISION")
  const immortalRevision = required("BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION")
  const allowedOrigin = required("BAZAAR_PUBLIC_REGTEST_ORIGIN")
  const hosts = required("BAZAAR_PUBLIC_REGTEST_ALLOWED_HOSTS").split(",")
  if (
    !LOWER_HEX_32.test(signingPubkey) ||
    !LOWER_HEX_20.test(bazaarRevision) ||
    !LOWER_HEX_20.test(immortalRevision) ||
    hosts.length < 2 ||
    hosts.length > 4 ||
    hosts.some((host) => !DNS_HOST.test(host)) ||
    new Set(hosts).size !== hosts.length ||
    [...hosts].sort().join(",") !== hosts.join(",")
  ) {
    throw new Error("The public-regtest trust environment is invalid.")
  }
  const origin = new URL(allowedOrigin)
  if (
    origin.protocol !== "https:" ||
    origin.username ||
    origin.password ||
    origin.hash ||
    origin.search ||
    origin.pathname !== "/" ||
    origin.port ||
    !DNS_HOST.test(origin.hostname)
  ) {
    throw new Error("The deployed Bazaar origin is invalid.")
  }
  return {
    signingPubkey,
    bazaarRevision,
    immortalRevision,
    allowedOrigin: origin.origin,
    allowedHosts: new Set(hosts),
  }
}

function trustFingerprint(trust: PublicRegtestTrust, source: string): string {
  return [
    trust.signingPubkey,
    trust.bazaarRevision,
    trust.immortalRevision,
    trust.allowedOrigin,
    [...trust.allowedHosts].sort().join(","),
    source,
  ].join("|")
}

function unavailable(
  cause: unknown,
  fallbackCode: string
): PublicRegtestConfigResult {
  if (cause instanceof PublicRegtestConfigError) {
    const state =
      cause.code === "public_manifest_expired"
        ? "expired"
        : cause.code === "public_manifest_maintenance"
          ? "maintenance"
          : cause.code === "public_manifest_incompatible" ||
              cause.code === "public_manifest_unauthenticated"
            ? "incompatible"
            : "unavailable"
    return { state, code: cause.code, detail: cause.message }
  }
  return {
    state: "unavailable",
    code: fallbackCode,
    detail: "The signed public-regtest configuration is unavailable.",
  }
}

function required(name: string): string {
  const value = process.env[name]
  if (!value || value.length > 65_536)
    throw new Error(`${name} is not configured.`)
  return value
}

export const PUBLIC_MANIFEST_CACHE_LIMITS = {
  fetchTimeoutMs: FETCH_TIMEOUT_MS,
  lastKnownGoodSeconds: LAST_KNOWN_GOOD_SECONDS,
  maximumRefreshSeconds: MAXIMUM_PUBLIC_MANIFEST_REFRESH_SECONDS,
} as const
