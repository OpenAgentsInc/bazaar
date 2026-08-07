import {
  parseJsonRejectingDuplicateMembers,
  type Event,
} from "@openagentsinc/nip-mkt"

import type { ImmortalRequesterSessionView } from "@/vendor/mkt-swp/immortal-browser-abi"
import type { ImmortalDemoConfig } from "./config"
import {
  destinationRequestKey,
  type ValidatedRegtestDestination,
} from "./destination"

const DECIMAL = /^(0|[1-9][0-9]*)$/
const MAIN_REGTEST_CHAIN =
  "swp:1:bip122:00000000000000000000000000000000:btc:chain"
const MAIN_REGTEST_LIGHTNING =
  "swp:1:bip122:00000000000000000000000000000000:btc:lightning"
const LIQUID_ASSET = /^swp:1:[^:]+:elements:[0-9a-f]{64}:liquid$/

export type MarketAssetTicker = "LN" | "BTC" | "LBTC"

export interface MarketAsset {
  readonly id: string
  readonly ticker: MarketAssetTicker
  readonly label: string
  readonly destination: string
}

export interface MarketRoute {
  readonly providerRole: "provider-a" | "provider-b"
  readonly providerPubkey: string
  readonly offeringCoordinate: string
  readonly offeringEventId: string
  readonly relayUrl: string
  readonly inputAsset: MarketAsset
  readonly outputAsset: MarketAsset
  readonly minimum: string
  readonly maximum: string
  readonly advertisedFeeBps: string
  readonly swapType: "submarine" | "reverse" | "chain"
  readonly reservationProofClasses: readonly string[]
  readonly scriptModes: readonly string[]
  readonly confirmationPolicy: {
    readonly minimum_confirmations: string
    readonly reorg_safety_blocks: string
    readonly zero_confirmation: string
    readonly rbf: string
    readonly replacement: string
  }
}

export interface MarketDirection {
  readonly inputAsset: MarketAsset
  readonly outputAsset: MarketAsset
  readonly minimum: string
  readonly maximum: string
  readonly providerCount: number
  readonly routes: readonly MarketRoute[]
  readonly actionable: boolean
  readonly unavailableReason: string | null
}

export interface ImmortalMarketSnapshot {
  readonly assets: readonly MarketAsset[]
  readonly directions: readonly MarketDirection[]
  readonly activeProviderCount: number
  readonly activeOfferingCount: number
}

export interface QuoteRequestInput {
  readonly inputAssetId: string
  readonly outputAssetId: string
  readonly inputAmount: string
  readonly destination: ValidatedRegtestDestination
}

export interface QuoteRequestContext extends QuoteRequestInput {
  readonly logicalRequestId: string
  readonly requestKey: string
  readonly sessionId: string
  readonly rfqId: string
  readonly providerRole: "provider-a" | "provider-b"
  readonly providerPubkey: string
  readonly offeringCoordinate: string
  readonly expiresAt: number
}

export interface ValidatedQuote {
  readonly logicalRequestId: string
  readonly requestKey: string
  readonly sessionId: string
  readonly rfqId: string
  readonly quoteId: string
  readonly providerRole: "provider-a" | "provider-b"
  readonly providerPubkey: string
  readonly quoteClass: string
  readonly reservationClass: string
  readonly reservationProof: string
  readonly reservationExpiresAt: number
  readonly swapType: "submarine" | "reverse" | "chain"
  readonly inputAssetId: string
  readonly outputAssetId: string
  readonly inputAmount: string
  readonly destination: ValidatedRegtestDestination
  readonly outputAmount: string
  readonly providerFee: string
  readonly minerFeeBudget: string
  readonly lightningRoutingFeeBudget: string
  readonly maximumTotalFee: string
  readonly feeBps: string
  readonly amountEquation: string
  readonly rounding: string
  readonly expiresAt: number
  readonly effectiveAcceptanceDeadline: number
}

export type QuoteState =
  | { readonly state: "idle"; readonly detail: string }
  | {
      readonly state: "unavailable"
      readonly requestKey: string
      readonly detail: string
    }
  | {
      readonly state: "requesting"
      readonly logicalRequestId: string
      readonly requestKey: string
      readonly requestedProviderCount: number
      readonly quotes: readonly ValidatedQuote[]
      readonly detail: string
    }
  | {
      readonly state: "ready"
      readonly logicalRequestId: string
      readonly requestKey: string
      readonly requestedProviderCount: number
      readonly quotes: readonly ValidatedQuote[]
      readonly selected: ValidatedQuote
      readonly selectionPolicy: "highest_output_then_lowest_fee_then_provider_key"
    }
  | {
      readonly state: "invalid"
      readonly logicalRequestId: string
      readonly requestKey: string
      readonly detail: string
    }

