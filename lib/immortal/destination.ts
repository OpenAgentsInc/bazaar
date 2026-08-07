import { sha256 } from "@noble/hashes/sha256"
import { bech32, bech32m } from "@scure/base"

export const DESTINATION_VALIDATION = {
  schema: "openagents.bazaar.regtest-destination.v1",
  package: "@openagentsinc/mkt-swp-destination",
  sourceRevision: "1cc29d4318",
  parserVersion: 1,
} as const
export const DYNAMIC_PUBLIC_REGTEST_REQUEST_SCHEMA =
  "openagents.immortal.dynamic-public-regtest-request.v1" as const
export const DYNAMIC_PUBLIC_REGTEST_NETWORK =
  "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4" as const

export type DynamicSwapType = "reverse" | "submarine"
export type DestinationKind = "bitcoin_address" | "bolt11_invoice"

export type DestinationFailureCode =
  | "empty"
  | "whitespace"
  | "unsupported"
  | "wrong_kind"
  | "wrong_network"
  | "checksum"
  | "encoding"
  | "malformed"
  | "expired"
  | "amountless"
  | "fractional_sat"
  | "feature_unsupported"

export interface ValidatedRegtestDestination {
  readonly schema: typeof DESTINATION_VALIDATION.schema
  readonly parserPackage: typeof DESTINATION_VALIDATION.package
  readonly parserRevision: typeof DESTINATION_VALIDATION.sourceRevision
  readonly parserVersion: typeof DESTINATION_VALIDATION.parserVersion
  readonly swapType: DynamicSwapType
  readonly kind: DestinationKind
  readonly canonicalValue: string
  readonly commitmentSha256: string
  readonly amountSat: string | null
  readonly paymentHash: string | null
  readonly expiresAt: number | null
}

export type RegtestDestinationResult =
  | { readonly ok: true; readonly destination: ValidatedRegtestDestination }
  | {
      readonly ok: false
      readonly code: DestinationFailureCode
      readonly message: string
    }

const FAILURE_MESSAGES: Readonly<Record<DestinationFailureCode, string>> = {
  empty: "Enter a destination.",
  whitespace: "Remove leading, trailing, or embedded whitespace.",
  unsupported:
    "BOLT12, LNURL, Lightning addresses, and Liquid are not available in this demo.",
  wrong_kind: "This destination does not match the selected swap direction.",
  wrong_network: "Use a Bitcoin regtest destination.",
  checksum:
    "This destination fails its checksum; check that it was copied completely.",
  encoding:
    "This Bitcoin address uses the wrong encoding for its witness version.",
  malformed: "This destination is malformed.",
  expired: "This Lightning invoice has expired.",
  amountless: "Use a BOLT11 invoice with an amount.",
  fractional_sat: "The invoice amount must be a whole number of satoshis.",
  feature_unsupported:
    "This invoice requires a Lightning feature the demo does not support.",
}

const MAXIMUM_DESTINATION_BYTES = 7_090
const SIGNATURE_WORDS = 104
const TIMESTAMP_WORDS = 7
const HASH_WORDS = 52
const DEFAULT_EXPIRY_SECONDS = 3_600
const MSAT_PER_BTC = BigInt(100_000_000_000)
const KNOWN_REQUIRED_FEATURES = new Set([8, 14, 16])

export function validateRegtestDestination(
  value: string,
  swapType: DynamicSwapType,
  nowSeconds = Math.floor(Date.now() / 1_000)
): RegtestDestinationResult {
  if (value.length === 0) return failure("empty")
  if (
    value !== value.trim() ||
    /\s/.test(value) ||
    new TextEncoder().encode(value).byteLength > MAXIMUM_DESTINATION_BYTES
  ) {
    return failure("whitespace")
  }

  const lower = value.toLowerCase()
  if (
    lower.startsWith("lno1") ||
    lower.startsWith("lnurl1") ||
    lower.startsWith("liquidnetwork:") ||
    lower.includes("@")
  ) {
    return failure("unsupported")
  }
  if (swapType === "reverse") return validateAddress(value)
  return validateInvoice(value, nowSeconds)
}

export function destinationRequestKey(
  destination: ValidatedRegtestDestination
): string {
  return [
    destination.parserVersion,
    destination.kind,
    destination.commitmentSha256,
    destination.amountSat ?? "",
    destination.paymentHash ?? "",
    destination.expiresAt ?? "",
  ].join(":")
}

export function assertDestinationMatchesQuote(
  destination: ValidatedRegtestDestination,
  outputAmount: string
): void {
  if (
    destination.kind === "bolt11_invoice" &&
    destination.amountSat !== outputAmount
  ) {
    throw new Error(
      "swp_dynamic_invoice_amount_mismatch: the invoice amount differs from the selected signed Quote output"
    )
  }
}

export function dynamicDestinationWire(
  destination: ValidatedRegtestDestination
): { readonly kind: DestinationKind; readonly value: string } {
  return { kind: destination.kind, value: destination.canonicalValue }
}

