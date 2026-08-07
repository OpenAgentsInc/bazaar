import type {
  ImmortalDemoRequestContract,
  ImmortalDemoRequesterPublicKey,
  ImmortalDemoRequestTemplate,
  ImmortalDemoSwapType,
} from "./config"
import type { QuoteRequestInput } from "./market"

const DECIMAL = /^(0|[1-9][0-9]*)$/
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const SWAP_TYPES = ["submarine", "reverse", "chain"] as const

export class RequestContractError extends Error {}

export function parseImmortalDemoRequestContract(
  value: unknown
): ImmortalDemoRequestContract {
  const contract = object(value, "request contract")
  exactKeys(contract, ["schema", "templates"])
  requireEqual(
    contract.schema,
    "openagents.immortal.no-spend-request-contract.v1",
    "request contract schema"
  )
  const values = array(contract.templates, "request templates")
  if (values.length !== SWAP_TYPES.length) {
    fail("request contract must publish exactly three templates")
  }
  const templates = values.map((entry, index) =>
    parseTemplate(entry, SWAP_TYPES[index])
  )
  const routeKeys = templates.map(templateKey)
  if (new Set(routeKeys).size !== routeKeys.length) {
    fail("request contract templates must identify distinct requests")
  }
  return {
    schema: "openagents.immortal.no-spend-request-contract.v1",
    templates: templates as [
      ImmortalDemoRequestTemplate,
      ImmortalDemoRequestTemplate,
      ImmortalDemoRequestTemplate,
    ],
  }
}

export function selectImmortalDemoRequestTemplate(
  contract: ImmortalDemoRequestContract,
  route: {
    readonly swapType: ImmortalDemoSwapType
    readonly inputAsset: { readonly id: string }
    readonly outputAsset: { readonly id: string }
  },
  input: QuoteRequestInput
): ImmortalDemoRequestTemplate {
  const matches = contract.templates.filter(
    (template) =>
      template.swapType === route.swapType &&
      template.inputAssetId === route.inputAsset.id &&
      template.outputAssetId === route.outputAsset.id &&
      template.inputAssetId === input.inputAssetId &&
      template.outputAssetId === input.outputAssetId &&
      template.inputAmount === input.inputAmount
  )
  if (matches.length !== 1) {
    fail("no unique no-spend request template matches this route and amount")
  }
  return matches[0]
}

function parseTemplate(
  value: unknown,
  expectedSwapType: ImmortalDemoSwapType | undefined
): ImmortalDemoRequestTemplate {
  const template = object(value, "request template")
  exactKeys(template, [
    "swap_type",
    "input_asset_id",
    "output_asset_id",
    "input_amount",
    "payment_hash",
    "invoice_sha256",
    "requester_public_keys",
  ])
  requireEqual(template.swap_type, expectedSwapType, "request template order")
  const swapType = template.swap_type as ImmortalDemoSwapType
  const inputAssetId = boundedString(template.input_asset_id, "input asset ID")
  const outputAssetId = boundedString(
    template.output_asset_id,
    "output asset ID"
  )
  if (inputAssetId === outputAssetId) {
    fail("request template asset pair must contain distinct assets")
  }
  const inputAmount = boundedString(template.input_amount, "input amount")
  if (!DECIMAL.test(inputAmount) || inputAmount === "0") {
    fail("request template input amount must be a positive canonical decimal")
  }
  const paymentHash = lowerHex32(template.payment_hash, "payment hash")
  const invoiceSha256 =
    template.invoice_sha256 === null
      ? null
      : lowerHex32(template.invoice_sha256, "invoice digest")
  const requesterPublicKeys = array(
    template.requester_public_keys,
    "requester public keys"
  ).map(parseRequesterPublicKey)
  if (requesterPublicKeys.length === 0 || requesterPublicKeys.length > 2) {
    fail("request template must publish one or two requester public keys")
  }
  const keyIdentities = requesterPublicKeys.map(requesterPublicKeyIdentity)
  if (
    new Set(keyIdentities).size !== keyIdentities.length ||
    keyIdentities.some(
      (identity, index) => index > 0 && identity <= keyIdentities[index - 1]
    )
  ) {
    fail("requester public keys must be unique and canonically ordered")
  }
  requireSwapShape(
    swapType,
    inputAssetId,
    outputAssetId,
    invoiceSha256,
    requesterPublicKeys
  )
  return {
    swapType,
    inputAssetId,
    outputAssetId,
    inputAmount,
    paymentHash,
    invoiceSha256,
    requesterPublicKeys,
  }
}

function parseRequesterPublicKey(
  value: unknown
): ImmortalDemoRequesterPublicKey {
  const key = object(value, "requester public key")
  exactKeys(key, ["leg_id", "path", "public_key"])
  return {
    legId: boundedString(key.leg_id, "requester key leg"),
    path: boundedString(key.path, "requester key path"),
    publicKey: lowerHex32(key.public_key, "requester public key"),
  }
}

function requireSwapShape(
  swapType: ImmortalDemoSwapType,
  inputAssetId: string,
  outputAssetId: string,
  invoiceSha256: string | null,
  keys: readonly ImmortalDemoRequesterPublicKey[]
): void {
  const shapes = keys.map(({ legId, path }) => `${legId}:${path}`)
  if (swapType === "submarine") {
    if (
      !inputAssetId.endsWith(":chain") ||
      !outputAssetId.endsWith(":lightning") ||
      invoiceSha256 === null ||
      shapes.length !== 1 ||
      shapes[0] !== "source:refund"
    ) {
      fail("submarine request template has incompatible public constraints")
    }
    return
  }
  if (swapType === "reverse") {
    if (
      !inputAssetId.endsWith(":lightning") ||
      !outputAssetId.endsWith(":chain") ||
      invoiceSha256 !== null ||
      shapes.length !== 1 ||
      shapes[0] !== "destination:claim"
    ) {
      fail("reverse request template has incompatible public constraints")
    }
    return
  }
  if (
    !inputAssetId.endsWith(":chain") ||
    !outputAssetId.endsWith(":chain") ||
    invoiceSha256 !== null ||
    shapes.length !== 2 ||
    shapes[0] !== "destination:claim" ||
    shapes[1] !== "source:refund"
  ) {
    fail("chain request template has incompatible public constraints")
  }
}

function requesterPublicKeyIdentity(
  key: ImmortalDemoRequesterPublicKey
): string {
  return `${key.legId}\n${key.path}\n${key.publicKey}`
}

function templateKey(template: ImmortalDemoRequestTemplate): string {
  return `${template.swapType}\n${template.inputAssetId}\n${template.outputAssetId}\n${template.inputAmount}`
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`)
  }
  return value as Record<string, unknown>
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`)
  return value
}

function boundedString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2_048) {
    fail(`${label} must be a bounded string`)
  }
  return value
}

function lowerHex32(value: unknown, label: string): string {
  const parsed = boundedString(value, label)
  if (!LOWER_HEX_32.test(parsed)) fail(`${label} must be 32-byte lowercase hex`)
  return parsed
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): void {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index])
  ) {
    fail("request contract contains missing or unknown members")
  }
}

function requireEqual(actual: unknown, expected: unknown, label: string): void {
  if (actual !== expected) fail(`${label} is incompatible`)
}

function fail(message: string): never {
  throw new RequestContractError(message)
}
