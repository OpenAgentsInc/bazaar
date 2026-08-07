import assert from "node:assert/strict"
import test from "node:test"

import type { Event } from "@openagentsinc/nip-mkt"

import type { ImmortalDemoConfig } from "./config"
import {
  eligibleRoutes,
  foldMarketHeads,
  selectBestQuote,
  validateQuoteView,
  type QuoteRequestContext,
  type ValidatedQuote,
} from "./market"
import type { ImmortalRequesterSessionView } from "@/vendor/mkt-swp/immortal-browser-abi"

const providerA = "11".repeat(32)
const providerB = "22".repeat(32)
const chain = "swp:1:bip122:00000000000000000000000000000000:btc:chain"
const lightning = "swp:1:bip122:00000000000000000000000000000000:btc:lightning"
const otherChain = "swp:1:bip122:11111111111111111111111111111111:btc:chain"

const config = {
  providers: [
    {
      role: "provider-a",
      pubkey: providerA,
      offeringCoordinate: `39601:${providerA}:no-spend-default`,
    },
    {
      role: "provider-b",
      pubkey: providerB,
      offeringCoordinate: `39601:${providerB}:no-spend-demo-alternate`,
    },
  ],
} as unknown as ImmortalDemoConfig

test("live replaceable heads expose only jointly offered engine rails", () => {
  const events = [
    profile(providerA, "provider-a", 10, "active"),
    profile(providerB, "provider-b", 10, "active"),
    offering(providerA, "no-spend-default", "provider-a", 11, "active"),
    offering(providerB, "no-spend-demo-alternate", "provider-b", 11, "active"),
  ]
  const market = foldMarketHeads(events, config)
  const reverse = market.directions.find(
    (direction) =>
      direction.inputAsset.ticker === "LN" &&
      direction.outputAsset.ticker === "BTC"
  )
  assert.equal(reverse?.providerCount, 2)
  assert.equal(reverse?.minimum, "1000")
  assert.equal(reverse?.maximum, "1000")
  assert.equal(reverse?.actionable, true)
  assert.deepEqual(
    market.assets.map((asset) => asset.ticker),
    ["LN", "BTC"]
  )
  assert.equal(
    eligibleRoutes(market, {
      inputAssetId: lightning,
      outputAssetId: chain,
      inputAmount: "1000",
    }).length,
    2
  )

  const paused = foldMarketHeads(
    [
      ...events,
      offering(
        providerB,
        "no-spend-demo-alternate",
        "provider-b",
        12,
        "paused"
      ),
    ],
    config
  )
  const pausedReverse = paused.directions.find(
    (direction) =>
      direction.inputAsset.ticker === "LN" &&
      direction.outputAsset.ticker === "BTC"
  )
  assert.equal(pausedReverse?.providerCount, 1)
  assert.equal(pausedReverse?.actionable, false)
  assert.match(pausedReverse?.unavailableReason ?? "", /Two active providers/)
})

test("signed Quote arithmetic, bindings, expiry, and reservations fail closed", () => {
  const context = quoteContext(providerA)
  const event = quoteEvent(providerA)
  const view = quoteView(providerA)
  const quote = validateQuoteView(view, event, context, 1_700_000_000)
  assert.equal(quote.outputAmount, "890")
  assert.equal(quote.maximumTotalFee, "110")
  assert.equal(quote.reservationProof, "provider-signed:no-spend:default")

  assert.throws(
    () =>
      validateQuoteView(
        {
          ...view,
          quote: { ...view.quote, output_amount: "891" },
        },
        event,
        context,
        1_700_000_000
      ),
    /quote_amount_invalid/
  )
  assert.throws(
    () => validateQuoteView(view, event, context, 1_700_000_500),
    /quote_expired/
  )
})

test("best Quote selection is deterministic and uses atomic-unit BigInt", () => {
  const base = validated(providerA, "890", "110")
  const moreOutput = validated(providerB, "900", "120")
  assert.equal(
    selectBestQuote([base, moreOutput], 1_700_000_000)?.providerPubkey,
    providerB
  )

  const lowerFee = validated(providerB, "890", "109")
  assert.equal(
    selectBestQuote([base, lowerFee], 1_700_000_000)?.providerPubkey,
    providerB
  )

  const huge = validated(providerA, "900719925474099312345", "1")
  assert.equal(
    selectBestQuote([base, huge], 1_700_000_000)?.outputAmount,
    huge.outputAmount
  )
})

function profile(
  pubkey: string,
  distinct: string,
  createdAt: number,
  status: string
): Event {
  return event(
    pubkey,
    createdAt,
    39_600,
    [
      ["d", distinct],
      ["status", status],
      ["published_at", createdAt.toString()],
      ["profile", "mkt-swp", "1"],
    ],
    JSON.stringify({ name: distinct })
  )
}