export function buildDynamicPublicRegtestRequestJson(input: {
  readonly requestId: string
  readonly inputAmountSat: string
  readonly maximumTotalFeeSat: string
  readonly createdAt: number
  readonly expiresAt: number
  readonly destination: ValidatedRegtestDestination
}): string {
  if (!/^[0-9a-f]{64}$/.test(input.requestId)) {
    throw new Error("swp_dynamic_request_id_invalid")
  }
  const amount = canonicalBoundedDecimal(
    input.inputAmountSat,
    BigInt(10_000),
    BigInt(1_000_000),
    "swp_dynamic_amount_out_of_range"
  )
  const fee = canonicalBoundedDecimal(
    input.maximumTotalFeeSat,
    BigInt(1),
    BigInt(50_000),
    "swp_dynamic_fee_out_of_range"
  )
  if (fee >= amount) throw new Error("swp_dynamic_fee_out_of_range")
  if (
    !Number.isSafeInteger(input.createdAt) ||
    !Number.isSafeInteger(input.expiresAt) ||
    input.createdAt < 0 ||
    input.expiresAt <= input.createdAt ||
    input.expiresAt - input.createdAt > 600
  ) {
    throw new Error("swp_dynamic_request_expired")
  }
  const destination = input.destination
  return [
    `{"schema":${JSON.stringify(DYNAMIC_PUBLIC_REGTEST_REQUEST_SCHEMA)}`,
    `,"request_id":${JSON.stringify(input.requestId)}`,
    `,"network":${JSON.stringify(DYNAMIC_PUBLIC_REGTEST_NETWORK)}`,
    `,"swap_type":${JSON.stringify(destination.swapType)}`,
    `,"input_amount_sat":${input.inputAmountSat}`,
    `,"maximum_total_fee_sat":${input.maximumTotalFeeSat}`,
    `,"created_at":${input.createdAt}`,
    `,"expires_at":${input.expiresAt}`,
    `,"destination":{"kind":${JSON.stringify(destination.kind)},"value":${JSON.stringify(destination.canonicalValue)}}}`,
  ].join("")
}

function validateAddress(value: string): RegtestDestinationResult {
  const lower = normaliseBech32Case(value)
  if (lower === null) return failure("checksum")
  if (lower.startsWith("ln")) return failure("wrong_kind")
  if (!lower.startsWith("bcrt1")) {
    return lower.startsWith("bc1") || lower.startsWith("tb1")
      ? failure("wrong_network")
      : failure("malformed")
  }

  const decodedBech32 = decodeAddress(bech32, lower)
  const decodedBech32m = decodeAddress(bech32m, lower)
  const decoded = decodedBech32 ?? decodedBech32m
  if (!decoded || decoded.prefix !== "bcrt") return failure("checksum")
  const [version, ...programWords] = decoded.words
  if (version === undefined || version > 16) return failure("malformed")
  if ((version === 0 ? decodedBech32 : decodedBech32m) === null) {
    return failure("encoding")
  }
  let program: Uint8Array
  try {
    program = bech32.fromWords(programWords)
  } catch {
    return failure("checksum")
  }
  if (!(
    (version === 0 && (program.length === 20 || program.length === 32)) ||
    (version === 1 && program.length === 32)
  )) {
    return failure("malformed")
  }
  const versionOpcode = version === 0 ? 0 : 0x50 + version
  const script = Uint8Array.from([versionOpcode, program.length, ...program])
  return success({
    swapType: "reverse",
    kind: "bitcoin_address",
    canonicalValue: lower,
    commitmentSha256: hex(sha256(script)),
    amountSat: null,
    paymentHash: null,
    expiresAt: null,
  })
}

