# Immortal browser demo integration

Bazaar runs the Immortal MKT-SWP requester engine inside the browser. Next.js
serves the pinned static artifact and a public, strictly parsed launcher
manifest; it does not expose a swap API or proxy relay traffic.

## Run against the local Immortal topology

In a checkout of `OpenAgentsInc/immortal` at or after `8368fa90`, start the
two-provider no-spend topology:

```sh
scripts/dev-no-spend-demo.sh run
```

The launcher prints the absolute public manifest path. In Bazaar, use that
path when starting Next.js:

```sh
IMMORTAL_DEMO_MANIFEST=/absolute/path/to/immortal-no-spend-demo-state/manifest.json pnpm dev
```

Open the gear disclosure to inspect the typed connection state and public-safe
engine, direct-relay, NIP-42, and provider provenance. The browser connects to
the manifest's loopback WebSocket itself, waits for both public and private
EOSE snapshots, and only then enters the live state.

Stop the topology with Ctrl-C in its terminal. Its launcher removes only its
owned state directory. The topology is regtest coordination-only and declares
zero external spend effects.

## Live market and Quote policy

The card folds the latest signed `39600` Provider Profiles and `39601`
Offerings after the relay's public EOSE boundary. A direction is actionable
only when two configured active providers advertise an overlapping atomic-unit
range and the pinned requester supports the rail. Pausing or replacing an
Offering changes that fold immediately; an icon alone never enables a rail.
Amounts and fees remain canonical decimal strings and `BigInt` throughout the
browser. No floating-point value becomes an execution term.

After an entered amount settles for 450 milliseconds, Bazaar creates one
provider-bound session per eligible route and sends each provider the exact
public RFQ constraints selected from the launcher's closed request contract.
Every returned Quote must pass NIP-59 delivery validation, Immortal's requester
session validation, RFQ/provider/asset/amount bindings, expiry, exact amount
and fee arithmetic, and reservation disclosure checks. Bazaar selects the
highest output, then the lowest maximum total fee, then the lexicographically
lowest provider key. The disclosure shows both signed rows and their expiry;
an expired selection is removed and refreshed rather than silently repriced.

## Custody and persistence policy

- The demo requester key is generated and retained only in browser IndexedDB.
  It is marked `local_demo_identity_only_never_fund_or_reuse`.
- The signer remains outside the WASM engine. The engine produces a signing
  request; the browser signs it and asks the engine to verify the exact result.
- Sessions store exact signed event bytes, NIP-59 delivery provenance, engine
  snapshots/views, the selected provider route, and digest-bound external
  effect requests/results.
- Both counterparty and sender-recovery NIP-59 copies remain durable evidence.
  The engine receives one deterministic delivery input per signed record, so
  transport redundancy cannot become duplicate protocol evidence.
- Writes are serialized per session. Each accepted record and the engine
  snapshot that validates it commit in one IndexedDB write, so a reload cannot
  retain evidence ahead of its snapshot. Replays with identical bytes are
  idempotent; changed bytes under an existing event or effect ID fail closed.
- Private keys, preimages, seeds, macaroons, and equivalent settlement secrets
  are refused by the session store and are never serialized into server props.

## No-spend lifecycle

`Create Swap` locks the selected engine-verified Quote; Bazaar never silently
reprices the active session. The same card then advances through the exact
signed chain:

```text
RFQ → Quote → Order → requester Contract → provider Contract → Status
    → Cancel request → Cancel accepted → Cancel effective → Close
```

Requester Order, Contract, and Cancel records are constructed by the pinned
Immortal engine, signed by the local demo identity, verified by that same
engine, and delivered as independent counterparty and sender-recovery NIP-59
copies. MKT-SWP's `39610` Contract kind and `cancel-request`/`cancel-accept`
causal markers are explicit profile capabilities at the generic NIP-MKT
boundary; all other extension kinds and reference markers remain refused.

The terminal UI appears only when the canonical provider Close reports
`cancelled`, zero external spend effects, `loss_classification: none`, exact
zero loss fields, and the full signed reservation release. Immortal must also
report a contiguous, fork-free contract view with funding unauthorized and a
complete matching terminal loss projection. Bazaar's local external-effect
store must remain empty. This no-spend path deliberately does not claim funded
watchtower verification or settlement.

Relay reconnects replay the authenticated snapshot before live events. An
active session is restored from IndexedDB after reload, requester records are
republished idempotently while waiting for a provider, and a restarted
provider resumes from its own durable state. Invalid signatures, Contract
changes, expired Quotes, Status gaps/forks, conflicting records, malformed
terminal accounting, and provider timeouts become explicit retryable errors;
none can advance the primary action.

## Pinned inputs