export const EMPTY_MARKET: ImmortalMarketSnapshot = {
  assets: [],
  directions: [],
  activeProviderCount: 0,
  activeOfferingCount: 0,
}

export const IDLE_QUOTES: QuoteState = {
  state: "idle",
  detail: "Enter an offered amount to request signed quotes.",
}

export function foldMarketHeads(
  events: readonly Event[],
  config: ImmortalDemoConfig
): ImmortalMarketSnapshot {
  const heads = new Map<string, Event>()
  for (const event of events) {
    if (event.kind !== 39_600 && event.kind !== 39_601) continue
    const distinct = tagValue(event.tags, "d")
    if (!distinct) continue
    const key = `${event.kind}:${event.pubkey}:${distinct}`
    const current = heads.get(key)
    if (!current || newerHead(event, current)) heads.set(key, event)
  }

  const activeProfiles = new Set(
    [...heads.values()]
      .filter(
        (event) =>
          event.kind === 39_600 &&
          tagValue(event.tags, "status") === "active" &&
          config.providers.some((provider) => provider.pubkey === event.pubkey)
      )
      .map((event) => `39600:${event.pubkey}:${tagValue(event.tags, "d")}`)
  )
  const routes: MarketRoute[] = []
  let activeOfferingCount = 0

  for (const event of heads.values()) {
    if (event.kind !== 39_601 || tagValue(event.tags, "status") !== "active")
      continue
    const provider = config.providers.find(
      (candidate) => candidate.pubkey === event.pubkey
    )
    if (!provider) continue
    const coordinate = `39601:${event.pubkey}:${tagValue(event.tags, "d")}`
    if (coordinate !== provider.offeringCoordinate) continue
    if (!activeProfiles.has(tagValue(event.tags, "provider"))) continue

    const offering = parseOffering(event)
    activeOfferingCount += 1
    for (const side of offering.sides) {
      const inputAsset = marketAsset(side.inputAssetId)
      const outputAsset = marketAsset(side.outputAssetId)
      if (
        !inputAsset ||
        !outputAsset ||
        inputAsset.ticker === outputAsset.ticker
      )
        continue
      const swapType = swapTypeFor(inputAsset, outputAsset)
      if (!offering.swapTypes.includes(swapType)) continue
      routes.push({
        providerRole: provider.role,
        providerPubkey: provider.pubkey,
        offeringCoordinate: coordinate,
        offeringEventId: event.id,
        relayUrl: provider.relayUrl ?? config.relay.websocketUrl,
        inputAsset,
        outputAsset,
        minimum: side.minimum,
        maximum: side.maximum,
        advertisedFeeBps: side.feeBps,
        swapType,
        reservationProofClasses: offering.reservationProofClasses,
        scriptModes: offering.scriptModes,
        confirmationPolicy: offering.confirmationPolicy,
      })
    }
  }

  const grouped = new Map<string, MarketRoute[]>()
  for (const route of routes) {
    const key = `${route.inputAsset.id}\n${route.outputAsset.id}`
    grouped.set(key, [...(grouped.get(key) ?? []), route])
  }
  const directions = [...grouped.values()]
    .map(buildDirection)
    .sort(directionOrder)
  const assetsByTicker = new Map<MarketAssetTicker, MarketAsset>()
  for (const direction of directions) {
    assetsByTicker.set(direction.inputAsset.ticker, direction.inputAsset)
    assetsByTicker.set(direction.outputAsset.ticker, direction.outputAsset)
  }

  return {
    assets: [...assetsByTicker.values()].sort(
      (left, right) => assetOrder(left.ticker) - assetOrder(right.ticker)
    ),
    directions,
    activeProviderCount: new Set(routes.map((route) => route.providerPubkey))
      .size,
    activeOfferingCount,
  }
}

export function eligibleRoutes(
  market: ImmortalMarketSnapshot,
  input: QuoteRequestInput
): readonly MarketRoute[] {
  if (!DECIMAL.test(input.inputAmount)) return []
  const amount = BigInt(input.inputAmount)
  const direction = market.directions.find(
    (candidate) =>
      candidate.inputAsset.id === input.inputAssetId &&
      candidate.outputAsset.id === input.outputAssetId
  )
  if (!direction) return []
  return direction.routes.filter(
    (route) =>
      amount >= BigInt(route.minimum) && amount <= BigInt(route.maximum)
  )
}

