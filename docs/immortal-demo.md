# Immortal browser demo integration

Bazaar runs the Immortal MKT-SWP requester engine inside the browser. Next.js
serves the pinned static artifact and a public, strictly parsed launcher
manifest; it does not expose a swap API or proxy relay traffic.

## Run against the local Immortal topology

In a checkout of `OpenAgentsInc/immortal` at or after `8368fa90`, start the
two-provider no-spend topology:

```sh
scripts/dev-no-spend-demo.sh
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

## Custody and persistence policy

- The demo requester key is generated and retained only in browser IndexedDB.
  It is marked `local_demo_identity_only_never_fund_or_reuse`.
- The signer remains outside the WASM engine. The engine produces a signing
  request; the browser signs it and asks the engine to verify the exact result.
- Sessions store exact signed event bytes, NIP-59 delivery provenance, engine
  snapshots/views, the selected provider route, and digest-bound external
  effect requests/results.
- Writes are serialized per session. Replays with identical bytes are
  idempotent; changed bytes under an existing event or effect ID fail closed.
- Private keys, preimages, seeds, macaroons, and equivalent settlement secrets
  are refused by the session store and are never serialized into server props.

## Pinned inputs

The WASM artifact is built from Immortal revision
`d62a4f7c6c34a11d191fe78316fd8d4ce4da1d34`. Its byte length, SHA-256,
zero-import authority, ABI version, exported functions, requester API digest,
and source revision are checked by `pnpm verify:immortal-artifact` and again in
the browser before instantiation. The committed artifact is built with Rust
1.95.0 through `scripts/build-immortal-artifact.sh`; the script remaps source,
toolchain, and registry paths so local workstation paths do not enter the
public binary.

The framework-neutral TypeScript boundary is vendored from OpenAgents commit
`9843df74c3577a8ba1a326692ec69011bf1d0931`. The generated NIP-MKT SDK is
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
validation, exact store restore, concurrent replay, effect idempotency, and
secret-material refusal.
