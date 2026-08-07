import assert from "node:assert/strict"
import test from "node:test"

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "@openagentsinc/nip-mkt"

import { IMMORTAL_ARTIFACT } from "./config"
import {
  PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
  PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
  PUBLIC_REGTEST_MANIFEST_EVENT_KIND,
  PUBLIC_REGTEST_NETWORK,
  PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
  PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
  PublicRegtestConfigError,
  canonicalJson,
  parseSignedPublicRegtestManifest,
  type PublicRegtestTrust,
} from "./public-config"
import {
  buildPublicRegtestCsp,
  publicRegtestConnectSources,
} from "./public-csp"
import {
  readPublicRegtestConfig,
  resetPublicManifestCacheForTests,
} from "./public-manifest"
import { publicRequesterRuntimeConfig } from "./public-runtime"

const NOW = 1_800_000_000
const BAZAAR_REVISION = "11".repeat(20)
const IMMORTAL_REVISION = "22".repeat(20)
const PROVIDER_A = "33".repeat(32)
const PROVIDER_B = "44".repeat(32)

function fixture() {
  const secret = generateSecretKey()
  const trust: PublicRegtestTrust = {
    signingPubkey: getPublicKey(secret),
    bazaarRevision: BAZAAR_REVISION,
    immortalRevision: IMMORTAL_REVISION,
    allowedOrigin: "https://bazaar.example.com",
    allowedHosts: new Set([
      "bazaar.example.com",
      "config.example.com",
      "gateway.example.com",
      "relay-a.example.com",
      "relay-b.example.com",
    ]),
  }
  return { secret, trust }
}

function manifest() {
  const contractIdentity = {
    schema: "openagents.immortal.contract.v1",
    contract_version: 1,
    crate_name: "immortal",
    crate_version: "0.0.1",
    nips: [
      {
        lane: "official",
        repo: "https://github.com/nostr-protocol/nips",
        subdir: ".",
        commit: "55".repeat(20),
      },
      {
        lane: "block",
        repo: "https://github.com/block/buzz",
        subdir: "docs/nips",
        commit: "66".repeat(20),
      },
      {
        lane: "openagents",
        repo: "https://github.com/OpenAgentsInc/openagents",
        subdir: "docs/nips",
        commit: "77".repeat(20),
      },
    ],
  }
  return {
    schema: "openagents.bazaar.public-regtest-launch.v1",
    mode: "public_regtest",
    network: PUBLIC_REGTEST_NETWORK,
    issued_at: NOW,
    expires_at: NOW + 3_600,
    refresh_after_seconds: 60,
    service_state: "live",
    bazaar_revision: BAZAAR_REVISION,
    immortal_revision: IMMORTAL_REVISION,
    engine: {
      source_revision: IMMORTAL_ARTIFACT.sourceRevision,
      requester_api_sha256: IMMORTAL_ARTIFACT.requesterApiSha256,
      wasm_sha256: IMMORTAL_ARTIFACT.wasmSha256,
      wasm_bytes: IMMORTAL_ARTIFACT.wasmBytes,
      browser_abi_version: 1,
    },
    gateway: {
      base_url: "https://gateway.example.com",
      signing_pubkey: "88".repeat(32),
      contract_schema: PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
      contract_sha256: PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
      service_contract_sha256: PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
    },
    relays: [
      {
        websocket_url: "wss://relay-a.example.com",
        contract_sha256: PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
        contract_identity: contractIdentity,
      },
      {
        websocket_url: "wss://relay-b.example.com",
        contract_sha256: PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
        contract_identity: contractIdentity,
      },
    ],
    providers: [
      {
        role: "provider-a",
        pubkey: PROVIDER_A,
        offering_coordinate: `39601:${PROVIDER_A}:immortal-funded-btc-lightning`,
      },
      {
        role: "provider-b",
        pubkey: PROVIDER_B,
        offering_coordinate: `39601:${PROVIDER_B}:immortal-funded-btc-lightning`,
      },
    ],
    allowed_origins: ["https://bazaar.example.com"],
    bounds: {
      maximum_active_sessions: 16,
      maximum_session_amount_sat: 1_000_000,
      maximum_session_lifetime_seconds: 3_600,
    },
  }
}

function signedRaw(
  value: ReturnType<typeof manifest>,
  secret: Uint8Array,
  origin = "https://bazaar.example.com"
): string {
  const event = finalizeEvent(
    {
      kind: PUBLIC_REGTEST_MANIFEST_EVENT_KIND,
      created_at: value.issued_at,
      tags: [
        ["d", "bazaar-public-regtest"],
        ["expiration", String(value.expires_at)],
        ["network", value.network],
        ["origin", origin],
      ],
      content: canonicalJson(value),
    },
    secret
  )
  return JSON.stringify({
    schema: "openagents.bazaar.public-regtest-envelope.v1",
    manifest: value,
    signature_event: event,
  })
}