export function quoteRequestKey(input: QuoteRequestInput): string {
  return `${input.inputAssetId}\n${input.outputAssetId}\n${input.inputAmount}\n${destinationRequestKey(input.destination)}`
}

export function validateQuoteView(
  view: ImmortalRequesterSessionView,
  quoteEvent: Event,
  context: QuoteRequestContext,
  now: number
): ValidatedQuote {
  const quote = view.quote
  if (
    view.session_id !== context.sessionId ||
    quote.rfq_id !== context.rfqId ||
    quote.provider_pubkey !== context.providerPubkey ||
    quote.input_asset_id !== context.inputAssetId ||
    quote.output_asset_id !== context.outputAssetId ||
    quote.input_amount !== context.inputAmount
  ) {
    throw new Error(
      "quote_binding_mismatch: the signed Quote changed its RFQ terms"
    )
  }
  if (
    quote.quote_id !== quoteEvent.id ||
    quoteEvent.pubkey !== context.providerPubkey
  ) {
    throw new Error(
      "quote_signer_mismatch: the signed Quote has the wrong provider"
    )
  }
  if (quote.quote_class !== "firm") {
    throw new Error("quote_not_firm: only firm Quotes can be selected")
  }
  if (!quote.expires_at || now >= quote.effective_acceptance_deadline) {
    throw new Error("quote_expired: the signed Quote is no longer actionable")
  }
  if (
    quote.effective_acceptance_deadline > quote.expires_at ||
    quote.expires_at > context.expiresAt
  ) {
    throw new Error("quote_expiry_mismatch: the Quote exceeds its RFQ lifetime")
  }

  const input = decimalBigInt(quote.input_amount, "input amount")
  const output = decimalBigInt(quote.output_amount, "output amount")
  const providerFee = decimalBigInt(quote.fees.provider_fee, "provider fee")
  const minerFee = decimalBigInt(quote.fees.miner_fee_budget, "miner fee")
  const lightningFee = decimalBigInt(
    quote.fees.lightning_routing_fee_budget,
    "Lightning routing fee"
  )
  const maximumFee = decimalBigInt(
    quote.fees.maximum_total_fee,
    "maximum total fee"
  )
  const feeBps = decimalBigInt(quote.fees.fee_bps, "fee rate")
  if (
    ![
      "input_minus_provider_and_quoted_fees",
      "one_to_one_less_quoted_fees",
    ].includes(quote.amount_equation) ||
    quote.rounding !== "floor_output_sats" ||
    output + providerFee + minerFee + lightningFee !== input ||
    providerFee !== (input * feeBps) / BigInt(10_000) ||
    maximumFee !== providerFee + minerFee + lightningFee
  ) {
    throw new Error(
      "quote_amount_invalid: signed Quote arithmetic does not reproduce"
    )
  }

  const reservation = parseReservation(quoteEvent)
  if (
    !["soft", "hard"].includes(quote.reservation_class) ||
    reservation.expiresAt < quote.effective_acceptance_deadline ||
    reservation.reservedAmount !== quote.output_amount
  ) {
    throw new Error(
      "quote_reservation_invalid: reservation evidence is incomplete"
    )
  }

  return {
    logicalRequestId: context.logicalRequestId,
    requestKey: context.requestKey,
    sessionId: context.sessionId,
    rfqId: context.rfqId,
    quoteId: quote.quote_id,
    providerRole: context.providerRole,
    providerPubkey: quote.provider_pubkey,
    quoteClass: quote.quote_class,
    reservationClass: quote.reservation_class,
    reservationProof: reservation.proofRef,
    reservationExpiresAt: reservation.expiresAt,
    swapType: quote.swap_type,
    inputAssetId: quote.input_asset_id,
    outputAssetId: quote.output_asset_id,
    inputAmount: quote.input_amount,
    destination: context.destination,
    outputAmount: quote.output_amount,
    providerFee: quote.fees.provider_fee,
    minerFeeBudget: quote.fees.miner_fee_budget,
    lightningRoutingFeeBudget: quote.fees.lightning_routing_fee_budget,
    maximumTotalFee: quote.fees.maximum_total_fee,
    feeBps: quote.fees.fee_bps,
    amountEquation: quote.amount_equation,
    rounding: quote.rounding,
    expiresAt: quote.expires_at,
    effectiveAcceptanceDeadline: quote.effective_acceptance_deadline,
  }
}

