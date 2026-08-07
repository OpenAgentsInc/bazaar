// Structure-checks a public regtest launch manifest envelope.
//
// Honesty note: this server verifies the envelope structure and the
// signature event's own cryptographic validity (id + schnorr signature via
// nip-mkt/nostr-effect), and that the event content is byte-bound to the
// canonical manifest JSON. It does NOT hold the deployment's pinned trust
// root (signing pubkey + revisions), so it cannot assert the signer is the
// operator the production site trusts. Results say so explicitly.

import { createHash } from "node:crypto"

import {
  parseJsonRejectingDuplicateMembers,
  verifyEvent,
  type Event,
} from "@openagentsinc/nip-mkt"

import { BoundaryError, REGTEST_NETWORK } from "./boundaries.js"

export const ENVELOPE_SCHEMA = "openagents.bazaar.public-regtest-envelope.v1"
export const LAUNCH_SCHEMA = "openagents.bazaar.public-regtest-launch.v1"
export const MANIFEST_EVENT_KIND = 27_237
export const MAXIMUM_MANIFEST_BYTES = 65_536

export interface ManifestRelay {
  readonly websocketUrl: string
}

export interface ManifestProvider {
  readonly role: string
  readonly pubkey: string
  readonly offeringCoordinate: string
}

export interface ManifestSummary {
  readonly network: string
  readonly issuedAt: number
  readonly expiresAt: number
  readonly serviceState: string
  readonly bazaarRevision: string
  readonly immortalRevision: string
  readonly gatewayBaseUrl: string
  readonly relays: readonly ManifestRelay[]
  readonly providers: readonly ManifestProvider[]
  readonly signingPubkey: string
  readonly signatureEventId: string
  readonly manifestSha256: string
  readonly verification: {
    readonly structure: "ok"
    readonly signatureEvent: "verified" | "invalid"
    readonly contentBinding: "bound" | "mismatch"
    readonly trustRoot: string
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
  if (encoded === undefined) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest contains a non-JSON value."
    )
  }
  return encoded
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex")
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an object.`)
  }
  return value as Record<string, unknown>
}

function asString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new BoundaryError(
      "manifest_invalid",
      `${label} must be a non-empty string.`
    )
  }
  return value
}

function asInteger(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an integer.`)
  }
  return value
}

function asArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an array.`)
  }
  return value
}

function parseSignatureEvent(value: unknown): Event {
  const event = record(value, "signature event")
  return {
    kind: asInteger(event.kind, "signature event kind"),
    id: asString(event.id, "signature event id"),
    pubkey: asString(event.pubkey, "signature event pubkey"),
    created_at: asInteger(event.created_at, "signature event timestamp"),
    tags: asArray(event.tags, "signature event tags").map((tag) =>
      asArray(tag, "signature event tag").map((entry) =>
        asString(entry, "signature event tag entry")
      )
    ),
    content: typeof event.content === "string" ? event.content : "",
    sig: asString(event.sig, "signature event signature"),
  } as Event
}

export async function fetchManifestSummary(
  url: string
): Promise<ManifestSummary> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { accept: "application/json" },
    redirect: "error",
  })
  if (!response.ok) {
    throw new BoundaryError(
      "manifest_unavailable",
      `The manifest URL responded with HTTP ${response.status}.`
    )
  }
  const raw = await response.text()
  return checkManifestEnvelope(raw)
}

export function checkManifestEnvelope(raw: string): ManifestSummary {
  if (new TextEncoder().encode(raw).byteLength > MAXIMUM_MANIFEST_BYTES) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest exceeds its 64 KiB byte bound."
    )
  }
  let parsed: unknown
  try {
    parsed = parseJsonRejectingDuplicateMembers(raw)
  } catch {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest envelope is malformed JSON or has duplicate members."
    )
  }
  const envelope = record(parsed, "manifest envelope")
  if (envelope.schema !== ENVELOPE_SCHEMA) {
    throw new BoundaryError(
      "manifest_invalid",
      `The envelope schema must be ${ENVELOPE_SCHEMA}.`
    )
  }
  const manifest = record(envelope.manifest, "manifest")
  if (manifest.schema !== LAUNCH_SCHEMA) {
    throw new BoundaryError(
      "manifest_invalid",
      `The launch schema must be ${LAUNCH_SCHEMA}.`
    )
  }
  const network = asString(manifest.network, "manifest network")
  if (network !== REGTEST_NETWORK) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `The manifest network is not the public regtest chain (${REGTEST_NETWORK}); this server is regtest-only.`
    )
  }
  const gateway = record(manifest.gateway, "gateway")
  const relays = asArray(manifest.relays, "relays").map((entry) => ({
    websocketUrl: asString(
      record(entry, "relay").websocket_url,
      "relay websocket_url"
    ),
  }))
  if (relays.length < 1) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest lists no relays."
    )
  }
  const providers = asArray(manifest.providers, "providers").map((entry) => {
    const provider = record(entry, "provider")
    return {
      role: asString(provider.role, "provider role"),
      pubkey: asString(provider.pubkey, "provider pubkey"),
      offeringCoordinate: asString(
        provider.offering_coordinate,
        "provider offering coordinate"
      ),
    }
  })

  const event = parseSignatureEvent(envelope.signature_event)
  if (event.kind !== MANIFEST_EVENT_KIND) {
    throw new BoundaryError(
      "manifest_invalid",
      `The signature event kind must be ${MANIFEST_EVENT_KIND}.`
    )
  }
  const canonical = canonicalJson(envelope.manifest)
  const contentBinding = event.content === canonical ? "bound" : "mismatch"
  let signatureEvent: "verified" | "invalid" = "invalid"
  try {
    signatureEvent = verifyEvent(event) ? "verified" : "invalid"
  } catch {
    signatureEvent = "invalid"
  }

  return {
    network,
    issuedAt: asInteger(manifest.issued_at, "issued_at"),
    expiresAt: asInteger(manifest.expires_at, "expires_at"),
    serviceState: asString(manifest.service_state, "service_state"),
    bazaarRevision: asString(manifest.bazaar_revision, "bazaar_revision"),
    immortalRevision: asString(
      manifest.immortal_revision,
      "immortal_revision"
    ),
    gatewayBaseUrl: asString(gateway.base_url, "gateway base_url"),
    relays,
    providers,
    signingPubkey: event.pubkey,
    signatureEventId: event.id,
    manifestSha256: sha256Hex(canonical),
    verification: {
      structure: "ok",
      signatureEvent,
      contentBinding,
      trustRoot:
        "structure-checked; signature event cryptographically verified against its own pubkey, " +
        "but the signer was NOT checked against the deployment's pinned trust root " +
        "(this server does not hold the pinned signing pubkey or revisions).",
    },
  }
}
