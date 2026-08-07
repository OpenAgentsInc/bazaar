import assert from "node:assert/strict"
import test from "node:test"

import { IMMORTAL_ARTIFACT } from "./config"
import {
  FUNDED_ADAPTER_CONTRACT_SCHEMA,
  FUNDED_ADAPTER_CONTRACT_SHA256,
  FUNDED_REGTEST_NETWORK,
  parseFundedRegtestLaunchManifest,
} from "./funded-config"

test("accepts only a current, revision-pinned loopback regtest launch", () => {
  const parsed = parseFundedRegtestLaunchManifest(launch(), 1_500)
  assert.equal(parsed.network, FUNDED_REGTEST_NETWORK)
  assert.equal(parsed.adapter.baseUrl, "http://127.0.0.1:18183")
  assert.equal(parsed.adapter.allowedOrigin, "http://127.0.0.1:3102")
  assert.equal(parsed.engine.browserAbiVersion, 1)
})

test("refuses stale, mainnet, public, foreign-origin, and changed ABI launches", () => {
  for (const mutate of [
    (value: Launch) => (value.expires_at = 1_499),
    (value: Launch) => (value.network = "mainnet"),
    (value: Launch) => (value.adapter.base_url = "http://192.168.1.2:18183"),
    (value: Launch) => (value.adapter.allowed_origin = "http://localhost:3102"),
    (value: Launch) => (value.engine.browser_abi_version = 2),
    (value: Launch) => (value.adapter.contract_sha256 = "00".repeat(32)),
  ]) {
    const candidate = launch()
    mutate(candidate)
    assert.throws(() => parseFundedRegtestLaunchManifest(candidate, 1_500))
  }
})

test("refuses launch manifests with credentials or unknown authority", () => {
  const credentials = launch()
  credentials.adapter.base_url = "http://user:pass@127.0.0.1:18183"
  assert.throws(() => parseFundedRegtestLaunchManifest(credentials, 1_500))

  const unknown = launch() as Launch & { wallet_rpc?: string }
  unknown.wallet_rpc = "http://127.0.0.1:18443"
  assert.throws(() => parseFundedRegtestLaunchManifest(unknown, 1_500))
})

interface Launch {
  schema: string
  mode: string
  network: string
  created_at: number
  expires_at: number
  adapter: {
    base_url: string
    allowed_origin: string
    contract_schema: string
    contract_sha256: string
  }
  engine: {
    source_revision: string
    requester_api_sha256: string
    wasm_sha256: string
    browser_abi_version: number
  }
  launcher: { immortal_revision: string; bazaar_revision: string }
}

function launch(): Launch {
  return {
    schema: "openagents.bazaar.funded-regtest-launch.v1",
    mode: "unsafe_local_funded_regtest_demo",
    network: FUNDED_REGTEST_NETWORK,
    created_at: 1_000,
    expires_at: 2_000,
    adapter: {
      base_url: "http://127.0.0.1:18183",
      allowed_origin: "http://127.0.0.1:3102",
      contract_schema: FUNDED_ADAPTER_CONTRACT_SCHEMA,
      contract_sha256: FUNDED_ADAPTER_CONTRACT_SHA256,
    },
    engine: {
      source_revision: IMMORTAL_ARTIFACT.sourceRevision,
      requester_api_sha256: IMMORTAL_ARTIFACT.requesterApiSha256,
      wasm_sha256: IMMORTAL_ARTIFACT.wasmSha256,
      browser_abi_version: 1,
    },
    launcher: {
      immortal_revision: "11".repeat(20),
      bazaar_revision: "22".repeat(20),
    },
  }
}