export function selectBestQuote(
  quotes: readonly ValidatedQuote[],
  now: number
): ValidatedQuote | null {
  return (
    quotes
      .filter((quote) => now < quote.effectiveAcceptanceDeadline)
      .toSorted((left, right) => {
        const output = compareBigInt(
          BigInt(right.outputAmount),
          BigInt(left.outputAmount)
        )
        if (output !== 0) return output
        const fee = compareBigInt(
          BigInt(left.maximumTotalFee),
          BigInt(right.maximumTotalFee)
        )
        if (fee !== 0) return fee
        return left.providerPubkey.localeCompare(right.providerPubkey)
      })[0] ?? null
  )
}

export function findDirection(
  market: ImmortalMarketSnapshot,
  inputAssetId: string,
  outputAssetId: string
): MarketDirection | null {
  return (
    market.directions.find(
      (direction) =>
        direction.inputAsset.id === inputAssetId &&
        direction.outputAsset.id === outputAssetId
    ) ?? null
  )
}

export function formatAtomicAmount(value: string): string {
  if (!DECIMAL.test(value)) return "—"
  return BigInt(value).toLocaleString("en-US")
}

function parseOffering(event: Event): {
  readonly swapTypes: readonly ("submarine" | "reverse" | "chain")[]
  readonly sides: readonly {
    readonly inputAssetId: string
    readonly outputAssetId: string
    readonly minimum: string
    readonly maximum: string
    readonly feeBps: string
  }[]
  readonly reservationProofClasses: readonly string[]
  readonly scriptModes: readonly string[]
  readonly confirmationPolicy: MarketRoute["confirmationPolicy"]
} {
  const content = record(
    parseJsonRejectingDuplicateMembers(event.content),
    "Offering"
  )
  const profile = record(content.mkt_swp, "MKT-SWP Offering")
  const swapTypes = stringArray(profile.swap_types, "swap types").filter(
    (value): value is "submarine" | "reverse" | "chain" =>
      value === "submarine" || value === "reverse" || value === "chain"
  )
  const sides = array(profile.sides, "Offering sides").map((value) => {
    const side = record(value, "Offering side")
    const minimum = decimal(side.min, "Offering minimum")
    const maximum = decimal(side.max, "Offering maximum")
    if (BigInt(minimum) > BigInt(maximum)) {
      throw new Error("offering_amount_invalid: minimum exceeds maximum")
    }
    return {
      inputAssetId: boundedString(side.input_asset_id, "input asset"),
      outputAssetId: boundedString(side.output_asset_id, "output asset"),
      minimum,
      maximum,
      feeBps: decimal(side.fee_bps, "advertised fee rate"),
    }
  })
  return {
    swapTypes,
    sides,
    reservationProofClasses: stringArray(
      profile.reservation_proof_classes,
      "reservation proof classes"
    ),
    scriptModes: stringArray(profile.script_modes, "script modes"),
    confirmationPolicy: parseConfirmationPolicy(profile.confirmation_policies),
  }
}

function parseConfirmationPolicy(
  value: unknown
): MarketRoute["confirmationPolicy"] {
  const policies = array(value, "confirmation policies")
  const policy = record(policies[0], "confirmation policy")
  return {
    minimum_confirmations: decimal(
      policy.minimum_confirmations,
      "minimum confirmations"
    ),
    reorg_safety_blocks: decimal(policy.reorg_safety_blocks, "reorg safety"),
    zero_confirmation: boundedString(
      policy.zero_confirmation,
      "zero-confirmation policy"
    ),
    rbf: boundedString(policy.rbf, "RBF policy"),
    replacement: boundedString(policy.replacement, "replacement policy"),
  }
}

function parseReservation(event: Event): {
  readonly proofRef: string
  readonly expiresAt: number
  readonly reservedAmount: string
} {
  const content = record(
    parseJsonRejectingDuplicateMembers(event.content),
    "Quote"
  )
  const profile = record(content.mkt_swp, "MKT-SWP Quote")
  const reservation = record(profile.reservation_terms, "Quote reservation")
  const expiresAt = reservation.reservation_expires_at
  if (!Number.isSafeInteger(expiresAt) || (expiresAt as number) < 0) {
    throw new Error("quote_reservation_invalid: reservation expiry is invalid")
  }
  return {
    proofRef: boundedString(reservation.proof_ref, "reservation proof"),
    expiresAt: expiresAt as number,
    reservedAmount: decimal(reservation.reserved_amount, "reserved amount"),
  }
}

