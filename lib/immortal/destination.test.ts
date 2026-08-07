import assert from "node:assert/strict"
import test from "node:test"

import { bech32m } from "@scure/base"

import {
  DESTINATION_VALIDATION,
  assertDestinationMatchesQuote,
  buildDynamicPublicRegtestRequestJson,
  destinationRequestKey,
  validateRegtestDestination,
} from "./destination"

const ADDRESS =
  "bcrt1pvcpgfdxvvnklep6kdyewn80pphta54nwwrex3ahrvh2uh0e9dgwsalmcu5"
const INVOICE =
  "lnbcrt10u1p489c7rpp5vvxu62txcsekdygj23ythvjmfl6p9fyuwvkm9j9tcxu9sx7hzrwsdq6d9kk6mmjw3skcttxd9u8gatjv5cqzzsxqyjw5qsp5cn6jpj7y8erx4ptq053e3wxsuqmzd2vf89spv0gnqwjyqpffy7lq9qxpqysgq7a3ujjdmarghmnawvwcrn0vcvt2wklkh8lccnp00geuxye5xaj09j2pjg3d0wf6gcvelgrhy23acaa7uu9ra30wfjr3qwswm3yvkc7gp7dllky"

test("pins the OpenAgents parser contract and reproduces Immortal commitments", () => {
  const address = validateRegtestDestination(ADDRESS, "reverse", 0)
  assert.equal(address.ok, true)
  if (!address.ok) return
  assert.equal(address.destination.parserRevision, "1cc29d4318")
  assert.equal(address.destination.parserVersion, 1)
  assert.equal(
    address.destination.commitmentSha256,
    "38e25b5976a3ce8fbd92753c3c7b4287708a3c74fd31a68c03ccac073d6be889"
  )

  const invoice = validateRegtestDestination(INVOICE, "submarine", 0)
  assert.equal(invoice.ok, true)
  if (!invoice.ok) return
  assert.equal(invoice.destination.amountSat, "1000")
  assert.equal(
    invoice.destination.paymentHash,
    "630dcd2966c4336691125448bbb25b4ff412a49c732db2c8abc1b8581bd710dd"
  )
  assert.equal(
    invoice.destination.commitmentSha256,
    "c7599fdb566e606eb7fc4bf29ece8fd764c5cceddc290f6d88c7f0dd2a24377c"
  )
  assert.deepEqual(DESTINATION_VALIDATION, {
    schema: "openagents.bazaar.regtest-destination.v1",
    package: "@openagentsinc/mkt-swp-destination",
    sourceRevision: "1cc29d4318",
    parserVersion: 1,
  })
})

test("wrong network, whitespace, expiry, unsupported forms, and direction fail distinctly", () => {
  assert.equal(
    failureCode(
      validateRegtestDestination(
        "bc1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqqenm",
        "reverse"
      )
    ),
    "wrong_network"
  )
  assert.equal(
    failureCode(validateRegtestDestination(` ${ADDRESS}`, "reverse")),
    "whitespace"
  )
  assert.equal(
    failureCode(
      validateRegtestDestination(INVOICE, "submarine", 1_786_519_107)
    ),
    "expired"
  )
  assert.equal(
    failureCode(
      validateRegtestDestination("lno1qqqqqqqqqqqqqqqq", "submarine")
    ),
    "unsupported"
  )
  assert.equal(
    failureCode(validateRegtestDestination(ADDRESS, "submarine")),
    "wrong_kind"
  )
  assert.equal(
    failureCode(validateRegtestDestination(INVOICE, "reverse", 0)),
    "wrong_kind"
  )
})

test("commitment and selected Quote amount are byte-bound", () => {
  const first = validateRegtestDestination(ADDRESS, "reverse", 0)
  const secondAddress = bech32m.encode(
    "bcrt",
    [1, ...bech32m.toWords(Uint8Array.from({ length: 32 }, (_, i) => i + 1))],
    90
  )
  const second = validateRegtestDestination(secondAddress, "reverse", 0)
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  if (!first.ok || !second.ok) return
  assert.notEqual(
    first.destination.commitmentSha256,
    second.destination.commitmentSha256
  )
  assert.notEqual(
    destinationRequestKey(first.destination),
    destinationRequestKey(second.destination)
  )

  const invoice = validateRegtestDestination(INVOICE, "submarine", 0)
  assert.equal(invoice.ok, true)
  if (!invoice.ok) return
  assert.doesNotThrow(() =>
    assertDestinationMatchesQuote(invoice.destination, "1000")
  )
  assert.throws(
    () => assertDestinationMatchesQuote(invoice.destination, "999"),
    /swp_dynamic_invoice_amount_mismatch/
  )
})

test("dynamic request serialization keeps atomic amounts as canonical decimals", () => {
  const parsed = validateRegtestDestination(ADDRESS, "reverse", 0)
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const json = buildDynamicPublicRegtestRequestJson({
    requestId: "11".repeat(32),
    inputAmountSat: "150000",
    maximumTotalFeeSat: "5000",
    createdAt: 1_700_000_000,
    expiresAt: 1_700_000_300,
    destination: parsed.destination,
  })
  assert.match(json, /"input_amount_sat":150000/)
  assert.match(json, /"maximum_total_fee_sat":5000/)
  assert.doesNotMatch(json, /150000\.0|e\+/i)
  const wire = JSON.parse(json) as Record<string, unknown>
  assert.equal(
    wire.schema,
    "openagents.immortal.dynamic-public-regtest-request.v1"
  )
  assert.deepEqual(wire.destination, {
    kind: "bitcoin_address",
    value: ADDRESS,
  })
  assert.throws(
    () =>
      buildDynamicPublicRegtestRequestJson({
        requestId: "11".repeat(32),
        inputAmountSat: "010000",
        maximumTotalFeeSat: "5000",
        createdAt: 1_700_000_000,
        expiresAt: 1_700_000_300,
        destination: parsed.destination,
      }),
    /swp_dynamic_amount_out_of_range/
  )
})

function failureCode(
  result: ReturnType<typeof validateRegtestDestination>
): string {
  assert.equal(result.ok, false)
  return result.ok ? "unexpected-success" : result.code
}
