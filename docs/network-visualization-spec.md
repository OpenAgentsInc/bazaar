# Network Visualization Spec

Status: proposed
Scope: Bazaar Storybook catalog first (`stories/immortal/`), then the product
surfaces that embed the same components.
Primary rendering reference: `samuelmtimbo/unit`
(local clone: `~/work/projects/repos/unit`).
Protocol source of truth: `~/work/immortal` (`nips/openagents/MKT.md`,
`nips/openagents/MKT-SWP.md`, `contract/immortal-contract.json`).

## 1. Purpose

Bazaar is the client surface for an open, Nostr-coordinated liquidity market:
a browser requester talks to replaceable relays, independent providers hold
liquidity behind their own rails (bitcoind, CLN/LND, elementsd, arkd), and the
wallet verifies everything before money moves. Today the catalog explains this
network with cards, badge lists, and text (`ImmortalNetworkTopology` renders
the Lightning channel graph as three text badges). This spec defines a small
composable SVG visualization system that makes the network itself — its trust
boundaries, message flow, and settlement evidence — directly legible.

The visualizations are not decoration. Each one exists to serve a PRODUCT.md
principle:

- **Verify before fund** → the timeout ladder and evidence meter make safety
  conditions visible before funding.
- **Make trust boundaries explicit** → the topology draws the custody boundary
  as a real line that money edges never cross.
- **Keep infrastructure replaceable** → deterministic symmetric layout; no
  relay or provider is ever visually privileged.
- **Operational clarity over spectacle** → dense, calm, terminal-grade
  rendering; animation only where it carries protocol meaning.
- **Label maturity honestly** → every scene carries its REGTEST/rehearsal
  badge exactly as the existing cards do.

## 2. What we are visualizing

The reference network is deliberately small and fixed:

- **1 requester** — browser host running the Immortal WASM engine and a
  requester-side signer; user keys never leave the device.
- **2 relays** — `relay-a`, `relay-b`, each with an isolated Postgres.
  Relays coordinate (signed/wrapped records, NIP-42 auth, NIP-59 gift wrap,
  optional coordination handler) but never hold funds, preimages, or keys.
- **2 providers** — `provider-a`, `provider-b`, each with its own bitcoind +
  CLN and its own Postgres. Providers hold the money.
- **3 Lightning channels** — `A ↔ requester`, `B ↔ requester`, `A ↔ B`.
- **Rails** — Bitcoin chain, Lightning, optionally Liquid/Ark, reached only
  from inside a provider's private zone.

Distinct edge classes (these must render distinctly, never as one generic
"line"):

| Edge class | Physical form | Render treatment |
| --- | --- | --- |
| Relay socket | WSS (NIP-01), states `connecting → authenticating → snapshot → live` | solid stroke, state-labeled |
| Gift-wrap route | NIP-59 wrapped record, logically requester↔provider, physically via relay | dashed pass-through, routed *through* the relay node |
| Lightning channel | payment channel | `--asset-lightning` stroke |
| Provider→rail RPC | bitcoind RPC/ZMQ, CLN socket | drawn only inside the provider zone, muted |
| Chain evidence | requester's independent observation | thin stroke to the rail, labeled "evidence, not authority" |

The custody boundary is a first-class drawn element: a labeled zone divider.
Everything relay-side of it renders in coordination colors; money colors
(`--asset-*`) appear only on the provider/requester side.

## 3. What we take from `unit`

`unit` renders a live visual programming graph with hand-built DOM: HTML divs
for nodes, one shared SVG layer for links, no framework, no canvas. We are
React/Next.js and our topology is fixed, so we borrow patterns, not machinery.

### Borrow (with the unit source of each pattern)

1. **Dual-layer scene with one shared transform**
   (`src/system/platform/component/Zoom/Component.ts`). One `<svg><g>` layer
   for edges + one absolutely-positioned HTML layer for node content, both
   receiving the same `scale(z) translate(-x, -y)` transform so they stay in
   registration. This lets node interiors be ordinary React/shadcn markup
   (badges, mono text, icons) while edges stay crisp SVG. Zoom math ports
   directly (`src/client/zoom.ts`: `zoomInvert`, `zoomApply`,
   `zoomTransformCenteredAt`).