function buildDirection(routes: readonly MarketRoute[]): MarketDirection {
  const ordered = routes.toSorted((left, right) =>
    left.providerPubkey.localeCompare(right.providerPubkey)
  )
  const minimum = ordered.reduce(
    (value, route) =>
      BigInt(route.minimum) > value ? BigInt(route.minimum) : value,
    BigInt(0)
  )
  const maximum = ordered.reduce(
    (value, route) =>
      BigInt(route.maximum) < value ? BigInt(route.maximum) : value,
    BigInt(ordered[0]!.maximum)
  )
  const providerCount = new Set(ordered.map((route) => route.providerPubkey))
    .size
  const hasCompetitiveRange = minimum <= maximum
  return {
    inputAsset: ordered[0]!.inputAsset,
    outputAsset: ordered[0]!.outputAsset,
    minimum: minimum.toString(),
    maximum: maximum.toString(),
    providerCount,
    routes: ordered,
    actionable: providerCount >= 2 && hasCompetitiveRange,
    unavailableReason:
      providerCount < 2
        ? "Two active providers are required for a competitive quote."
        : hasCompetitiveRange
          ? null
          : "Active providers do not share an amount range.",
  }
}

function marketAsset(assetId: string): MarketAsset | null {
  if (assetId === MAIN_REGTEST_LIGHTNING) {
    return {
      id: assetId,
      ticker: "LN",
      label: "Lightning",
      destination: "Lightning invoice or Lightning address",
    }
  }
  if (assetId === MAIN_REGTEST_CHAIN) {
    return {
      id: assetId,
      ticker: "BTC",
      label: "Bitcoin",
      destination: "Bitcoin address",
    }
  }
  if (LIQUID_ASSET.test(assetId)) {
    return {
      id: assetId,
      ticker: "LBTC",
      label: "Liquid BTC",
      destination: "Liquid address",
    }
  }
  return null
}

function swapTypeFor(
  input: MarketAsset,
  output: MarketAsset
): "submarine" | "reverse" | "chain" {
  if (input.ticker === "LN") return "reverse"
  if (output.ticker === "LN") return "submarine"
  return "chain"
}

function newerHead(candidate: Event, current: Event): boolean {
  return (
    candidate.created_at > current.created_at ||
    (candidate.created_at === current.created_at && candidate.id < current.id)
  )
}

function directionOrder(left: MarketDirection, right: MarketDirection): number {
  const leftDefault =
    left.inputAsset.ticker === "LN" && left.outputAsset.ticker === "BTC"
  const rightDefault =
    right.inputAsset.ticker === "LN" && right.outputAsset.ticker === "BTC"
  if (leftDefault !== rightDefault) return leftDefault ? -1 : 1
  return `${left.inputAsset.ticker}:${left.outputAsset.ticker}`.localeCompare(
    `${right.inputAsset.ticker}:${right.outputAsset.ticker}`
  )
}

function assetOrder(ticker: MarketAssetTicker): number {
  return { LN: 0, BTC: 1, LBTC: 2 }[ticker]
}

function tagValue(tags: readonly (readonly string[])[], name: string): string {
  const matches = tags.filter((tag) => tag.length === 2 && tag[0] === name)
  return matches.length === 1 ? (matches[0]?.[1] ?? "") : ""
}

function decimal(value: unknown, label: string): string {
  if (typeof value !== "string" || !DECIMAL.test(value)) {
    throw new Error(`market_decimal_invalid: ${label} is not canonical`)
  }
  return value
}

function decimalBigInt(value: string, label: string): bigint {
  return BigInt(decimal(value, label))
}

function boundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    throw new Error(`market_string_invalid: ${label} is invalid`)
  }
  return value
}

function stringArray(value: unknown, label: string): readonly string[] {
  return array(value, label).map((item) => boundedString(item, label))
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value) || value.length > 256) {
    throw new Error(`market_array_invalid: ${label} is invalid`)
  }
  return value
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`market_object_invalid: ${label} is invalid`)
  }
  return value as Record<string, unknown>
}

function compareBigInt(left: bigint, right: bigint): number {
  return left < right ? -1 : left > right ? 1 : 0
}
