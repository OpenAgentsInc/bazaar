import type { FundedRuntimeState } from "@/hooks/use-funded-regtest"
import {
  FUNDED_REGTEST_NETWORK,
  type FundedRegtestConfigResult,
} from "@/lib/immortal/funded-config"
import type {
  ImmortalConfigResult,
  ImmortalRuntimeProvenance,
  ImmortalRuntimeStatus,
} from "@/lib/immortal/config"
import type {
  DemoLifecycleState,
  DemoLifecycleStage,
} from "@/lib/immortal/lifecycle"
import type {
  FundedEffectRequest,
  FundedJourney,
  FundedSessionManifest,
} from "@/lib/immortal/funded-session"
import type {
  ImmortalMarketSnapshot,
  MarketAsset,
  MarketDirection,
  QuoteState,
  ValidatedQuote,
} from "@/lib/immortal/market"

export const LIGHTNING_ASSET: MarketAsset = {
  id: "swp:1:bip122:regtest:btc:lightning",
  ticker: "LN",
  label: "Lightning",
  destination: "Lightning invoice",
}

export const BITCOIN_ASSET: MarketAsset = {
  id: "swp:1:bip122:regtest:btc:chain",
  ticker: "BTC",
  label: "Bitcoin",
  destination: "Bitcoin address",
}

export const LIQUID_ASSET: MarketAsset = {
  id: "swp:1:liquid-regtest:elements:asset:liquid",
  ticker: "LBTC",
  label: "Liquid BTC",
  destination: "Liquid address",
}

export const ASSETS = [LIGHTNING_ASSET, BITCOIN_ASSET, LIQUID_ASSET] as const

function direction(
  inputAsset: MarketAsset,
  outputAsset: MarketAsset,
  overrides: Partial<MarketDirection> = {}
): MarketDirection {
  return {
    inputAsset,
    outputAsset,
    minimum: "50000",
    maximum: "5000000",
    providerCount: 2,
    routes: [],
    actionable: true,
    unavailableReason: null,
    ...overrides,
  }
}

export const LIGHTNING_TO_BITCOIN = direction(LIGHTNING_ASSET, BITCOIN_ASSET)

export const MOCK_MARKET: ImmortalMarketSnapshot = {
  assets: ASSETS,
  directions: [
    LIGHTNING_TO_BITCOIN,
    direction(BITCOIN_ASSET, LIGHTNING_ASSET),
    direction(LIGHTNING_ASSET, LIQUID_ASSET),
    direction(LIQUID_ASSET, LIGHTNING_ASSET),
  ],
  activeProviderCount: 2,
  activeOfferingCount: 4,
}

export const QUOTE_A: ValidatedQuote = {
  logicalRequestId: "request-250000",
  requestKey: "ln-btc-250000",
  sessionId: "a".repeat(64),
  rfqId: "b".repeat(64),
  quoteId: "c".repeat(64),
  providerRole: "provider-a",
  providerPubkey: "d".repeat(64),
  quoteClass: "firm",
  reservationClass: "soft",
  reservationProof: "provider-a-signed-capacity",
  reservationExpiresAt: 2_000_000_000,
  swapType: "reverse",
  inputAssetId: LIGHTNING_ASSET.id,
  outputAssetId: BITCOIN_ASSET.id,
  inputAmount: "250000",
  destination: {
    schema: "openagents.bazaar.regtest-destination.v1",
    parserPackage: "@openagentsinc/mkt-swp-destination",
    parserRevision: "1cc29d4318",
    parserVersion: 1,
    swapType: "reverse",
    kind: "bitcoin_address",
    canonicalValue: "bcrt1ptest",
    commitmentSha256: "99".repeat(32),
    amountSat: null,
    paymentHash: null,
    expiresAt: null,
  },
  outputAmount: "244250",
  providerFee: "1250",
  minerFeeBudget: "4500",
  lightningRoutingFeeBudget: "0",
  maximumTotalFee: "5750",
  feeBps: "50",
  amountEquation: "input - provider_fee - miner_fee",
  rounding: "floor",
  expiresAt: 2_000_000_000,
  effectiveAcceptanceDeadline: 2_000_000_000,
}

export const QUOTE_B: ValidatedQuote = {
  ...QUOTE_A,
  quoteId: "e".repeat(64),
  providerRole: "provider-b",
  providerPubkey: "f".repeat(64),
  reservationProof: "provider-b-signed-capacity",
  outputAmount: "245000",
  providerFee: "1000",
  minerFeeBudget: "4000",
  maximumTotalFee: "5000",
  feeBps: "40",
}

export const READY_QUOTES: QuoteState = {
  state: "ready",
  logicalRequestId: "request-250000",
  requestKey: "ln-btc-250000",
  requestedProviderCount: 2,
  quotes: [QUOTE_A, QUOTE_B],
  selected: QUOTE_B,
  selectionPolicy: "highest_output_then_lowest_fee_then_provider_key",
}

