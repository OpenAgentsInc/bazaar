---
name: read-the-network-map
description: Interpret the Immortal public regtest network map (the bazaar /network panorama and the network_status MCP tool output) — trust tiers, node health states, edge classes, activity pulses, and what the HUD numbers mean. Read-only vocabulary; no tools required.
---

# Read the Immortal network map

The map (the `ImmortalNetworkPanorama` on bazaar's `/network` page, and the
PanoramaNetwork-shaped JSON from the `network_status` MCP tool) is a birds-eye
"state of the network as we see it": clients cloud inside the relay ring,
providers on the outer ring, edges weighted by activity, and a market HUD.
Layout is deterministic (seeded, no force simulation), so no relay or provider
is randomly privileged between renders.

## Trust tiers

- **Pinned** — relays/providers listed in the current signed launch manifest
  (kind 27237 envelope). Full color, full interaction, "verified" badge
  derived from the envelope. Only pinned providers are routable from the swap
  card.
- **Discovered** — any additional provider publishing valid 39600/39601 heads
  on a connected relay (and any relay such a provider lists). Rendered dimmed
  with an explicit `unpinned` tag: visible, never routable until a human
  operator re-signs the manifest. A newly joined node appears here within one
  relay snapshot — before any operator action.

## Health states (glyphs)

Nodes carry one of four states: `ready`, `starting`, `degraded`, `offline`.
Every state pairs color with a shape/dash/label difference, so the map
survives grayscale and color-vision deficiencies — status never rides on
color alone. Honesty rule: **offline infrastructure stops pulsing instead of
being hidden**. If a relay or provider goes dark it stays on the map, inert.

## Edges and pulses

Edge classes are visually distinct (solid / dashed / dotted / double stroke):

- `socket` — a WSS relay connection (NIP-01), state-labeled
  (`connecting → authenticating → snapshot → live`).
- `giftwrap` — a NIP-59 record route; always drawn via a relay waypoint.
- `channel` — a Lightning channel between providers and clients directly (the
  overlay network).
- `rpc` / `evidence` — provider-private rail RPC, and the requester's own
  independent rail observation.

Structural honesty: **relays never interconnect** — there is no
federation/gossip, so no relay-to-relay edges exist. Coordination pulses flow
only along live edges; pulse density and speed scale with observed market
activity. Meaningful motion only — no ambient/idle animation.

## The HUD

- **Swaps (24h)** — completed swap count folded from kind 39603 public market
  receipts (consent-gated).
- **Volume (24h)** — redacted volume in sats from the same receipts.
- **Operator fees (24h)** — an honest estimate from receipt fee terms.
- All amounts are **regtest sats — not real value**; the REGTEST badge is
  always visible.
- In `network_status` output these stats are `null` (not zero) until 39603
  aggregation is implemented there: null means "unknown", never "none".

## Reading `network_status` JSON specifically

- `manifest.verification` tells you exactly how much was verified: structure
  and the signature event's own cryptographic validity, with the trust root
  explicitly reported as not checked by the MCP server (the browser pins it).
- `relays[].reachable` is the live WS probe; `nip11Reachable` is the HTTPS
  identity document; both false means the relay is dark, not deleted.
- `providers[].trust` is `pinned` or `discovered` relative to the fetched
  manifest; `state` derives from the provider's 39600 head (`ready` when its
  profile status is `active`, `offline` when no head was seen).