function offering(
  pubkey: string,
  distinct: string,
  profileDistinct: string,
  createdAt: number,
  status: string
): Event {
  return event(
    pubkey,
    createdAt,
    39_601,
    [
      ["d", distinct],
      ["status", status],
      ["published_at", createdAt.toString()],
      ["profile", "mkt-swp", "1"],
      ["provider", `39600:${pubkey}:${profileDistinct}`],
    ],
    JSON.stringify({
      mkt_swp: {
        swap_types: ["submarine", "reverse", "chain"],
        sides: [
          {
            input_asset_id: chain,
            output_asset_id: lightning,
            min: "100000",
            max: "100000",
            fee_bps: "9800",
          },
          {
            input_asset_id: lightning,
            output_asset_id: chain,
            min: "1000",
            max: "1000",
            fee_bps: "100",
          },
          {
            input_asset_id: chain,
            output_asset_id: otherChain,
            min: "100000",
            max: "100000",
            fee_bps: "100",
          },
        ],
        reservation_proof_classes: ["provider_signed"],
        script_modes: ["taproot-musig2-script-exit"],
        confirmation_policies: [
          {
            minimum_confirmations: "1",
            reorg_safety_blocks: "6",
            zero_confirmation: "forbidden",
            rbf: "reject",
            replacement: "reject",
          },
        ],
      },
    })
  )
}

function event(
  pubkey: string,
  createdAt: number,
  kind: number,
  tags: string[][],
  content: string
): Event {
  const id = createdAt.toString(16).padStart(64, "0")
  return {
    id,
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig: "44".repeat(64),
  }
}

function quoteContext(pubkey: string): QuoteRequestContext {
  return {
    logicalRequestId: "aa".repeat(32),
    requestKey: `${lightning}:${chain}:1000`,
    sessionId: "bb".repeat(32),
    rfqId: "cc".repeat(32),
    providerRole: pubkey === providerA ? "provider-a" : "provider-b",
    providerPubkey: pubkey,
    offeringCoordinate: `39601:${pubkey}:offering`,
    inputAssetId: lightning,
    outputAssetId: chain,
    inputAmount: "1000",
    expiresAt: 1_700_000_600,
  }
}

function quoteView(pubkey: string): ImmortalRequesterSessionView {
  const context = quoteContext(pubkey)
  return {
    schema: "openagents.mkt-swp.requester-session-view.v1",
    session_id: context.sessionId,
    quote: {
      rfq_id: context.rfqId,
      quote_id: "dd".repeat(32),
      provider_pubkey: pubkey,
      quote_class: "firm",
      reservation_class: "soft",
      swap_type: "reverse",
      input_asset_id: lightning,
      output_asset_id: chain,
      input_amount: "1000",
      output_amount: "890",
      amount_equation: "input_minus_provider_and_quoted_fees",
      rounding: "floor_output_sats",
      clock_skew_seconds: "60",
      expires_at: 1_700_000_500,
      effective_acceptance_deadline: 1_700_000_440,
      fees: {
        fee_bps: "100",
        provider_fee: "10",
        miner_fee_budget: "100",
        lightning_routing_fee_budget: "0",
        maximum_total_fee: "110",
        fee_payer: "requester",
      },
      price_feed: null,
    },
    timeline: [],
    verification: {
      state: "quote_verified",
      local_verification_required: true,
      funding_authorized: false,
      status_gaps: [],
      status_forks: [],
      invalid_status_claims: [],
    },
    terminal: {
      claimed_state: "open",
      canonical_close_id: null,
      close_event_ids: [],
      principal_unresolved: null,
      loss_accounting_complete: false,
      local_effects_verified: false,
      watch_terminal: true,
    },
    deliveries: [],
  }
}

function quoteEvent(pubkey: string): Event {
  return {
    ...event(pubkey, 1_700_000_001, 39_605, [], ""),
    id: "dd".repeat(32),
    content: JSON.stringify({
      mkt_swp: {
        reservation_terms: {
          proof_ref: "provider-signed:no-spend:default",
          reservation_expires_at: 1_700_000_500,
          reserved_amount: "890",
        },
      },
    }),
  }
}

function validated(
  pubkey: string,
  outputAmount: string,
  maximumTotalFee: string
): ValidatedQuote {
  return {
    logicalRequestId: "aa".repeat(32),
    requestKey: "request",
    sessionId: "bb".repeat(32),
    rfqId: "cc".repeat(32),
    quoteId: "dd".repeat(32),
    providerRole: pubkey === providerA ? "provider-a" : "provider-b",
    providerPubkey: pubkey,
    quoteClass: "firm",
    reservationClass: "soft",
    reservationProof: "provider-signed",
    reservationExpiresAt: 1_700_000_500,
    swapType: "reverse",
    inputAssetId: lightning,
    outputAssetId: chain,
    inputAmount: "1000",
    outputAmount,
    providerFee: "10",
    minerFeeBudget: "100",
    lightningRoutingFeeBudget: "0",
    maximumTotalFee,
    feeBps: "100",
    amountEquation: "input_minus_provider_and_quoted_fees",
    rounding: "floor_output_sats",
    expiresAt: 1_700_000_500,
    effectiveAcceptanceDeadline: 1_700_000_440,
  }
}
