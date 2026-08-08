#!/usr/bin/env node

import { readFile } from "node:fs/promises"

const path = process.argv[2]
if (!path) throw new Error("usage: scan-public-regtest-receipt.mjs RECEIPT")
const raw = await readFile(path, "utf8")
const forbidden = [
  /ImmortalRegtest\s+[0-9a-f]{64}/i,
  /\b(?:bcrt1|lnbcrt)[0-9a-z]+\b/i,
  /"(?:capability|destination|invoice|private_key|secret|seed|mnemonic|preimage|macaroon|credential|password|raw_transaction|transaction_hex)"\s*:/i,
]
for (const pattern of forbidden) {
  if (pattern.test(raw))
    throw new Error(`receipt failed secret scan: ${pattern}`)
}
const receipt = JSON.parse(raw)
if (
  ![
    "openagents.bazaar.public-regtest-acceptance.v1",
    "openagents.bazaar.public-regtest-qualification.v1",
  ].includes(receipt.schema)
) {
  throw new Error("unexpected public-regtest receipt schema")
}
process.stdout.write("public-regtest receipt secret scan: passed\n")
