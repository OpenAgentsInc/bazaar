---
name: join-immortal-network
description: Join the Immortal public regtest swap network unattended using the @openagentsinc/immortal-mcp tools — inspect the network, spin up a local provider or relay, verify health, fund it from the faucet, confirm it appears on the map, and request listing. Regtest only; docker required locally.
---

# Join the Immortal public regtest network

You have the `immortal` MCP server (`@openagentsinc/immortal-mcp`) available.
Its eight tools take a fresh machine from "nothing" to "visible on the public
network map" without you ever touching keys or the launch manifest.

Hard boundaries (these hold for every step below):

- **Regtest only.** Everything runs on the public regtest chain
  (`bip122:0f9188f13cb7b2c9e5c72a6b65eeada4`). Sats here have no real value.
- **No seeds.** The MCP server never holds provider seeds. The local join-kit
  daemon generates and owns its own keys.
- **Mainnet fails closed.** Mainnet addresses (`bc1…`, `1…`, `3…`), `lnbc`
  invoices, and the mainnet chain id fail argument validation.
- **The manifest is untouchable.** No tool can alter or sign the launch
  manifest. Pinning is a signed human operator decision.

## The flow

### 1. `network_status` — see the network before joining

Call `network_status` with the manifest URL (the site origin +
`/bazaar-public-regtest.json`, or set `IMMORTAL_MANIFEST_URL`). You get the
structure-checked manifest (signing pubkey + sha256 digest reported honestly —
the trust root is pinned by the browser, not by this server), each relay's
NIP-11 identity and reachability, and every provider currently publishing
39600/39601 heads, split into `pinned` (in the manifest) and `discovered`
(valid but unpinned).

Note the relay websocket URLs and the `manifest.gatewayBaseUrl` — later steps
need them.

### 2. `spin_up_node` — bring up the local node (approval required)

Call `spin_up_node` with `role: "provider"` (or `"relay"`), passing the relay
URLs from step 1 and the gateway URL. This runs the immortal join kit
(`scripts/join-regtest.sh` in the checkout at `IMMORTAL_DIR`, default
`~/work/immortal`); docker is required. The script starts bitcoind/CLN/
`immortal-provider` with a fresh identity and publishes kind 39600 + 39601 on
start. Expect several minutes; the tool streams progress and returns the last
200 output lines with a 15-minute bound.

If the tool reports `join_script_not_found`, the join kit (immortal#45) is not
in the local immortal checkout yet — clone/update
`https://github.com/OpenAgentsInc/immortal` and retry. Do not improvise a
bring-up path.

### 3. `node_health` — wait until the stack is healthy

Poll `node_health` (it reads `docker compose ps` plus the kit's
health/ownership JSON in the join directory). Proceed when the compose
services are up and the health summary looks sane. Keep the health JSON — you
need it in step 6.

### 4. `faucet_fund` — fund the node with regtest coins (approval required)

Get the node's funding address from the health output (it must start with
`bcrt1`), then call `faucet_fund` with the gateway URL, the address, and a
bounded amount. The tool validates the `bcrt1` prefix client-side before any
network call and polls the faucet status URL up to 60 seconds for `paid`.

### 5. Verify the node appears — `network_status` again

Re-run `network_status`. Your provider should now appear in `providers` with
`trust: "discovered"` — visible on the public map, dimmed, tagged unpinned,
not yet routable from the swap card. That is correct and expected: discovery
is automatic, trust is not.

About `join_network`: publishing happens inside the join script's provider
start, so you normally never call it. If a restart of the publish step is
needed, call `join_network`; if the installed script has no discrete publish
entrypoint it returns typed guidance pointing back at `spin_up_node`.

### 6. `request_listing` — ask a human to pin you (approval required)

Call `request_listing` with the provider pubkey, offering coordinate
(`39601:<pubkey>:<d>`), the relay's NIP-11 URL, and the health JSON from
step 3. It returns a prefilled GitHub new-issue URL for
`OpenAgentsInc/immortal` — it does not open a browser or create the issue.
Give the URL to the user. An operator re-signs the manifest and the node moves
to the pinned tier on the next manifest refresh (within ~300 s).

## Failure posture

Every tool returns typed JSON errors (`join_script_not_found`,
`faucet_unavailable`, `manifest_unavailable`, …). Report them honestly and
stop at the failing step; never fabricate network state, quotes, or funding.
`get_quotes` is a deliberate v1 stub (`not_implemented`) — quoting runs in the
verified browser engine, not in this server.