test("signed public-regtest manifest projects only exact public authorities", () => {
  const { secret, trust } = fixture()
  const config = parseSignedPublicRegtestManifest(
    signedRaw(manifest(), secret),
    trust,
    NOW + 1
  )
  assert.equal(config.mode, "public_regtest")
  assert.equal(config.signerPubkey, trust.signingPubkey)
  assert.deepEqual(
    config.relays.map((relay) => relay.websocketUrl),
    ["wss://relay-a.example.com", "wss://relay-b.example.com"]
  )
  assert.deepEqual(
    config.providers.map((provider) => provider.pubkey),
    [PROVIDER_A, PROVIDER_B]
  )
})

test("projects both signed relays into provider-specific requester lanes", () => {
  const { secret, trust } = fixture()
  const parsed = parseSignedPublicRegtestManifest(
    signedRaw(manifest(), secret),
    trust,
    NOW + 1
  )
  const projected = publicRequesterRuntimeConfig(parsed)
  assert.equal(projected.state, "ready")
  if (projected.state !== "ready") return
  assert.deepEqual(
    projected.config.relayPool?.map((relay) => relay.websocketUrl),
    ["wss://relay-a.example.com", "wss://relay-b.example.com"]
  )
  assert.deepEqual(
    projected.config.providers.map((provider) => provider.relayUrl),
    ["wss://relay-a.example.com", "wss://relay-b.example.com"]
  )
  assert.ok(
    projected.config.requestContract.templates.every((template) =>
      [template.inputAssetId, template.outputAssetId].every((assetId) =>
        assetId.includes("bip122:0f9188f13cb7b2c9e5c72a6b65eeada4")
      )
    )
  )
})

test("signature, expiry, digest, schema, origin, network, and URL attacks fail before transport", () => {
  const { secret, trust } = fixture()
  const wrongSecret = generateSecretKey()
  const cases: Array<{ raw: string; code: PublicRegtestConfigError["code"] }> =
    []
  cases.push({
    raw: signedRaw(manifest(), wrongSecret),
    code: "public_manifest_unauthenticated",
  })
  cases.push({
    raw: signedRaw(
      { ...manifest(), expires_at: NOW - 1, issued_at: NOW - 100 },
      secret
    ),
    code: "public_manifest_expired",
  })
  cases.push({
    raw: signedRaw(
      { ...manifest(), network: "mainnet" as typeof PUBLIC_REGTEST_NETWORK },
      secret
    ),
    code: "public_manifest_incompatible",
  })
  cases.push({
    raw: signedRaw(
      {
        ...manifest(),
        relays: [
          {
            ...manifest().relays[0],
            websocket_url: "ws://relay-a.example.com",
          },
        ] as ReturnType<typeof manifest>["relays"],
      },
      secret
    ),
    code: "public_manifest_incompatible",
  })
  cases.push({
    raw: signedRaw(
      { ...manifest(), allowed_origins: ["https://attacker.example.com"] },
      secret,
      "https://attacker.example.com"
    ),
    code: "public_manifest_incompatible",
  })
  for (const baseUrl of [
    "http://gateway.example.com",
    "https://user@gateway.example.com",
    "https://gateway.example.com/?override=true",
    "https://gateway.example.com/#fragment",
    "https://127.0.0.1",
  ]) {
    cases.push({
      raw: signedRaw(
        {
          ...manifest(),
          gateway: { ...manifest().gateway, base_url: baseUrl },
        },
        secret
      ),
      code: "public_manifest_incompatible",
    })
  }
  cases.push({
    raw: signedRaw(
      {
        ...manifest(),
        gateway: {
          ...manifest().gateway,
          contract_sha256: "aa".repeat(32),
        } as ReturnType<typeof manifest>["gateway"],
      },
      secret
    ),
    code: "public_manifest_incompatible",
  })
  const unknown = { ...manifest(), unexpected: true }
  cases.push({
    raw: signedRaw(unknown as ReturnType<typeof manifest>, secret),
    code: "public_manifest_invalid",
  })

  for (const entry of cases) {
    assert.throws(
      () => parseSignedPublicRegtestManifest(entry.raw, trust, NOW + 1),
      (cause) =>
        cause instanceof PublicRegtestConfigError && cause.code === entry.code
    )
  }

  const valid = signedRaw(manifest(), secret)
  const duplicate = valid.replace(
    '"schema":"openagents.bazaar.public-regtest-envelope.v1"',
    '"schema":"openagents.bazaar.public-regtest-envelope.v1","schema":"changed"'
  )
  assert.throws(
    () => parseSignedPublicRegtestManifest(duplicate, trust, NOW + 1),
    (cause) =>
      cause instanceof PublicRegtestConfigError &&
      cause.code === "public_manifest_invalid"
  )
})