2. **Zero-size anchor + centered content** (`Editor/Component.ts`,
   `_sim_add_node`). A node is a zero-width/height element positioned at its
   center `(x, y)`; the visual is a child offset by `(-w/2, -h/2)`. Position
   updates never fight size.
3. **Link group anatomy** (`Editor/Component.ts`, `_create_link`). Every edge
   is a `<g>` of: visible path, invisible fat hit-area path (stroke ≈ 6px +
   visible width, transparent), an id-bearing path for `<textPath>`, and the
   `<text><textPath startOffset="50%">` label. Labels stay upright by
   inverting the textPath geometry when the edge points left.
4. **Surface-anchored endpoints** (`src/client/util/geometry/index.ts`:
   `surfaceDistance`, `pointInNode`). Edges start and end on node surfaces
   (circle or rect aware), never at centers. Arrowheads into circular nodes
   are concentric arcs (`describeArrowSemicircle`) that hug the node rim
   rather than triangles floating in space.
5. **Instance-namespaced marker ids** (`_create_link_marker`). Marker and
   gradient ids are `${instanceId}-${hash(edgeId)}` so multiple diagrams can
   coexist on one Storybook docs page without SVG id collisions.
6. **Two-level CSS-variable theming** (`Editor/Component.ts`,
   `_refresh_theme`). Elements consume role variables with a fallback chain:
   element reads `var(--viz-node, currentColor)`; the scene container sets
   `--viz-node: var(--color-viz-node, <computed default>)`. Any ancestor can
   override a role by setting `--color-viz-*`; otherwise the design-token
   default applies. We map the computed defaults onto Bazaar's existing
   tokens instead of unit's grayscale ramp (§6).
7. **Invisible enlarged hit targets** (`_create_touch_area`). Every
   interactive node/edge gets a transparent hit element larger than its
   visual (unit uses `#00000000` fills; we use `pointer-events` shapes).
8. **Perimeter-derived dashed selection ring**
   (`app/Selection/Component.ts`). Selection/focus is a composed SVG overlay
   whose `stroke-dasharray` is computed from the shape's perimeter so dashes
   land evenly. This becomes our keyboard-focus and hover ring.
9. **Animation discipline** (`src/client/animation/*`). CSS transitions for
   opacity only; JS (rAF) for position/geometry; WAAPI for one-shot
   keyframes. `animateSimulate`'s thunk-target pattern ("ease toward a target
   re-read every frame") ports as a small hook for camera moves and pulse
   positions. No SMIL — unit ships SMIL wrappers and never uses them
   internally.
