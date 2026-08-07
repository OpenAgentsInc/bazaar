# Dynamic regtest input binding

Bazaar accepts exactly two funded public-regtest destination shapes:

- reverse Lightning-to-Bitcoin requests use a checksum-valid `bcrt1` SegWit
  address;
- submarine Bitcoin-to-Lightning requests use an amount-bearing, unexpired
  `lnbcrt` BOLT11 invoice whose amount is a whole number of satoshis.

BOLT12, LNURL, Lightning addresses, Liquid, mainnet, testnet, and signet are
explicitly unavailable. Leading, trailing, or embedded whitespace is refused
instead of silently normalized.

## Parser and engine authority

The UI validation contract is pinned to the framework-neutral
`@openagentsinc/mkt-swp-destination` source introduced by OpenAgents commit
`1cc29d4318`. The package is not published and its git package still contains a
workspace-only `catalog:` dependency, so Bazaar carries the regtest address and
BOLT11 projection with the package name, source revision, and parser version in
every persisted binding. This layer is only an early UX refusal.

Immortal remains funding authority. The committed zero-import WASM is rebuilt
from Immortal `1fb8f30d218c4e8e7d0e29dc4cd2e8d4900d60a8`, which includes #43's
destination-commitment verification. The ABI version, operation inventory, and
requester API digest did not change.

## Binding chain

The canonical destination is projected to the same commitment Immortal uses:

- reverse: SHA-256 of the decoded destination scriptPubKey;
- submarine: SHA-256 of the canonical lowercase invoice bytes, plus the parsed
  payment hash, amount, and expiry.

The destination commitment is part of Bazaar's quote request key and the signed
RFQ constraints. A submarine RFQ also carries the canonical invoice,
`invoice_sha256`, and payment hash. Immortal requires the selected Quote terms
to reproduce the commitment, and its existing Order, bilateral Contract, exit
package, funding-request, and verify-before-fund checks carry that signed RFQ
context forward. Changing the amount or destination increments the request
generation, clears the selected Quote, and requires new provider signatures.
Changing an ordered session is never supported.

Each provider candidate is persisted with the canonical input, commitment,
parser package revision, and parser version next to the engine snapshot. No
preimage, key, seed, macaroon, wallet descriptor, or node endpoint is stored.

## Amount rules

The form derives its actionable interval from the overlap of the currently
verified Offerings. Amounts and every Quote/fee term remain canonical decimal
strings and are compared with `BigInt`; no JavaScript floating-point arithmetic
is used. The Immortal dynamic public-regtest request has the additional closed
10,000–1,000,000 sat and 1–50,000 sat fee bounds. Its JSON serializer inserts
already-validated canonical decimal tokens directly into the wire document.

For a submarine swap, the amount-bearing invoice must equal the selected signed
Quote output. A mismatch makes that Quote non-actionable and funding remains
disabled.

## Verification

`lib/immortal/destination.test.ts` uses Immortal's public dynamic fixture vectors
to reproduce both commitment digests and the invoice payment hash. It covers
wrong networks, whitespace, expiry, unsupported types, direction mismatch,
amount mismatch, commitment mutation, and canonical numeric serialization.
`lib/immortal/store.test.ts` proves reload preserves the exact canonical input
and parser version.