const COMPLETED_STAGES: readonly DemoLifecycleStage[] = [
  "providers_discovered",
  "encrypted_rfq_delivered",
  "signed_quote_selected",
]

export const RUNNING_LIFECYCLE: Exclude<
  DemoLifecycleState,
  { readonly state: "idle" }
> = {
  state: "running",
  sessionId: "demo-session",
  providerRole: "provider-b",
  activeStage: "reservation_recorded",
  completedStages: COMPLETED_STAGES,
  detail: "Recording the selected provider reservation.",
}

export const COMPLETE_LIFECYCLE: Exclude<
  DemoLifecycleState,
  { readonly state: "idle" }
> = {
  state: "complete",
  sessionId: "demo-session",
  providerRole: "provider-b",
  completedStages: [
    ...COMPLETED_STAGES,
    "reservation_recorded",
    "contracts_signed",
    "verification_passed",
    "cancellation_effective",
    "zero_loss_close_verified",
  ],
  detail: "Demo complete — reservation released, 0 sats moved.",
}

export const LIVE_STATUS: ImmortalRuntimeStatus = {
  state: "live",
  requesterPubkey: "1".repeat(64),
  relayUrl: "ws://127.0.0.1:7777",
  offeringCount: 4,
  restoredSessionCount: 1,
  checkedAt: "2030-01-01T00:00:00.000Z",
}

export const MOCK_PROVENANCE: ImmortalRuntimeProvenance = {
  engine: {
    sourceRevision: "1234567890abcdef1234567890abcdef12345678",
    requesterApiSha256: "2".repeat(64),
    wasmSha256: "3".repeat(64),
    abiVersion: 1,
  },
  relay: {
    url: "ws://127.0.0.1:7777",
    software: "strfry",
    version: "1.0.0",
    contractSha256: "4".repeat(64),
    directBrowserSocket: true,
    snapshotBeforeLive: true,
    nip42Authenticated: true,
  },
  providers: [
    {
      role: "provider-a",
      pubkey: "d".repeat(64),
      offeringCoordinate: "39601:provider-a:reverse",
    },
    {
      role: "provider-b",
      pubkey: "f".repeat(64),
      offeringCoordinate: "39601:provider-b:reverse",
    },
  ],
}

export const UNAVAILABLE_CONFIG: ImmortalConfigResult = {
  state: "unavailable",
  code: "manifest_not_configured",
  detail: "Storybook supplies a deterministic runtime fixture.",
}

export const UNAVAILABLE_FUNDED_CONFIG: FundedRegtestConfigResult = {
  state: "unavailable",
  code: "funded_manifest_not_configured",
  detail: "Start the local funded lab to enable this mode.",
}

const FUNDED_EFFECT: FundedEffectRequest = {
  schema: "openagents.immortal.browser-demo-effect.v1",
  network: FUNDED_REGTEST_NETWORK,
  journey: "submarine",
  sessionId: "5".repeat(64),
  orderId: "6".repeat(64),
  effectId: "7".repeat(64),
  idempotencyDigest: "8".repeat(64),
  method: "broadcast_bitcoin_funding",
  amountSat: 150_000,
}

const FUNDED_JOURNEY: FundedJourney = {
  name: "submarine",
  swapType: "submarine",
  sessionId: FUNDED_EFFECT.sessionId,
  orderId: FUNDED_EFFECT.orderId,
  providerPubkey: "9".repeat(64),
  relayUrl: "ws://127.0.0.1:7777",
  providerStatusClaim: { state: "invoice_created", verified: false },
  requesterVerification: {
    state: "effect_authorized",
    engine: "immortal-client",
    independentRailEvidence: [],
  },
  pendingEffect: FUNDED_EFFECT,
  effectReceipt: null,
  presentation: { settledAllowed: false },
}

export const FUNDED_SESSION: FundedSessionManifest = {
  schema: "openagents.immortal.browser-demo-manifest.v1",
  mode: "unsafe_local_funded_regtest_demo",
  warning: "Storybook fixture — regtest only.",
  network: FUNDED_REGTEST_NETWORK,
  allowedOrigin: "http://127.0.0.1:6006",
  activeJourney: "submarine",
  requesterPubkey: "0".repeat(64),
  journeys: { submarine: FUNDED_JOURNEY },
}

export const READY_FUNDED_RUNTIME: FundedRuntimeState = {
  state: "ready",
  detail: "Review and authorize the exact engine-issued regtest effect.",
  session: FUNDED_SESSION,
}

export const INACTIVE_FUNDED_RUNTIME: FundedRuntimeState = {
  state: "inactive",
  detail: "Funded regtest mode is not selected.",
}
