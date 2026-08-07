#!/usr/bin/env node

import { writeFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { finalizeEvent, getPublicKey } from "@openagentsinc/nip-mkt"

const NETWORK = "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4"
const ORIGIN = "https://bazaar.openagents.com"
const GATEWAY = "https://gateway.34-41-78-122.sslip.io"
const GATEWAY_SIGNER =
  "cdaf28d7c13097b653fb77396772ddfd749b300f35f2e5c38c0403d2ce8c1ce6"
const PROVIDER_A =
  "b13eade9462e005f787a2268375aaf7fa7b7fb29180e7a4a83efe750ff87c6b1"
const PROVIDER_B =
  "cb53382f54bca65d5cdf9db41f2307633ab36e534b121c7dfc148de0a0ae1d44"
const RELAY_CONTRACT_IDENTITY = {
  schema: "openagents.immortal.contract.v1",
  contract_version: 1,
  crate_name: "immortal",
  crate_version: "0.0.1",
  nips: [
    {
      lane: "official",
      repo: "https://github.com/nostr-protocol/nips",
      subdir: ".",
      commit: "c53877571f96eb423661fc23c620d629d37b8f19",
    },
    {
      lane: "block",
      repo: "https://github.com/block/buzz",
      subdir: "docs/nips",
      commit: "8342dfcc5890b81a269a8ec3db73a8a56f76ce79",
    },
    {
      lane: "openagents",
      repo: "https://github.com/OpenAgentsInc/openagents",
      subdir: "docs/nips",
      commit: "c241e324e4a195c6a1fcbb04acc54647c2fa2208",
    },
  ],
}

export async function createPublicRegtestLaunchManifest({
  output,
  signingSecret,
  bazaarRevision,
  immortalRevision,
  lifetimeSeconds = 86_400,
}) {
  const secret = lowerHex32(signingSecret, "launch signing secret")
  const bazaar = revision(bazaarRevision, "Bazaar revision")
  const immortal = revision(immortalRevision, "Immortal revision")
  if (
    !Number.isInteger(lifetimeSeconds) ||
    lifetimeSeconds < 600 ||
    lifetimeSeconds > 86_400
  ) {
    throw new Error(
      "lifetime must be an integer from 600 through 86400 seconds"
    )
  }
  const issuedAt = Math.floor(Date.now() / 1_000)
  const manifest = {
    schema: "openagents.bazaar.public-regtest-launch.v1",
    mode: "public_regtest",
    network: NETWORK,
    issued_at: issuedAt,
    expires_at: issuedAt + lifetimeSeconds,
    refresh_after_seconds: 300,
    service_state: "live",
    bazaar_revision: bazaar,
    immortal_revision: immortal,
    engine: {
      source_revision: "1fb8f30d218c4e8e7d0e29dc4cd2e8d4900d60a8",
      requester_api_sha256:
        "bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8",
      wasm_sha256:
        "84cc47132dad5339e785f364833f9fe05eee742400f580dfce4a4f260f87c910",
      wasm_bytes: 3_738_371,
      browser_abi_version: 1,
    },
    gateway: {
      base_url: GATEWAY,
      signing_pubkey: GATEWAY_SIGNER,
      contract_schema: "openagents.immortal.public-regtest-gateway-contract.v1",
      contract_sha256:
        "374b864ab0e8a4449200dacbe8f1c174396cedc1edbcd384c5421a0ee1f92b4d",
      service_contract_sha256:
        "d1aa5cd171b9ba8247f5d93cdabcc762f82ac1aa15529c0ce7a6e148fed15637",
    },
    relays: [
      relay("wss://relay-a.34-41-78-122.nip.io"),
      relay("wss://relay-b.34-41-78-122.sslip.io"),
    ],
    providers: [
      provider("provider-a", PROVIDER_A),
      provider("provider-b", PROVIDER_B),
    ],
    allowed_origins: [ORIGIN],
    bounds: {
      maximum_active_sessions: 16,
      maximum_session_amount_sat: 1_000_000,
      maximum_session_lifetime_seconds: 3_600,
    },
  }
  const content = canonicalJson(manifest)
  const signatureEvent = finalizeEvent(
    {
      kind: 27_237,
      created_at: issuedAt,
      tags: [
        ["d", "bazaar-public-regtest"],
        ["expiration", String(manifest.expires_at)],
        ["network", NETWORK],
        ["origin", ORIGIN],
      ],
      content,
    },
    hexToBytes(secret)
  )
  const envelope = {
    schema: "openagents.bazaar.public-regtest-envelope.v1",
    manifest,
    signature_event: signatureEvent,
  }
  const encoded = `${JSON.stringify(envelope)}\n`
  if (Buffer.byteLength(encoded) > 65_536) {
    throw new Error("signed launch exceeds its byte bound")
  }
  if (output) {
    await writeFile(resolve(output), encoded, { encoding: "utf8", mode: 0o600 })
  }
  return {
    envelope: encoded.trimEnd(),
    signingPubkey: getPublicKey(hexToBytes(secret)),
  }
}

function relay(websocket_url) {
  return {
    websocket_url,
    contract_sha256:
      "2dc403d00574be2c531f88468a6cadbca1fd9b3192259a5ecbd03833d55ae1cc",
    contract_identity: RELAY_CONTRACT_IDENTITY,
  }
}

function provider(role, pubkey) {
  return {
    role,
    pubkey,
    offering_coordinate: `39601:${pubkey}:immortal-funded-btc-lightning`,
  }
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`
}

function revision(value, label) {
  if (!/^[0-9a-f]{40}$/.test(value ?? "")) {
    throw new Error(`${label} must be lower hex-20`)
  }
  return value
}

function lowerHex32(value, label) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    throw new Error(`${label} must be lower hex-32`)
  }
  return value
}

function hexToBytes(value) {
  return Uint8Array.from(
    value.match(/../g).map((byte) => Number.parseInt(byte, 16))
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const values = new Map()
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]
    const value = process.argv[index + 1]
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("arguments must be --name value pairs")
    }
    values.set(key.slice(2), value)
  }
  const result = await createPublicRegtestLaunchManifest({
    output: values.get("output"),
    signingSecret: process.env.BAZAAR_PUBLIC_REGTEST_SIGNING_SECRET,
    bazaarRevision: values.get("bazaar-revision"),
    immortalRevision: values.get("immortal-revision"),
    lifetimeSeconds: values.has("lifetime")
      ? Number(values.get("lifetime"))
      : undefined,
  })
  process.stdout.write(`${result.signingPubkey}\n`)
}
