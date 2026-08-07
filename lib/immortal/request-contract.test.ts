import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import test from "node:test"

import {
  parseImmortalDemoRequestContract,
  selectImmortalDemoRequestTemplate,
} from "./request-contract"
import type { ValidatedRegtestDestination } from "./destination"

const destination: ValidatedRegtestDestination = {
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
}

const fixturePath = new URL(
  "../../tests/fixtures/no-spend-manifest.json",
  import.meta.url
)

async function fixtureContract(): Promise<unknown> {
  const manifest = JSON.parse(await readFile(fixturePath, "utf8")) as {
    request_contract: unknown
  }
  return manifest.request_contract
}

test("parses the closed public no-spend request contract", async () => {
  const contract = parseImmortalDemoRequestContract(await fixtureContract())
  assert.deepEqual(
    contract.templates.map((template) => template.swapType),
    ["submarine", "reverse", "chain"]
  )
  assert.equal(contract.templates[1].inputAmount, "1000")
  assert.equal(contract.templates[1].invoiceSha256, null)
  assert.deepEqual(contract.templates[2].requesterPublicKeys, [
    {
      legId: "destination",
      path: "claim",
      publicKey:
        "33def30752282502724206c0e18eebed01b436a81cc6ed8b0476f4aaee151ce4",
    },
    {
      legId: "source",
      path: "refund",
      publicKey:
        "716022efaca232dd8a7927619a9e5f1eb8f1c8b87436a52a03ae7e1239a1662a",
    },
  ])
})

test("selects a route template while the live Offering controls amount", async () => {
  const contract = parseImmortalDemoRequestContract(await fixtureContract())
  const reverse = contract.templates[1]
  const selected = selectImmortalDemoRequestTemplate(
    contract,
    {
      swapType: "reverse",
      inputAsset: { id: reverse.inputAssetId },
      outputAsset: { id: reverse.outputAssetId },
    },
    {
      inputAssetId: reverse.inputAssetId,
      outputAssetId: reverse.outputAssetId,
      inputAmount: "1000",
      destination,
    }
  )
  assert.equal(selected, reverse)
  assert.equal(
    selectImmortalDemoRequestTemplate(
      contract,
      {
        swapType: "reverse",
        inputAsset: { id: reverse.inputAssetId },
        outputAsset: { id: reverse.outputAssetId },
      },
      {
        inputAssetId: reverse.inputAssetId,
        outputAssetId: reverse.outputAssetId,
        inputAmount: "1001",
        destination,
      }
    ),
    reverse
  )
})

test("rejects unknown, malformed, reordered, and secret-bearing members", async () => {
  const source = await fixtureContract()
  const unknown = structuredClone(source) as Record<string, unknown>
  unknown.private_key = "11".repeat(32)
  assert.throws(() => parseImmortalDemoRequestContract(unknown), /unknown/)

  const malformed = structuredClone(source) as {
    templates: { input_amount: string }[]
  }
  malformed.templates[0].input_amount = "0100000"
  assert.throws(
    () => parseImmortalDemoRequestContract(malformed),
    /canonical decimal/
  )

  const reordered = structuredClone(source) as { templates: unknown[] }
  reordered.templates.reverse()
  assert.throws(
    () => parseImmortalDemoRequestContract(reordered),
    /template order/
  )

  const nestedSecret = structuredClone(source) as {
    templates: { requester_public_keys: Record<string, unknown>[] }[]
  }
  nestedSecret.templates[0].requester_public_keys[0].private_key = "22".repeat(
    32
  )
  assert.throws(() => parseImmortalDemoRequestContract(nestedSecret), /unknown/)
})
