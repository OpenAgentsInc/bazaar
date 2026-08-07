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
events. A two-relay manifest opens both authenticated sockets concurrently,
merges their validated replaceable public heads, and maps each ordered provider
to the corresponding ordered relay. Private RFQs, recovery copies, and later
session records stay on that provider's relay lane. A disconnected lane
reconnects independently with the same browser identity and reopens both
snapshots before the full two-provider market is marked live.
Public Offering routes and generated RFQs use the exact signed regtest asset
namespace `bip122:0f9188f13cb7b2c9e5c72a6b65eeada4`; the all-zero local
no-spend fixture namespace is never projected into public mode.

## Capability-scoped funded sessions

When the signed launch is live, `Public · Regtest` is the default card mode.
After the browser requester identity is ready, Bazaar creates one isolated
gateway session and retains its 256-bit capability only in `sessionStorage`.
The capability is sent only in the `Authorization: ImmortalRegtest …` header;
it is never placed in a URL, query string, request body, rendered status,
analytics, or error text. Reload in the same tab restores the exact session,
while another tab receives a distinct capability.

The gateway signing key is independently pinned as `gateway.signing_pubkey` in
the deployment-signed launch. Bazaar verifies every kind-27236 session manifest
against that key, canonical JSON content, exact origin, session, network,
Immortal revision, requester ABI, provider set, quotas, and operation inventory.
The browser submits the locally validated canonical destination and amount once
to `POST /v1/public-regtest/sessions/{id}/requests`. The signed public projection
contains only a destination commitment and safe journey evidence; the private
destination is not echoed into the card.

For the public demo, the user may ask the isolated requester worker to allocate
one destination through `POST /v1/public-regtest/sessions/{id}/inputs`. Reverse
swaps receive a fresh requester `bcrt1` address; submarine swaps receive a fresh
amount-bearing `lnbcrt` invoice. The response is bound to that session,
direction, amount, and expiry. It is idempotent for an exact retry and fails
closed if any bound value changes. The capability remains confined to the
authorization header.

Immortal's requester worker obtains two funded Quotes, selects deterministically,
releases the loser, and exposes only its exact authorized Bitcoin-broadcast or
Lightning-payment effect. Bazaar replays that exact effect to the capability
endpoint and never receives wallet credentials or node authority. Provider
Status remains explicitly labeled an unverified counterparty claim. The card
shows completion only after the signed journey reports loser release plus
independent requester-verified Bitcoin and Lightning rail evidence.

`lib/immortal/public-session.test.ts` covers signer/content mutation and ensures
the capability remains confined to tab storage and the authorization header.
Remote HTTPS/WSS, reload/recovery, multi-browser isolation, concurrency, and
fault acceptance remain deployment gates rather than claims made by unit tests.

Run `pnpm test` for signature, expiry, duplicate/unknown member, digest,
network, origin, hostile URL, bounded fetch/LKG, CSP, NIP-11, authentication,
snapshot, provider-specific concurrent relay routing, capability confinement,
gateway-manifest binding, and failover coverage. `pnpm build` proves the nonce
proxy and App Router production bundle together.

## Production release and operation

The current public deployment uses these exact authorities:

```text
https://bazaar.openagents.com
https://gateway.34-41-78-122.sslip.io
wss://relay-a.34-41-78-122.nip.io
wss://relay-b.34-41-78-122.sslip.io
```

The gateway host exposes only TCP 443. Bitcoin RPC/P2P, Lightning RPC, relay
backends, Postgres, wallet workers, and mining controls remain on the private
Docker network. `deploy/public-regtest/Caddyfile` is the reviewed public TLS and
origin boundary installed on the service host.

Create a launch signing secret in an operator secret manager, then generate the
short-lived envelope without printing the secret:

```sh
BAZAAR_PUBLIC_REGTEST_SIGNING_SECRET='<64 lower hex>' \
  node scripts/create-public-regtest-launch-manifest.mjs \
  --output /secure/path/public-regtest-envelope.json \
  --bazaar-revision '<deployed Bazaar commit>' \
  --immortal-revision '<deployed Immortal commit>'
```

Configure the production deployment with the signer printed by that command,
the exact two revisions, exact origin, sorted allowed hosts, and the complete
envelope as `BAZAAR_PUBLIC_REGTEST_MANIFEST`. Never configure the signing secret
in Vercel. Deploy only after `/readyz` is true and the manifest validates against
the intended build. Preview origins are intentionally excluded and therefore
cannot obtain a capability.

Rotate the envelope before its 24-hour signed expiry. A rotation keeps the same
signing key and revisions, creates a new envelope, updates only
`BAZAAR_PUBLIC_REGTEST_MANIFEST`, and redeploys. Rotate the signing key by
updating the signer and envelope together in one deployment. The old deployment
continues to recover its already admitted gateway sessions; the new launch
controls only new browser admission.

For an emergency stop, first make gateway readiness false, then remove the
production manifest and redeploy. This prevents new sessions while the gateway
retains bounded status/recovery for admitted sessions. Do not destroy service
state as a shutdown mechanism.

For rollback, restore the previous compatible Vercel deployment together with
its exact manifest, Bazaar revision, Immortal revision, and WASM pins. Never pair
an old app with a new manifest. Verify `/readyz`, CSP, and both relays before
promoting. Revision or contract drift fails closed before funding.

Run the external release gate from a machine outside the service network:

```sh
BAZAAR_PUBLIC_REGTEST_BAZAAR_REVISION='<deployed Bazaar commit>' \
BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION='<deployed Immortal commit>' \
  pnpm test:public-regtest
```

It completes reverse and submarine funded journeys, reloads an admitted
session, proves new-session and second-tab isolation, checks browser network
authorities, and writes a versioned public-safe receipt. The receipt scanner
rejects capabilities, destinations, invoices, custody fields, and raw
transactions. Bazaar deliberately has no analytics SDK; browser state and the
acceptance receipt are the only client-side operational records.
