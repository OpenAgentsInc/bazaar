import assert from "node:assert/strict"
import test from "node:test"

import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
} from "@openagentsinc/nip-mkt"

import { IMMORTAL_ARTIFACT } from "./config"
import {
  PUBLIC_REGTEST_BROWSER_ABI_VERSION,
  PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
  PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
  PUBLIC_REGTEST_NETWORK,
  PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
  PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
  canonicalJson,
  type PublicRegtestConfig,
} from "./public-config"
import {
  PublicRegtestGatewayClient,
  parseSignedGatewayManifest,
  type PublicRegtestCapability,
  type PublicSessionStorage,
} from "./public-session"

const NOW = Math.floor(Date.now() / 1_000)
const SESSION = "11".repeat(32)
const REQUESTER = "22".repeat(32)
const PROVIDER_A = "33".repeat(32)
const PROVIDER_B = "44".repeat(32)
const CAPABILITY = "55".repeat(32)

function fixture() {
  const gatewaySecret = generateSecretKey()
  const config = {
    schema: "openagents.bazaar.public-regtest-config.v1",
    mode: "public_regtest",
    network: PUBLIC_REGTEST_NETWORK,
    issuedAt: NOW,
    expiresAt: NOW + 3_600,
    refreshAfterSeconds: 60,
    serviceState: "live",
    bazaarRevision: "66".repeat(20),
    immortalRevision: "77".repeat(20),
    engine: {
      sourceRevision: IMMORTAL_ARTIFACT.sourceRevision,
      requesterApiSha256: IMMORTAL_ARTIFACT.requesterApiSha256,
      wasmSha256: IMMORTAL_ARTIFACT.wasmSha256,
      wasmBytes: IMMORTAL_ARTIFACT.wasmBytes,
      browserAbiVersion: PUBLIC_REGTEST_BROWSER_ABI_VERSION,
    },
    gateway: {
      baseUrl: "https://gateway.example.com",
      signingPubkey: getPublicKey(gatewaySecret),
      contractSchema: PUBLIC_REGTEST_GATEWAY_CONTRACT_SCHEMA,
      contractSha256: PUBLIC_REGTEST_GATEWAY_CONTRACT_SHA256,
      serviceContractSha256: PUBLIC_REGTEST_SERVICE_CONTRACT_SHA256,
    },
    relays: [
      {
        websocketUrl: "wss://relay.example.com",
        contractSha256: PUBLIC_REGTEST_RELAY_CONTRACT_SHA256,
        contractIdentity: {} as never,
      },
    ],
    providers: [
      {
        role: "provider-a",
        pubkey: PROVIDER_A,
        offeringCoordinate: `39601:${PROVIDER_A}:funded`,
      },
      {
        role: "provider-b",
        pubkey: PROVIDER_B,
        offeringCoordinate: `39601:${PROVIDER_B}:funded`,
      },
    ],
    allowedOrigins: ["https://bazaar.example.com"],
    bounds: {
      maximumActiveSessions: 16,
      maximumSessionAmountSat: 1_000_000,
      maximumSessionLifetimeSeconds: 3_600,
    },
    signerPubkey: "88".repeat(32),
    signatureEventId: "99".repeat(32),
  } as PublicRegtestConfig
  return { config, gatewaySecret }
}

function manifest(config: PublicRegtestConfig) {
  return {
    schema: "openagents.immortal.public-regtest-session-manifest.v1",
    mode: "public_regtest_capability_v1",
    network: PUBLIC_REGTEST_NETWORK,
    origin: "https://bazaar.example.com",
    sandbox_session_id: SESSION,
    requester_identity: REQUESTER,
    requester_engine_identity: null,
    issued_at: NOW,
    expires_at: NOW + 3_600,
    revoked: false,
    source_revision: config.immortalRevision,
    requester_contract_digest: IMMORTAL_ARTIFACT.requesterApiSha256,
    browser_abi_version: PUBLIC_REGTEST_BROWSER_ABI_VERSION,
    providers: [PROVIDER_A, PROVIDER_B].toSorted(),
    quotas: {
      maximum_amount_sat: 1_000_000,
      maximum_effects: 2,
      maximum_concurrent_effects: 1,
      maximum_requests: 64,
    },
    allowed_operations: [
      "allocate_demo_input",
      "submit_dynamic_request",
      "broadcast_bitcoin_funding",
      "pay_lightning_invoice",
    ],
    dynamic_request: null,
    journey: null,
    effects: [],
  }
}