10. **Design concepts**: pins as typed ports on a node rim (our nodes expose
    WSS, gift-wrap, and channel ports at fixed rim angles); data as a visible
    satellite node tethered to its port (our in-flight record — RFQ, Quote,
    Order — renders as a small mono-labeled chip traveling the edge or docked
    at a port, not as a tooltip); mode-as-tint (a swap replay tints the
    active edge class, so the viewer always knows which layer is "speaking");
    compatibility highlighting (selecting a quote highlights every edge and
    node that quote's route actually uses).

### Skip (deliberately)

- unit's `Component` base class, slot system, and mem/dom/post triads — React
  is our composition engine.
- Automatic HTML↔SVG boundary wrapping (`_wrapElement` mirror-clone +
  MutationObserver + rAF viewBox measurement). We decide statically which
  layer each element lives on.
- The force simulation (RK1–RK4 integrator, layer mass matrices, O(n²)
  repulsion). Our topology is fixed and symmetry is a product requirement;
  layout is authored, not emergent. Force layout would randomly privilege one
  relay, which PRODUCT.md forbids.
- Imperative `onPropChanged` ladders and inline-style-only theming.

## 4. Architecture

### 4.1 Layers

```
components/viz/
  core/            SVG primitive layer (framework glue, no domain knowledge)
    scene.tsx        <VizScene>  — viewBox, layers, theme bridge, reduced-motion context
    node.tsx         <VizNode>   — anchor + centered content, shape, ports, focus ring
    edge.tsx         <VizEdge>   — link group anatomy (§3.3), surface anchoring, class variants
    port.tsx         <VizPort>   — typed port on a node rim at a fixed angle
    chip.tsx         <VizChip>   — datum satellite (mono label, kind number)
    zone.tsx         <VizZone>   — labeled region (custody boundary, provider private zone)
    marker.tsx       arrowheads/arc heads, instance-namespaced defs
    geometry.ts      surfaceDistance, pointInNode, describeArc, arc arrowheads (ported from unit)
    use-pulse.ts     rAF pulse-along-path hook (thunk-target easing), reduced-motion aware
  immortal/        domain compositions built from core
    network-topology.tsx
    swap-flow.tsx
    session-lanes.tsx
    state-rail.tsx
    timeout-ladder.tsx
    evidence-rungs.tsx
```

`core/` is generic and reusable; `immortal/` knows about relays, providers,
kinds, and states. Existing card components keep their homes in
`components/immortal/` and embed these; `ImmortalNetworkTopology` in
`infrastructure.tsx` is replaced by the new `network-topology`.

### 4.2 Scene model

`<VizScene>` owns:

- a fixed `viewBox` per composition (authored coordinates, responsive via
  `preserveAspectRatio`; no measurement loops);
- two layers in registration when node interiors need HTML (topology), or a
  single pure-SVG layer when they don't (rails, ladders);
- the theme bridge (§6) and a `prefers-reduced-motion` context consumed by
  every animated child;
- optional pan/zoom (ported zoom math) — off by default; the flagship
  topology fits its frame.

Layout is data: each composition exports a plain `layout` object
(`{ nodes: Record<id, {x, y, shape, size}>, edges: [...] }`) so scenes are
testable and stories can render variants (degraded relay, offline provider)
by patching data, not geometry code.

### 4.3 Node and edge contracts

```ts
type VizNodeShape = "circle" | "rect"

interface VizNodeSpec {
  id: string
  x: number; y: number
  shape: VizNodeShape
  role: "requester" | "relay" | "provider" | "rail" | "service"
  state?: "ready" | "starting" | "degraded" | "offline"
  ports?: VizPortSpec[]          // rim angle + edge class
}

type VizEdgeClass =
  | "socket"        // WSS relay connection
  | "giftwrap"      // NIP-59 record route (renders via a relay waypoint)
  | "channel"       // Lightning channel
  | "rpc"           // provider-private rail RPC
  | "evidence"      // requester's independent rail observation

interface VizEdgeSpec {
  id: string
  from: string; to: string       // node or port ids
  klass: VizEdgeClass
  via?: string                   // relay waypoint for giftwrap edges
  state?: string                 // e.g. RelayConnectionState for sockets
  label?: string
}
```

Every edge class binds a **shape difference plus a color difference** (solid /
dashed / dotted / double stroke), so classes survive grayscale and color-vision
deficiencies — status never rides on color alone.

## 5. The visualization catalog

Build order follows numbering; 1–3 are the core deliverables, 4–6 are
embeddable sub-components that reuse the same primitives.

### 5.1 Network topology (flagship)

Replaces the badge-based `ImmortalNetworkTopology`.

- Authored symmetric layout: requester left, relay fabric center, providers
  right, each provider expanding into a private `<VizZone>` containing
  bitcoind/CLN/Postgres as small rect nodes with `rpc` edges.
- The custody boundary is a vertical `<VizZone>` divider labeled
  "coordination — no custody" / "custody"; `--asset-*` colors appear only
  right of it.
- Relay sockets render their live `RelayConnectionState`; degraded/offline
  states reuse the existing badge vocabulary (and the story variants mirror
  `Infrastructure.stories.tsx`).
- Lightning channels render as `channel` edges between requester and
  provider CLN ports — the three badges become three real drawn edges.
- Hover/focus on any node raises its dashed ring and dims non-adjacent
  elements (compatibility highlighting); every node/edge has an `aria-label`
  and a `<title>`.
- Props accept the shapes already in `stories/swap/fixtures.ts`
  (`MOCK_PROVENANCE`, service lists) so stories need no new mock data.

### 5.2 Swap-flow replay

The topology scene plus a record timeline: RFQ 39604 → competing Quotes
39605 → Order 39606 → Contracts 39610 → Status 39607 stream → Close 39609.

- Each record is a `<VizChip>` (kind number + type in mono) that travels its
  gift-wrap edge: requester → relay → provider and back. Two providers
  racing quotes back through two relays is the honest, load-bearing moment
  of animation.
- Playback is stepped (prev/next + play); each step also renders as a static
  frame, which is the `prefers-reduced-motion` behavior and the docs-page
  screenshot behavior. Pulse motion uses the ported thunk-target easing on
  rAF; opacity uses CSS transitions.
- The record chain list (`ImmortalMarketRecordChain`) can sit beside the
  scene and act as the scrubber; hovering a record highlights its path.

### 5.3 Two-lane session sequence

The protocol has no global state: requester and provider each publish an
independent Status stream (per-author `seq`, `previous` chain), joined by
cross-participant causal gates (MKT-SWP §9 — e.g. `requester_claim_pending`
requires provider `funding_final`).

- Two vertical swimlanes of Status nodes ordered by per-author `seq` — never
  by `created_at` (the spec explicitly rejects relay arrival order as
  causal).
- Causal gates draw as arcs between lanes with arc arrowheads.
- `swp_status_gap` renders as a visible hole in the lane; `swp_status_fork`
  renders both records side-by-side at the same seq — forks are retained and
  displayed, never collapsed, matching relay behavior
  (`mkt_swp_status_view` returns missing and duplicated sequences).
- Node fill steps with the evidence rung of the claim (§5.6), so "provider
  said" and "verifier admitted" are visually different weights.

### 5.4 Swap state rail

The submarine / reverse / chain state machines as a horizontal rail: happy
path as the spine, 0-conf bypass and refund/recovery ladders as muted
branches that are always drawn — "your money always has an exit" is
structural, not a tooltip. Current state gets the dashed ring. This is the
terminal-grade upgrade of the `LifecyclePanel` checklist and shares its
stage data.

### 5.5 Timeout ladder

A compact block-height axis: current height, `H_fund`, `H_claim`, `H_refund`
with their safety margins drawn as bracketed intervals (reverse swaps add the
hold-invoice expiry on a second, Lightning-CLTV height domain). Embeddable in
the swap card next to amounts and fees — the "verify before fund" instrument.

### 5.6 Evidence rung meter

The six-rung ladder `pledged → reserved → measured → verified → paid →
settled` as a stepped fill, with reservation proof-class strength (10–100) as
a secondary bar. Used standalone in market cards and as the fill scale inside
5.3.

### Explicitly out of scope

Force-directed layout, 3D/globe/particle effects (PRODUCT.md anti-references),
orderbook depth charts (the relay intentionally exposes no orderbook; provider
selection is client-side ranking), and any visualization implying one relay or
provider is authoritative.

## 6. Theming

Two-level indirection over the existing token stack, per unit's pattern:

```css
/* core primitives consume role vars with a safe fallback */
.viz-edge-channel { stroke: var(--viz-channel, currentColor); }

/* <VizScene> binds roles to Bazaar tokens; ancestors may override --color-viz-* */
.viz-scene {
  --viz-node:      var(--color-viz-node,      var(--border));
  --viz-node-text: var(--color-viz-node-text, var(--foreground));
  --viz-muted:     var(--color-viz-muted,     var(--muted-foreground));
  --viz-socket:    var(--color-viz-socket,    var(--primary));
  --viz-giftwrap:  var(--color-viz-giftwrap,  var(--chart-3));
  --viz-channel:   var(--color-viz-channel,   var(--asset-lightning));
  --viz-bitcoin:   var(--color-viz-bitcoin,   var(--asset-bitcoin));
  --viz-liquid:    var(--color-viz-liquid,    var(--asset-liquid));
  --viz-ok:        var(--color-viz-ok,        var(--oa-color-attention-done));
  --viz-warn:      var(--color-viz-warn,      var(--oa-color-syntax-number));
  --viz-danger:    var(--color-viz-danger,    var(--destructive));
  --viz-boundary:  var(--color-viz-boundary,  var(--border));
}
```

Rules: dark-only (`:root` is the dark palette; no light variants);
`currentColor` as terminal fallback so primitives degrade sanely outside a
scene; Geist Mono (`--font-mono`) for every pubkey, hash, kind number, height,
and amount inside SVG `<text>`; text sizes match the existing card scale
(labels at the `text-[0.625rem]`/`text-xs` register). No hardcoded hex in
`components/viz/`.

## 7. Motion policy

- **Meaningful motion only**: record chips traveling edges, state
  transitions, connection-state changes. No ambient/idle animation.
- CSS transitions for opacity; rAF (thunk-target easing) for geometry; WAAPI
  for one-shot emphasis. No SMIL.
- Every animated component consumes the scene's reduced-motion context and
  renders the stepped-frame equivalent; interactive stepping is always
  available regardless of the motion setting (the codebase's existing
  `motion-reduce:animate-none` posture extends here).
- Pulses pause when the scene is off-viewport (IntersectionObserver) and on
  `visibilitychange`.

## 8. Accessibility (WCAG 2.2 AA)

- Scenes are `role="img"` with a text alternative, or `role="group"` with a
  DOM-ordered, keyboard-traversable node list when interactive; arrow-key
  traversal follows the reading order requester → relays → providers.
- Focus renders the perimeter-dashed ring at ≥3:1 contrast against both node
  fill and scene background.
- Every state pairs color with shape/dash/label; the topology remains fully
  legible in forced grayscale.
- Edge hit areas ≥ 24px effective; node hit targets larger than visuals
  (unit's touch-area pattern).
- A visually-hidden table mirrors each scene's nodes/edges/states for screen
  readers (the same data object that drives layout renders both).

## 9. Storybook plan

New stories under `stories/immortal/` (the configured glob only matches
`stories/{boltz,immortal,swap}`):

| File | Title | Contents |
| --- | --- | --- |
| `NetworkTopology.stories.tsx` | `Immortal/Network Topology` | default, relay degraded, provider offline, custody-boundary callout, grayscale audit frame |
| `SwapFlow.stories.tsx` | `Immortal/Swap Flow` | stepped replay per stage, quote race, reduced-motion frame |
| `SessionLanes.stories.tsx` | `Immortal/Session Sequence` | happy path, status gap, status fork, causal-gate highlight |
| `VizPrimitives.stories.tsx` | `Immortal/Viz Primitives` | core node/edge/port/chip/zone gallery (the reference sheet for future compositions) |

Conventions: reuse the local `Frame` wrapper (`dark min-h-svh bg-background`),
`layout: "fullscreen"`, fixtures from `stories/swap/fixtures.ts`, and `play`
functions asserting aria labels and step controls. State/timeline data stays
compatible with the mocked `use-immortal-runtime` hook so the same components
can later bind to the live runtime provenance.

Real-shaped payloads for data-driven stories exist in the immortal repo
(`tests/fixtures/lab/*.json`, `contract/immortal-contract.json`); a later
milestone may snapshot a trimmed copy into `stories/` fixtures — never
imported across repos at build time.

## 10. Milestones

1. **M1 — core primitives**: `components/viz/core/` (scene, node, edge, port,
   zone, geometry, markers, theme bridge) + `VizPrimitives` story.
2. **M2 — topology**: `network-topology` composition, replace the badge-based
   `ImmortalNetworkTopology`, degraded-state variants.
3. **M3 — swap-flow replay**: chips, stepped playback, quote race; wire the
   record chain as scrubber.
4. **M4 — session lanes**: two-lane sequence with gates, gaps, forks.
5. **M5 — instruments**: state rail, timeout ladder, evidence rungs; embed in
   the existing swap card and market stories.

Each milestone lands with stories, aria coverage, a reduced-motion frame, and
no new runtime dependencies (hand-rolled SVG only).
