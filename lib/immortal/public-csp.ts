import type { PublicRegtestConfigResult } from "./public-config"

export function publicRegtestConnectSources(
  result: PublicRegtestConfigResult
): readonly string[] {
  if (result.state !== "ready") return ["'self'"]
  return [
    "'self'",
    result.config.gateway.baseUrl,
    ...result.config.relays.map((relay) => relay.websocketUrl),
    ...result.config.relays.map((relay) =>
      relay.websocketUrl.replace(/^wss:/, "https:")
    ),
  ]
}

export function buildPublicRegtestCsp(
  nonce: string,
  result: PublicRegtestConfigResult,
  development = false,
  localConnectSources: readonly string[] = []
): string {
  const configuredSources =
    result.state === "unavailable" &&
    result.code === "public_manifest_not_configured"
      ? ["'self'", ...localConnectSources]
      : publicRegtestConnectSources(result)
  const connectSources = [...new Set(configuredSources)].join(" ")
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${development ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'${development ? " 'unsafe-inline'" : ""}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src ${connectSources}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    result.state === "ready" ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ")
}
