# Vendored NIP-MKT SDK

This package is vendored from `OpenAgentsInc/openagents` commit
`7a8a5ac8860bf755e2ca80a40a2386ef51d817ca`.

The registry package was not published when this integration landed. Keeping
the reviewed source in this repository makes the production build reproducible
without a mutable cross-repository checkout. Replace this directory with the
published package after `@openagentsinc/nip-mkt` has a registry release.

Vendored relative imports use extensionless specifiers so Next.js 16.2
Turbopack resolves the adjacent raw TypeScript sources. The upstream NodeNext
source uses equivalent `.js` specifiers. This is a module-resolution-only
adaptation.

`dist/index.js` is a browser ESM bundle generated from that source with
esbuild 0.28.1. Only `effect` remains external so Bazaar and the SDK share one
Effect runtime; the exact pinned `nostr-effect` source is compiled into the
bundle. Rebuild it with `pnpm build:nip-mkt`.

The package index additionally re-exports the four Nostr signing/verification
primitives and their event types that Bazaar already receives through that
bundle. This avoids loading the upstream raw-TypeScript package as a second
browser module.

Bazaar also replaces the OpenAgents workspace-only `catalog:` dependency
markers with the exact versions used by that source commit. No generated
contract, validation, state, or transport code is changed.
