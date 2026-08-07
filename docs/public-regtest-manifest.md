# Signed public-regtest launch contract

Bazaar's public mode is a separate, fail-closed launch profile. It does not
weaken the local no-spend or unsafe loopback-funded profiles. The browser can
connect only to authorities in a current manifest signed by the deployment
key and simultaneously allowed by the deployment environment.

## Trust roots and source

Configure these server-only values at deployment time:

```text
BAZAAR_PUBLIC_REGTEST_SIGNING_PUBKEY=<64-lower-hex Nostr public key>
BAZAAR_PUBLIC_REGTEST_SOURCE_REVISION=<40-lower-hex Bazaar revision>
BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION=<40-lower-hex Immortal service revision>
BAZAAR_PUBLIC_REGTEST_ORIGIN=https://bazaar.example.org
BAZAAR_PUBLIC_REGTEST_ALLOWED_HOSTS=config.example.org,gateway.example.org,relay-a.example.org,relay-b.example.org
```

The host list must be lowercase, sorted, distinct DNS names. IP literals,
credentials, ports, queries, fragments, plaintext HTTP/WS, and paths are
refused. Configure exactly one manifest source:

```text
BAZAAR_PUBLIC_REGTEST_MANIFEST=<complete signed envelope JSON>
```

or:

```text
BAZAAR_PUBLIC_REGTEST_MANIFEST_URL=https://config.example.org/bazaar-public-regtest.json
```

The URL is never selected by a request parameter. HTTPS fetches reject
redirects, time out after five seconds, stream no more than 64 KiB, and require
JSON content. A verified value refreshes at its signed interval (10–300
seconds). If refresh fails, the same process may use that exact verified value
for at most five minutes and never beyond its signed expiry.

## Signed envelope

The closed envelope schema is
`openagents.bazaar.public-regtest-envelope.v1`. Its Nostr event is kind 27237,
is authored by the deployment-pinned key, and signs the recursively
key-sorted canonical JSON of the launch manifest. The event has exactly these
tags:

```text
d          bazaar-public-regtest
expiration <manifest expires_at>
network    bip122:0f9188f13cb7b2c9e5c72a6b65eeada4
origin     <exact Bazaar HTTPS origin>
```

The launch binds the Bazaar and Immortal revisions; requester API, WASM,
byte-length and ABI pins; gateway and service contract digests; one or two
relay contract identities; exactly two provider keys and Offering
coordinates; exact origin; and service bounds. Unknown or duplicate JSON
members fail before any WebSocket or gateway request. Maintenance is a signed
state and cannot be injected by an unsigned response.

## Browser network boundary

Next 16 `proxy.ts` produces a per-request nonce CSP. `connect-src` contains
only `'self'`, the verified gateway HTTPS authority, each direct relay WSS
authority, and each relay's HTTPS NIP-11 authority. There is no Bazaar relay or
swap proxy. Relay connection still requires NIP-11 Immortal identity, NIP-42,
both public/private EOSE snapshots, NIP-59 delivery validation, and then live
events. A two-relay manifest is attempted in signed order; reconnect rotates
deterministically while retaining the same browser identity and reopening
snapshots before live delivery.

Run `pnpm test` for signature, expiry, duplicate/unknown member, digest,
network, origin, hostile URL, bounded fetch/LKG, CSP, NIP-11, authentication,
snapshot, and failover coverage. `pnpm build` proves the nonce proxy and App
Router production bundle together.