test("CSP permits only the signed gateway and direct relay authorities", () => {
  const { secret, trust } = fixture()
  const config = parseSignedPublicRegtestManifest(
    signedRaw(manifest(), secret),
    trust,
    NOW + 1
  )
  const result = {
    state: "ready",
    config,
    source: "environment",
    refreshAt: NOW + 60,
  } as const
  assert.deepEqual(publicRegtestConnectSources(result), [
    "'self'",
    "https://gateway.example.com",
    "wss://relay-a.example.com",
    "wss://relay-b.example.com",
    "https://relay-a.example.com",
    "https://relay-b.example.com",
  ])
  const csp = buildPublicRegtestCsp("nonce-value", result)
  assert.match(
    csp,
    /connect-src 'self' https:\/\/gateway\.example\.com wss:\/\/relay-a\.example\.com/
  )
  assert.doesNotMatch(csp, /attacker|ws:|http:/)
  assert.match(csp, /'wasm-unsafe-eval'/)
  assert.match(csp, /script-src 'self' 'nonce-nonce-value' 'strict-dynamic'/)
  assert.match(csp, /style-src 'self' 'unsafe-inline'/)

  const local = buildPublicRegtestCsp(
    "nonce-value",
    {
      state: "unavailable",
      code: "public_manifest_not_configured",
      detail: "not configured",
    },
    true,
    ["ws://127.0.0.1:18080", "http://127.0.0.1:19091"]
  )
  assert.match(local, /connect-src 'self' ws:\/\/127\.0\.0\.1:18080/)
  const invalid = buildPublicRegtestCsp(
    "nonce-value",
    { state: "incompatible", code: "public_trust_invalid", detail: "bad" },
    false,
    ["ws://127.0.0.1:18080"]
  )
  assert.match(invalid, /connect-src 'self';/)
  assert.doesNotMatch(invalid, /127\.0\.0\.1/)
})

test("deployment-only environment and HTTPS sources refresh with a bounded last-known-good", async () => {
  const { secret, trust } = fixture()
  const raw = signedRaw(manifest(), secret)
  const names = [
    "BAZAAR_PUBLIC_REGTEST_MANIFEST",
    "BAZAAR_PUBLIC_REGTEST_MANIFEST_URL",
    "BAZAAR_PUBLIC_REGTEST_SIGNING_PUBKEY",
    "BAZAAR_PUBLIC_REGTEST_SOURCE_REVISION",
    "BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION",
    "BAZAAR_PUBLIC_REGTEST_ORIGIN",
    "BAZAAR_PUBLIC_REGTEST_ALLOWED_HOSTS",
  ] as const
  const prior = new Map(names.map((name) => [name, process.env[name]]))
  const originalFetch = globalThis.fetch
  try {
    process.env.BAZAAR_PUBLIC_REGTEST_SIGNING_PUBKEY = trust.signingPubkey
    process.env.BAZAAR_PUBLIC_REGTEST_SOURCE_REVISION = BAZAAR_REVISION
    process.env.BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION = IMMORTAL_REVISION
    process.env.BAZAAR_PUBLIC_REGTEST_ORIGIN = trust.allowedOrigin
    process.env.BAZAAR_PUBLIC_REGTEST_ALLOWED_HOSTS =
      "config.example.com,gateway.example.com,relay-a.example.com,relay-b.example.com"
    process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST = raw
    delete process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST_URL
    resetPublicManifestCacheForTests()
    assert.equal((await readPublicRegtestConfig(NOW + 1)).state, "ready")

    delete process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST
    process.env.BAZAAR_PUBLIC_REGTEST_MANIFEST_URL =
      "https://config.example.com/bazaar-public-regtest.json"
    let available = true
    globalThis.fetch = (async () => {
      if (!available) throw new Error("offline")
      return new Response(raw, {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    }) as typeof fetch
    resetPublicManifestCacheForTests()
    const fetched = await readPublicRegtestConfig(NOW + 1)
    assert.equal(fetched.state, "ready")
    assert.equal(fetched.state === "ready" && fetched.source, "https")
    available = false
    const restored = await readPublicRegtestConfig(NOW + 62)
    assert.equal(restored.state, "ready")
    assert.equal(
      restored.state === "ready" && restored.source,
      "last_known_good"
    )
  } finally {
    globalThis.fetch = originalFetch
    resetPublicManifestCacheForTests()
    for (const name of names) {
      const value = prior.get(name)
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  }
})

export { fixture as publicFixture, manifest as publicManifest, signedRaw }
