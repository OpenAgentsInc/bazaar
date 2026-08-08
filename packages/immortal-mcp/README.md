# @openagentsinc/immortal-mcp

MCP stdio server for the **Immortal public regtest swap network**: inspect the
live network, spin up a local provider or relay with the immortal join kit,
fund it from the gateway faucet, and prepare a listing (pin) request — from
any MCP-capable agent (omega, Claude Code, probe, …).

Plan of record: `docs/network-map-and-onboarding.md` §5 (bazaar#17).
Sibling: the immortal join kit (immortal#45) that the effectful tools shell
out to.

## Hard boundaries

Stated in every tool description and enforced in argument validation:

- **Regtest only.** All tools operate exclusively on the public regtest chain
  (`bip122:0f9188f13cb7b2c9e5c72a6b65eeada4`). Regtest sats have no real
  value.
- **Never holds provider seeds.** The server drives the local join-kit
  daemon; the daemon generates and owns its own keys. No key material ever
  passes through a tool argument or result.
- **Mainnet identifiers fail validation.** `bc1…`/`tb1…` bech32 addresses,
  legacy `1…`/`3…` addresses, `lnbc` invoices (non-`lnbcrt`), and the mainnet
  chain id are rejected client-side before any network effect.
- **Cannot alter or sign the launch manifest.** The manifest is the product's
  trust root; pinning stays a signed human operator decision.
  `request_listing` only constructs an issue URL.

## Tools (v1)

Read-only (`readOnlyHint: true` — hosts may default-allow):

| Tool             | Does                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `network_status` | Fetches + structure-checks the manifest envelope (reports signing pubkey and canonical sha256; see verification depth below), fetches each relay's NIP-11, takes one bounded EOSE-terminated 39600/39601 snapshot per relay, and returns PanoramaNetwork-shaped JSON with `pinned` vs `discovered` providers. Stats are `null` where unknown. |
| `list_offerings` | Bounded 39601 head snapshot per given relay → normalized offerings: pairs, min/max, fee bps, status, provider pubkey.                                                                                                                                                                                                                         |
| `get_quotes`     | Loads the pinned Immortal requester WASM, discovers two eligible providers, opens authenticated relay lanes, sends separate NIP-59 RFQs, validates returned signed Quotes through the requester engine, and selects deterministically. The requester identity is ephemeral and the tool cannot order or spend.                                |
| `node_health`    | Local join-kit status: `docker compose ps --format json` in the join dir (`IMMORTAL_JOIN_DIR`, default `~/work/immortal/deploy/join`) + the kit's health/ownership JSON, or a clear `join_kit_not_found`.                                                                                                                                     |

Effectful (`readOnlyHint: false`, `destructiveHint: false` — descriptions
instruct hosts to require approval):

| Tool              | Does                                                                                                                                                                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `spin_up_node`    | Runs the join kit `scripts/join-regtest.sh provider\|relay` in the immortal checkout (`IMMORTAL_DIR`, default `~/work/immortal`). Optional relay, gateway, peer, and private state-directory arguments pass through to the kit. Streams progress notifications, returns the last 200 output lines, 15-minute bound. |
| `join_network`    | Publishing 39600/39601 happens inside the join script's provider start. If the installed script exposes a discrete `publish` entrypoint this runs it; otherwise it returns typed guidance pointing at `spin_up_node` (it never invents a publish path).                                                             |
| `faucet_fund`     | POSTs the gateway faucet capability (`<gateway>/v1/public-regtest/faucet`, request schema `openagents.immortal.public-regtest-faucet-request.v1`) for a `bcrt1` address (validated client-side first), then polls the status URL until `paid` or a 60 s bound.                                                      |
| `request_listing` | Constructs and returns the prefilled GitHub new-issue URL for the `OpenAgentsInc/immortal` pin request. Does **not** open a browser or create the issue.                                                                                                                                                            |

## Running

```sh
# from the bazaar repo (development)
pnpm --filter @openagentsinc/immortal-mcp dev      # npx tsx src/index.ts
pnpm --filter @openagentsinc/immortal-mcp build    # bundled executable + pinned WASM
node packages/immortal-mcp/dist/index.js           # built stdio server
```

Environment:

| Variable                | Meaning                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `IMMORTAL_MANIFEST_URL` | Default manifest envelope URL for `network_status` (`<origin>/bazaar-public-regtest.json`). |
| `IMMORTAL_DIR`          | Immortal checkout for `spin_up_node`/`join_network` (default `~/work/immortal`).            |
| `IMMORTAL_JOIN_DIR`     | Join-kit state dir for `node_health` (default `~/work/immortal/deploy/join`).               |

## Client wiring

### omega (`context_servers` — pure config, no omega code change)

```json
{
  "context_servers": {
    "immortal": {
      "command": "bunx",
      "args": ["@openagentsinc/immortal-mcp"]
    }
  }
}
```

Tool IDs surface as `mcp:immortal:<tool>` for omega's per-profile allow/deny
policy. Keep the four read-only tools `allow` and the four effectful tools
`approval_required`.

### Claude Code

```sh
claude mcp add immortal -- npx -y @openagentsinc/immortal-mcp
# or from a bazaar checkout, no publish needed:
claude mcp add immortal -- npx tsx packages/immortal-mcp/src/index.ts
```

The checked-in skills `.claude/skills/join-immortal-network/` and
`.claude/skills/read-the-network-map/` teach the flow.

### probe (follow-up note)

Probe has no MCP client yet; its `ProbeLlmTool` descriptor maps 1:1 onto MCP
tools. When probe grows an MCP client, these tools slot into its
`tool-menu.ts` ref/policy model as `tool.immortal.*` entries with
`allow | approval_required | deny` — read-only tools `allow`, effectful tools
`approval_required`. That is a probe follow-up, not a blocker here.

## Verification depth (stated honestly)

`network_status` structure-checks the envelope
(`openagents.bazaar.public-regtest-envelope.v1`), requires the regtest chain
id, verifies the kind 27237 signature event's own cryptographic validity
(id + schnorr, via `@openagentsinc/nip-mkt`) and its byte-binding to the
canonical manifest JSON, and reports the signing pubkey and canonical
manifest sha256. It does **not** hold the deployment's pinned trust root
(signing pubkey + revision pins), so it cannot assert the signer is the
operator the production browser trusts — the result's
`manifest.verification.trustRoot` field says exactly that. Full
trust-root-pinned verification remains with the browser runtime
(`lib/immortal/public-config.ts`).

## Scope cuts (v1)

- **`get_quotes` is no-spend only.** It creates an ephemeral requester key,
  returns public quote terms, and then discards the key. It never constructs an
  Order, exposes a funding request, or retains a resumable requester session.
- **Trust-root pinning** in `network_status` is reported, not enforced (see
  above).
- **Public 39603 receipts redact amounts and fees.** The map aggregates unique
  completed swaps, while volume and fee totals stay `null`, never fabricated
  zeros.

## Conformance

```sh
pnpm --filter @openagentsinc/immortal-mcp conformance
```

Spawns the server over stdio, performs `initialize` + `tools/list`, asserts
the eight v1 tools with JSON schemas and annotations (read-only vs effectful),
calls `request_listing` (pure) and asserts the GitHub URL shape, proves
`get_quotes` refuses to open a network path without an explicit signed
manifest, and asserts the mainnet-address rejection of `faucet_fund`.
