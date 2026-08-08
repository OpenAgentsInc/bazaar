# Live Network Map, Open Onboarding, and the Immortal MCP Surface

Status: implemented and live (public regtest acceptance recorded 2026-08-08)
Companion spec: `docs/network-visualization-spec.md` (the viz system this
builds on — all six catalogs are implemented and live in Storybook under
`Immortal Viz`, including the birds-eye `ImmortalNetworkPanorama`).
Upstream program: immortal#40 / immortal#44 (persistent public regtest
service) and bazaar#6 / bazaar#10 (public deployment + remote acceptance).
The program is live; everything here layers on top of it without weakening
its fail-closed boundaries.

## 1. Goal

Two things, on the live production site (regtest mode):

1. **One map.** A single birds-eye view of the currently connected network —
   every relay, provider, and rail the deployment can see, with live health,
   activity pulses, swap counts, volume, and operator fees — so anyone gets
   the power of the whole network at a glance.
2. **One command to join.** A human or agent can spin up a new provider (or
   relay) node, join the public regtest network, appear on that map, and
   start quoting — with instructions that fit on one screen, an MCP server
   that automates every step, and agent skills that teach any MCP-capable
   agent to do it unattended.

## 2. What already exists (do not rebuild)

From the public-regtest program (immortal#41–#44, bazaar#7–#10):

- A persistent multi-node GCE topology: two peered bitcoind regtest nodes,
  two provider CLN nodes, a sandbox wallet node, two `immortal` relays with
  isolated Postgres, two independently keyed `immortal-provider` daemons.
- A signed launch contract (`docs/public-regtest-manifest.md`): kind 27237
  envelope pinning revisions, relays, exactly two provider keys, gateway
  digests, and origin. The browser fails closed on anything unpinned.
- Direct browser transport: NIP-11 identity checks, NIP-42 auth,
  snapshot-before-live, NIP-59 delivery validation, per-lane reconnect.
- A capability-scoped effect gateway (no credentials, no general RPC).
- The full viz system in `components/viz/` with fixtures-driven Storybook
  catalogs, including `ImmortalNetworkPanorama` which already renders
  exactly the map we want — from a static `PanoramaNetwork` object.

The gap is therefore narrow and well-defined: **feed the panorama live
data, publish a join path, and wrap both in an MCP surface.**

## 3. The live network map

### 3.1 Data sources (all public-safe, mostly browser-side)

The browser is already the protocol host; the map should be built the same
way — no server-side network crawler, no new trusted aggregator.

| Datum                                         | Source                                                                 | Exists today                                  |
| --------------------------------------------- | ---------------------------------------------------------------------- | --------------------------------------------- |
| Pinned relays, providers, gateway, revisions  | signed launch manifest                                                 | yes                                           |
| Relay identity, software, version, extensions | NIP-11 over HTTPS                                                      | yes                                           |
| Socket state per relay lane                   | `RelayConnectionState` in the runtime                                  | yes                                           |
| Provider liveness + profile                   | kind 39600 replaceable heads                                           | yes                                           |
| Offerings: pairs, min/max, fee bps, status    | kind 39601 heads                                                       | yes                                           |
| Completed-swap counts and redacted volume     | kind 39603 public market receipts (consent-gated)                      | protocol yes; needs aggregation in the client |
| Relay-observed rail evidence                  | kind 1985 NIP-32 observation labels                                    | yes                                           |
| Gateway health                                | public health endpoint                                                 | yes (gateway)                                 |
| Lightning channel edges                       | not publicly enumerable — render only what the manifest/receipts imply | design constraint                             |

Aggregating 39603 receipts client-side over a bounded window (e.g. the
relay's retained heads) yields swaps/24h, volume/24h, and — since receipts
carry fee terms — an honest operator-fee estimate. Where retention is too
short, the gateway may expose a tiny public-safe stats JSON (counts only,
no sessions, no counterparties); that is the only optional server addition.

### 3.2 Trust tiers on the map

The signed manifest is the trust boundary for _swapping_; it must not
become a cap on _seeing_. The map renders two tiers:

- **Pinned** — relays/providers in the current manifest: full color, full
  interaction, "verified" badge derived from the envelope.
- **Discovered** — any additional provider publishing valid 39600/39601 on
  a connected relay, and any relay a discovered provider lists in its
  profile: rendered dimmed with an explicit `unpinned` tag. Visible, never
  routable from the swap card until pinned.

This is what makes onboarding legible: a newly joined node appears on the
public map within one relay snapshot, before any operator action.

### 3.3 Composition

New route `app/network/page.tsx` (linked from the swap card's runtime
disclosure and directly reachable):

- **Hero:** `ImmortalNetworkPanorama` fed by a new
  `usePanoramaNetwork()` hook that folds manifest + NIP-11 + 39600/39601 +
  39603 aggregates + socket states into the existing `PanoramaNetwork`
  shape. Activity level derives from observed event rates. REGTEST badge
  always visible; HUD shows swaps/volume/fees with an explicit "regtest
  sats — not real value" footnote.
- **Drill-down:** selecting a relay or provider swaps in the custody-model
  `ImmortalNetworkTopologyScene` and the market instruments (offering
  cards, evidence rungs, timeout ladder) scoped to that node.
- **Own session overlay:** when the visitor has an active swap, its
  gift-wrap route lights on the panorama (reusing the swap-flow chip
  layer) — "that pulse is you."
- **Join panel:** a persistent "Run a node" card with the §4 one-command
  instructions and a link to the MCP/skill path.

Storybook lands with the same milestone (`Immortal Viz/Network Map`):
live-shaped fixtures for pinned+discovered tiers, degraded states, and the
map page composition, using the same mocked-hook pattern as
`use-immortal-runtime`.

## 4. Joining the network

### 4.1 Provider join kit (owned by immortal)

A single compose bundle + wrapper script in the immortal repo
(`deploy/join/`), reusing the exact images/config the public topology runs:

```sh
git clone https://github.com/OpenAgentsInc/immortal && cd immortal
./scripts/join-regtest.sh provider \
  --relays wss://relay-a.34-41-78-122.nip.io,wss://relay-b.34-41-78-122.sslip.io \
  --addnode 34.41.78.122:18444 \
  --gateway https://gateway.34-41-78-122.sslip.io \
  --state-dir ~/.local/share/immortal-public-regtest/provider
```

The script must:

1. Start bitcoind (regtest) and peer it with the P2P-only public endpoint
   `34.41.78.122:18444`; verify chain tip matches the public network. Bitcoin
   RPC at port 18443 remains closed.
2. Start CLN, open a bounded channel to the sandbox wallet node once
   funded.
3. Generate a fresh provider identity (never reuse demo keys), start
   `immortal-provider` with its own Postgres.
4. Request regtest funding from the **faucet capability** (§4.3).
5. Publish kind 39600 + a bounded 39601 offering to the public relays.
6. Print a health summary and the map URL where the node is now visible
   (discovered tier).

`join-regtest.sh relay` does the analogous relay bring-up (relay +
Postgres + NIP-11 with the `nip-mkt`/`mkt-swp:1` extensions) and prints the
`curl -H "Accept: application/nostr+json"` self-check.

### 4.2 Listing (discovered → pinned)

Pinning stays a signed, human decision — the manifest is the product's
trust root. The join kit ends by printing a "request listing" line that
opens a prefilled immortal issue containing the provider pubkey, offering
coordinate, NIP-11 URL, and health output. Operator re-signs the manifest;
the node moves tiers on the next manifest refresh (≤300 s). No automation
ever signs the envelope.

### 4.3 Faucet capability (owned by immortal, new)

Nothing like this exists yet. Add a rate-limited, capability-scoped
`faucet` endpoint to the public-regtest gateway: bounded regtest coins to a
provided regtest address, per-IP and per-address budgets, same fail-closed
network checks as every other gateway effect. This is the one genuinely
new server surface required for permissionless join.

## 5. MCP surface

### 5.1 Where it lives and what shape it takes

- **Server: `@openagentsinc/immortal-mcp`, hosted in the bazaar repo**
  (`packages/immortal-mcp/`), TypeScript over stdio using the official MCP
  SDK. Rationale: bazaar already owns the TS protocol client
  (`lib/immortal/*` — manifest verification, transport, market fold,
  request contract), so `network_status`/`get_quotes` are imports, not
  reimplementations. The immortal repo's binding dependency allowlist and
  one-binary rule make it the wrong home for a Node MCP server; immortal
  contributes the join kit CLI that the server shells out to.
- **Client wiring — omega:** omega already ships a production MCP client
  (`crates/context_server`, stdio + HTTP + OAuth). Exposure is pure
  config, no omega code change:

  ```json
  {
    "context_servers": {
      "immortal": { "command": "bunx", "args": ["@openagentsinc/immortal-mcp"] }
    }
  }
  ```

  Tool IDs surface as `mcp:immortal:<tool>` for omega's per-profile
  allow/deny. (Omega also has a dormant Rust `McpServer`/`McpServerTool`
  in `crates/context_server/src/listener.rs` — a fine future in-process
  path, but it currently binds only a Unix socket; not the first target.)

- **Client wiring — probe:** probe (now TS/Effect) has no MCP client; its
  `ProbeLlmTool` descriptor maps 1:1 onto MCP tools and its
  `tool-menu.ts` ref/policy model is where `tool.immortal.*` entries slot
  in with `allow | approval_required | deny`. That is a probe follow-up,
  not a blocker.

### 5.2 Tools (v1)

Read-only (`allow` by default):

| Tool             | Does                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `network_status` | Verified manifest + NIP-11 + discovery snapshot → the `PanoramaNetwork` JSON (same shape the map renders) |
| `list_offerings` | Live 39601 heads with min/max/fee/status per provider                                                     |
| `get_quotes`     | Run the published no-spend RFQ contract; return competing signed quotes + selection policy result         |
| `node_health`    | Local join-kit node status (compose ps + provider health snapshot)                                        |

Effectful (`approval_required` by default):

| Tool              | Does                                                                             |
| ----------------- | -------------------------------------------------------------------------------- |
| `spin_up_node`    | Run `join-regtest.sh provider\|relay` locally (docker required); stream progress |
| `join_network`    | Publish 39600/39601 for a healthy local provider to the public relays            |
| `faucet_fund`     | Call the gateway faucet capability for a local regtest address                   |
| `request_listing` | Open the prefilled pin-request issue (§4.2)                                      |

Hard boundaries, stated in every tool description: regtest only; the
server never holds provider seeds (it drives the local daemon, which owns
its own keys); no mainnet identifiers pass any argument validation; no
tool can alter or sign the launch manifest.

### 5.3 Agent skills

One skill, two dialects of the same content:

- `.agents/skills/join-immortal-network/SKILL.md` — omega's format (YAML
  `name`/`description` frontmatter + Markdown), checked into both repos'
  worktrees so omega threads pick it up as a project skill.
- `.claude/skills/join-immortal-network/SKILL.md` — same body for Claude
  Code.

The skill teaches: check `network_status` → `spin_up_node` → wait on
`node_health` → `faucet_fund` → `join_network` → verify the node appears
in `network_status` (discovered tier) → optionally `request_listing`.
A second thin skill, `read-the-network-map`, covers interpretation only
(tiers, health glyphs, what the HUD numbers mean).

The live acceptance joined a fresh provider in 56 seconds, including P2P
sync, two paid faucet requests, provider health, signed discovery publication,
and rendering as a ready unpinned provider on production `/network`. See the
Immortal conformance record
`docs/conformance/records/2026-08-08-public-regtest-p2p-join.json`.

## 6. Work breakdown

Filed as issues; sequencing after the current program (immortal#44,
bazaar#7–#10) closes:

1. **immortal — provider/relay join kit + faucet capability** (§4.1, §4.3):
   compose bundle, `join-regtest.sh`, gateway faucet, listing-request
   template, `docs/join-regtest.md`.
2. **bazaar — live network map page** (§3): `usePanoramaNetwork()` fold,
   39603 aggregation, discovered-tier rendering in the panorama
   (`trust: "pinned" | "discovered"` on nodes), `/network` route,
   drill-down + own-session overlay, Storybook catalog, remote E2E
   assertion added to the bazaar#10 acceptance run.
3. **bazaar — `@openagentsinc/immortal-mcp` + skills** (§5): package,
   eight v1 tools, omega `context_servers` snippet + probe tool-menu note
   in the README, both SKILL.md dialects, a scripted MCP conformance check
   in CI.
4. **epic** tying 1–3 to the production regtest release, with the
   demo-day acceptance: a fresh machine with only docker + an MCP-capable
   agent joins the network and appears on the public map in under ten
   minutes, unattended.

## 7. Open questions (deliberately deferred)

- Gateway stats JSON vs pure client-side 39603 aggregation — decide after
  measuring public relay retention.
- Channel-graph rendering beyond manifest-implied edges — providers could
  opt into publishing channel hints in 39600 profiles; protocol change,
  needs an immortal NIP note.
- Mainnet posture — everything here is regtest-labeled; nothing in this
  plan may be reused for mainnet without a separate hardening pass.
