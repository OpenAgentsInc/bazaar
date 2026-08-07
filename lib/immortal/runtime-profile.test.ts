import assert from "node:assert/strict"
import test from "node:test"

import { publicPreviewPaymentHash } from "./runtime"

test("reverse quote previews rotate their provider hold-invoice hash", () => {
  const templatePaymentHash = "11".repeat(32)
  const firstRequest = "22".repeat(32)
  const secondRequest = "33".repeat(32)

  assert.equal(
    publicPreviewPaymentHash({
      swapType: "reverse",
      destinationPaymentHash: null,
      templatePaymentHash,
      logicalRequestId: firstRequest,
    }),
    firstRequest
  )
  assert.equal(
    publicPreviewPaymentHash({
      swapType: "reverse",
      destinationPaymentHash: null,
      templatePaymentHash,
      logicalRequestId: secondRequest,
    }),
    secondRequest
  )
})

test("invoice-backed and non-reverse previews preserve their committed hash", () => {
  const destinationPaymentHash = "44".repeat(32)
  const templatePaymentHash = "55".repeat(32)
  const logicalRequestId = "66".repeat(32)

  assert.equal(
    publicPreviewPaymentHash({
      swapType: "submarine",
      destinationPaymentHash,
      templatePaymentHash,
      logicalRequestId,
    }),
    destinationPaymentHash
  )
  assert.equal(
    publicPreviewPaymentHash({
      swapType: "chain",
      destinationPaymentHash: null,
      templatePaymentHash,
      logicalRequestId,
    }),
    templatePaymentHash
  )
})