function signed(
  value: ReturnType<typeof manifest>,
  secret: Uint8Array,
  content = canonicalJson(value)
) {
  return {
    manifest: value,
    signature_event: finalizeEvent(
      {
        kind: 27_236,
        created_at: NOW,
        tags: [
          ["d", SESSION],
          ["network", PUBLIC_REGTEST_NETWORK],
        ],
        content,
      },
      secret
    ),
  }
}

test("gateway manifests require the pinned signer and exact canonical content", () => {
  const { config, gatewaySecret } = fixture()
  const value = manifest(config)
  const parsed = parseSignedGatewayManifest(
    signed(value, gatewaySecret),
    config,
    "https://bazaar.example.com",
    REQUESTER,
    NOW + 1
  )
  assert.equal(parsed.sandboxSessionId, SESSION)

  assert.throws(() =>
    parseSignedGatewayManifest(
      signed({ ...value, revoked: true }, gatewaySecret, canonicalJson(value)),
      config,
      "https://bazaar.example.com",
      REQUESTER,
      NOW + 1
    )
  )
  assert.throws(() =>
    parseSignedGatewayManifest(
      signed(value, generateSecretKey()),
      config,
      "https://bazaar.example.com",
      REQUESTER,
      NOW + 1
    )
  )
})

test("capability remains in storage and the authorization header only", async () => {
  const { config, gatewaySecret } = fixture()
  const stored: { value: PublicRegtestCapability | null } = { value: null }
  const storage: PublicSessionStorage = {
    load: () => stored.value,
    save: (value) => {
      stored.value = value
    },
    clear: () => {
      stored.value = null
    },
  }
  const calls: Array<{ url: string; init: RequestInit }> = []
  const request = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init: init ?? {} })
    const body = url.endsWith("/inputs")
      ? {
          schema: "openagents.immortal.public-regtest-demo-input.v1",
          sandbox_session_id: SESSION,
          swap_type: "reverse",
          amount_sat: 100_000,
          destination:
            "bcrt1pvcpgfdxvvnklep6kdyewn80pphta54nwwrex3ahrvh2uh0e9dgwsalmcu5",
          expires_at: NOW + 630,
        }
      : url.endsWith("/sessions") && init?.method === "POST"
        ? {
            schema: "openagents.immortal.public-regtest-session-response.v1",
            capability: CAPABILITY,
            signed_manifest: signed(manifest(config), gatewaySecret),
          }
        : signed(manifest(config), gatewaySecret)
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  }
  const client = new PublicRegtestGatewayClient(
    config,
    "https://bazaar.example.com",
    storage,
    request as typeof fetch
  )
  const created = await client.create(REQUESTER)
  await client.refresh(created.capability)
  const input = await client.allocateDemoInput(
    created.capability,
    "reverse",
    100_000
  )

  assert.equal(stored.value?.capability, CAPABILITY)
  assert.equal(calls[0]?.url.includes(CAPABILITY), false)
  assert.equal(String(calls[0]?.init.body).includes(CAPABILITY), false)
  const refreshHeaders = new Headers(calls[1]?.init.headers)
  assert.equal(
    refreshHeaders.get("Authorization"),
    `ImmortalRegtest ${CAPABILITY}`
  )
  assert.equal(calls[1]?.url.includes(CAPABILITY), false)
  assert.equal(input.destination.startsWith("bcrt1"), true)
  const inputHeaders = new Headers(calls[2]?.init.headers)
  assert.equal(
    inputHeaders.get("Authorization"),
    `ImmortalRegtest ${CAPABILITY}`
  )
  assert.equal(calls[2]?.url.includes(CAPABILITY), false)
  assert.equal(String(calls[2]?.init.body).includes(CAPABILITY), false)

  const stale = {
    ...created.capability,
    sandboxSessionId: "ef".repeat(32),
    capability: "ed".repeat(32),
  }
  await client.revoke(stale)
  assert.equal(stored.value?.capability, CAPABILITY)
  await client.revoke(created.capability)
  assert.equal(stored.value, null)
})
