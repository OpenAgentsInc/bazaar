import assert from "node:assert/strict"
import test from "node:test"

import type { FundedRegtestConfig } from "./funded-config"
import { FUNDED_REGTEST_NETWORK } from "./funded-config"
import { fundedEffectWire, parseFundedSessionManifest } from "./funded-session"

const ORIGIN = "http://127.0.0.1:3102"
const EFFECT = {
  schema: "openagents.immortal.browser-demo-effect.v1",
  network: FUNDED_REGTEST_NETWORK,
  journey: "submarine",
  session_id: "11".repeat(32),
  order_id: "22".repeat(32),
  effect_id: "33".repeat(32),
  idempotency_digest: "44".repeat(32),
  method: "broadcast_bitcoin_funding",
  amount_sat: 1_000,
} as const

test("parses an exact pending engine effect and serializes it unchanged", () => {
  const parsed = parseFundedSessionManifest(pendingManifest(), config(), ORIGIN)
  const effect = parsed.journeys.submarine?.pendingEffect
  assert.ok(effect)
  assert.deepEqual(fundedEffectWire(effect), EFFECT)
  assert.equal(parsed.journeys.submarine?.providerStatusClaim.verified, false)
})

test("permits local completion only with a retained receipt and both rail proofs", () => {
  const parsed = parseFundedSessionManifest(
    terminalManifest(),
    config(),
    ORIGIN
  )
  const journey = parsed.journeys.submarine
  assert.equal(
    journey?.requesterVerification.state,
    "terminal_rail_evidence_verified"
  )
  assert.equal(journey?.requesterVerification.independentRailEvidence.length, 2)
  assert.equal(journey?.presentation.settledAllowed, true)
})

test("refuses provider-only completion, receipt rebinding, and custody material", () => {
  const providerOnly = pendingManifest()
  providerOnly.journeys.submarine.provider_status_claim.state = "completed"
  providerOnly.journeys.submarine.presentation.settled_allowed = true
  assert.throws(
    () => parseFundedSessionManifest(providerOnly, config(), ORIGIN),
    /Presentation authority/
  )

  const rebound = terminalManifest()
  rebound.journeys.submarine.effect_receipt!.request.order_id = "99".repeat(32)
  assert.throws(
    () => parseFundedSessionManifest(rebound, config(), ORIGIN),
    /coordinates differ/
  )

  const custody = pendingManifest() as ReturnType<typeof pendingManifest> & {
    wallet_seed?: string
  }
  custody.wallet_seed = "forbidden"
  assert.throws(
    () => parseFundedSessionManifest(custody, config(), ORIGIN),
    /custody or node material/
  )
})

test("refuses wrong browser origin and non-regtest effects", () => {
  assert.throws(
    () =>
      parseFundedSessionManifest(
        pendingManifest(),
        config(),
        "http://127.0.0.1:3001"
      ),
    /origin differs/
  )
  const mainnet = pendingManifest()
  mainnet.journeys.submarine.pending_effect!.network = "mainnet"
  assert.throws(() => parseFundedSessionManifest(mainnet, config(), ORIGIN))
})

function pendingManifest() {
  return {
    schema: "openagents.immortal.browser-demo-manifest.v1",
    mode: "unsafe_local_funded_regtest_demo",
    warning: "disposable loopback regtest only",
    network: FUNDED_REGTEST_NETWORK,
    allowed_origin: ORIGIN,
    active_journey: "submarine",
    requester_pubkey: "55".repeat(32),
    journeys: {
      submarine: {
        swap_type: "submarine",
        session_id: EFFECT.session_id,
        order_id: EFFECT.order_id,
        provider_pubkey: "66".repeat(32),
        relay_url: "ws://127.0.0.1:18182",
        provider_status_claim: { state: "funding_requested", verified: false },
        requester_verification: {
          state: "effect_authorized",
          engine: "immortal-client",
          independent_rail_evidence: [] as unknown[],
        },
        pending_effect: { ...EFFECT } as Record<string, string | number> | null,
        effect_receipt: null as null | {
          schema: string
          request: Record<string, string | number>
          external_identifier: string
          result_digest: string
          state: string
          admitted_at: number
        },
        presentation: { settled_allowed: false },
      },
    },
  }
}

function terminalManifest() {
  const manifest = pendingManifest()
  manifest.journeys.submarine.pending_effect = null
  manifest.journeys.submarine.effect_receipt = {
    schema: "openagents.immortal.browser-demo-effect-receipt.v1",
    request: { ...EFFECT },
    external_identifier: "77".repeat(32),
    result_digest: "88".repeat(32),
    state: "admitted",
    admitted_at: 1_700_000_000,
  }
  manifest.journeys.submarine.provider_status_claim.state = "completed"
  manifest.journeys.submarine.requester_verification = {
    state: "terminal_rail_evidence_verified",
    engine: "immortal-client",
    independent_rail_evidence: [
      {
        rail: "bitcoin",
        lockup_txid: "99".repeat(32),
        claim_txid: "aa".repeat(32),
      },
      { rail: "lightning", payment_hash: "bb".repeat(32), state: "paid" },
    ],
  }
  manifest.journeys.submarine.presentation.settled_allowed = true
  return manifest
}

function config(): FundedRegtestConfig {
  return {
    adapter: { allowedOrigin: ORIGIN },
  } as FundedRegtestConfig
}