The WASM artifact is built from Immortal revision
`1fb8f30d218c4e8e7d0e29dc4cd2e8d4900d60a8`. Its byte length, SHA-256,
zero-import authority, ABI version, exported functions, requester API digest,
and source revision are checked by `pnpm verify:immortal-artifact` and again in
the browser before instantiation. The committed artifact is built with Rust
1.95.0 through `scripts/build-immortal-artifact.sh`; the script remaps source,
toolchain, and registry paths so local workstation paths do not enter the
public binary.

Dynamic destination and amount rules, parser provenance, and the signed
input-to-effect binding are documented in
[`dynamic-regtest-inputs.md`](dynamic-regtest-inputs.md).

The framework-neutral TypeScript boundary is based on OpenAgents commit
`9843df74c3577a8ba1a326692ec69011bf1d0931` and compatibility-updated for the
newer qualified Immortal artifact; exact hashes and the revision distinction
are recorded in `vendor/mkt-swp/PROVENANCE.md`. The generated NIP-MKT SDK is
vendored from OpenAgents commit `7a8a5ac8860bf755e2ca80a40a2386ef51d817ca`
and compiled into a browser ESM bundle with `pnpm build:nip-mkt`.

## Verification

```sh
pnpm check
pnpm test:browser
```

The browser test can target a real already-running topology instead of its
contract-compatible local relay fixture:

```sh
IMMORTAL_DEMO_MANIFEST=/absolute/path/to/manifest.json pnpm test:browser
```

Unit coverage includes contract mismatch refusal, NIP-42 authentication,
snapshot-before-live EOSE behavior, both NIP-59 delivery copies, real WASM
validation, atomic record/snapshot restore, exact no-spend terminal projection,
settlement-overclaim refusal, concurrent replay, effect idempotency, and
secret-material refusal. The real-topology browser suite restarts the selected
provider and reloads at durable phases before requiring all eight milestones,
the exact terminal copy, and a stable terminal reload.

## Optional funded-regtest mode

The gear menu always starts in `Demo · No-spend`. `Regtest · Funded` appears
only when the Next.js process receives a current, strictly parsed launch file
through `IMMORTAL_FUNDED_DEMO_MANIFEST`. The launch file must pin this
checkout's Immortal source, requester API, WASM, browser ABI, and funded
adapter contract digests. Its adapter and browser origins must be exact
numeric IPv4 loopback HTTP origins; it expires within one hour. Bazaar refuses
mainnet, LAN or public hosts, `localhost`, credentials, paths, unknown fields,
stale files, changed digests, and incompatible ABI versions before enabling
the control.

This mode talks from the browser directly to Immortal's development-only
funded adapter. The adapter has no node credentials and exposes no wallet RPC.
For each submarine BTC→LN and reverse LN→BTC journey, Bazaar can POST only the
exact bounded effect already authorized by `immortal-client`: its session,
Order, effect and idempotency IDs, closed rail method, regtest network, and
amount. Reload and reconnect retries submit the same bytes. Immortal's durable
receipt returns identically, including after adapter replacement, while any
changed field fails closed before another payment or broadcast.

The card deliberately separates two claims:

- **Provider Status** is the signed counterparty claim and is always marked
  unverified by Bazaar.
- **Local rails** become verified only when the Immortal requester reports
  both its local Bitcoin transaction evidence and Lightning payment hash.

The evidence disclosure contains only public keys, session and Order IDs,
effect receipt identifiers and digests, Bitcoin txids, and Lightning payment
hashes. It never receives invoices, raw transactions, keys, seeds, preimages,
macaroons, credentials, or node endpoints. The UI does not present a provider
claim as locally verified completion.

### Run the real disposable demo

Docker Desktop or a compatible Compose runtime must be running. The repeatable
acceptance command provisions Immortal's disposable Bitcoin Core, Lightning,
relay, provider, and Postgres topology; starts its loopback browser adapter;
drives both funded journeys in Chrome; checks exact receipt replay and page
reload recovery; then writes a public-safe receipt and tears down only the
owned topology:

```sh
IMMORTAL_REPO=~/work/immortal pnpm test:funded
```

The receipt is written to `target/funded-regtest-receipt.json` by default. Set
`BAZAAR_FUNDED_RECEIPT` to choose another output path. The companion Immortal
gate `scripts/test-browser-demo-funded.sh` additionally replaces the real
adapter process mid-run and proves its prior receipt is returned exactly after
restart. Neither command is a production or mainnet configuration.

The loopback-only mode is separate from the signed `Public · Regtest` profile.
The public profile uses a short-lived gateway capability and Immortal's
isolated requester worker; see
[`public-regtest-manifest.md`](public-regtest-manifest.md). It does not expose
local node credentials or treat provider Status as settlement proof.