function validateInvoice(
  value: string,
  nowSeconds: number
): RegtestDestinationResult {
  const lower = normaliseBech32Case(value)
  if (lower === null) return failure("checksum")
  if (
    lower.startsWith("bcrt1") ||
    lower.startsWith("bc1") ||
    lower.startsWith("tb1")
  ) {
    return failure("wrong_kind")
  }
  if (!lower.startsWith("ln")) return failure("malformed")

  let prefix: string
  let words: readonly number[]
  try {
    const decoded = bech32.decode(lower as `${string}1${string}`, false)
    prefix = decoded.prefix
    words = decoded.words
  } catch {
    return failure("checksum")
  }
  const networkPrefix = ["lnbcrt", "lntbs", "lntb", "lnbc"].find((item) =>
    prefix.startsWith(item)
  )
  if (!networkPrefix) return failure("malformed")
  if (networkPrefix !== "lnbcrt") return failure("wrong_network")
  const amountText = prefix.slice(networkPrefix.length)
  if (amountText === "") return failure("amountless")
  const amountMsat = parseInvoiceAmount(amountText)
  if (amountMsat === null) return failure("malformed")
  if (amountMsat % BigInt(1_000) !== BigInt(0)) return failure("fractional_sat")
  if (words.length < TIMESTAMP_WORDS + SIGNATURE_WORDS) {
    return failure("malformed")
  }

  const timestamp = wordsToNumber(words.slice(0, TIMESTAMP_WORDS))
  const tagged = words.slice(TIMESTAMP_WORDS, words.length - SIGNATURE_WORDS)
  let paymentHash: string | null = null
  let hasDescription = false
  let expiry = DEFAULT_EXPIRY_SECONDS
  let index = 0
  while (index < tagged.length) {
    if (index + 3 > tagged.length) return failure("malformed")
    const type = tagged[index] ?? 0
    const length = (tagged[index + 1] ?? 0) * 32 + (tagged[index + 2] ?? 0)
    const field = tagged.slice(index + 3, index + 3 + length)
    if (field.length !== length) return failure("malformed")
    index += 3 + length
    if (type === 1) {
      const bytes = wordsToBytes(field)
      if (
        paymentHash !== null ||
        field.length !== HASH_WORDS ||
        !bytes ||
        bytes.length !== 32
      ) {
        return failure("malformed")
      }
      paymentHash = hex(bytes)
    } else if (type === 6) {
      expiry = wordsToNumber(field)
    } else if (type === 13 || type === 23) {
      if (hasDescription) return failure("malformed")
      hasDescription = true
    } else if (type === 5 && unsupportedRequiredFeature(field) !== null) {
      return failure("feature_unsupported")
    }
  }
  if (!paymentHash || !hasDescription) return failure("malformed")
  const expiresAt = timestamp + expiry
  if (expiresAt <= nowSeconds) return failure("expired")
  return success({
    swapType: "submarine",
    kind: "bolt11_invoice",
    canonicalValue: lower,
    commitmentSha256: hex(sha256(new TextEncoder().encode(lower))),
    amountSat: (amountMsat / BigInt(1_000)).toString(),
    paymentHash,
    expiresAt,
  })
}

function parseInvoiceAmount(text: string): bigint | null {
  const match = /^([0-9]+)([munp]?)$/.exec(text)
  if (!match || (match[1]!.length > 1 && match[1]!.startsWith("0"))) return null
  const value = BigInt(match[1]!)
  if (value === BigInt(0)) return null
  const divisors: Readonly<Record<string, bigint>> = {
    m: BigInt(1_000),
    u: BigInt(1_000_000),
    n: BigInt(1_000_000_000),
    p: BigInt(1_000_000_000_000),
  }
  const multiplier = match[2] ?? ""
  if (multiplier === "") return value * MSAT_PER_BTC
  const divisor = divisors[multiplier]
  if (!divisor) return null
  const scaled = value * MSAT_PER_BTC
  return scaled % divisor === BigInt(0) ? scaled / divisor : null
}

function canonicalBoundedDecimal(
  value: string,
  minimum: bigint,
  maximum: bigint,
  code: string
): bigint {
  if (!/^[1-9][0-9]*$/.test(value)) throw new Error(code)
  const parsed = BigInt(value)
  if (parsed < minimum || parsed > maximum) throw new Error(code)
  return parsed
}

function unsupportedRequiredFeature(words: readonly number[]): number | null {
  for (let fromRight = 0; fromRight < words.length * 5; fromRight += 1) {
    const word = words[words.length - 1 - Math.floor(fromRight / 5)] ?? 0
    if ((word & (1 << (fromRight % 5))) === 0) continue
    if (fromRight % 2 === 0 && !KNOWN_REQUIRED_FEATURES.has(fromRight)) {
      return fromRight
    }
  }
  return null
}

function decodeAddress(
  codec: typeof bech32 | typeof bech32m,
  value: string
): { readonly prefix: string; readonly words: readonly number[] } | null {
  try {
    const decoded = codec.decode(value as `${string}1${string}`, 90)
    return { prefix: decoded.prefix, words: decoded.words }
  } catch {
    return null
  }
}

function normaliseBech32Case(value: string): string | null {
  return value === value.toLowerCase() || value === value.toUpperCase()
    ? value.toLowerCase()
    : null
}

function wordsToNumber(words: readonly number[]): number {
  let value = 0
  for (const word of words) value = value * 32 + word
  return value
}

function wordsToBytes(words: readonly number[]): Uint8Array | null {
  let accumulator = 0
  let bits = 0
  const bytes: number[] = []
  for (const word of words) {
    accumulator = (accumulator << 5) | word
    bits += 5
    if (bits >= 8) {
      bits -= 8
      bytes.push((accumulator >> bits) & 0xff)
    }
  }
  if (bits > 0 && (accumulator & ((1 << bits) - 1)) !== 0) return null
  return Uint8Array.from(bytes)
}

function success(
  value: Omit<
    ValidatedRegtestDestination,
    "schema" | "parserPackage" | "parserRevision" | "parserVersion"
  >
): RegtestDestinationResult {
  return {
    ok: true,
    destination: {
      schema: DESTINATION_VALIDATION.schema,
      parserPackage: DESTINATION_VALIDATION.package,
      parserRevision: DESTINATION_VALIDATION.sourceRevision,
      parserVersion: DESTINATION_VALIDATION.parserVersion,
      ...value,
    },
  }
}

function failure(code: DestinationFailureCode): RegtestDestinationResult {
  return { ok: false, code, message: FAILURE_MESSAGES[code] }
}

function hex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}
