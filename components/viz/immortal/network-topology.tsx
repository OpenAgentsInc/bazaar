"use client"

// Custody-boundary network topology — the flagship scene from
// docs/network-visualization-spec.md §5.1. Authored symmetric layout:
// requester left, coordination fabric center, providers right, Lightning
// channels as a drawn overlay graph. No relay or provider is visually
// privileged; money colors appear only inside custody zones.

import * as React from "react"

import {
  VizEdge,
  VizNode,
  VizScene,
  VizZone,
  type VizAnchor,
  type VizNodeState,
} from "@/components/viz/core"

export type TopologyServiceState = "ready" | "starting" | "degraded" | "offline"

export interface NetworkTopologyStates {
  "relay-a"?: TopologyServiceState
  "relay-b"?: TopologyServiceState
  "provider-a"?: TopologyServiceState
  "provider-b"?: TopologyServiceState
}

export interface ImmortalNetworkTopologySceneProps {
  states?: NetworkTopologyStates
  /** Socket annotation for healthy relays (e.g. "live", "snapshot"). */
  socketState?: string
  className?: string
}

// Authored layout. All coordinates live here so story variants patch data,
// not geometry code.
const W = 880
const H = 520

const N = {
  requester: { x: 130, y: 150, shape: "circle", r: 26 } satisfies VizAnchor,
  walletCln: {
    x: 130,
    y: 258,
    shape: "rect",
    width: 82,
    height: 24,
  } satisfies VizAnchor,
  relayA: { x: 425, y: 150, shape: "circle", r: 22 } satisfies VizAnchor,
  relayB: { x: 425, y: 245, shape: "circle", r: 22 } satisfies VizAnchor,
  providerA: { x: 672, y: 118, shape: "circle", r: 22 } satisfies VizAnchor,
  providerB: { x: 672, y: 368, shape: "circle", r: 22 } satisfies VizAnchor,
  clnA: { x: 792, y: 92, shape: "rect", width: 72, height: 24 } satisfies VizAnchor,
  bitcoindA: {
    x: 792,
    y: 150,
    shape: "rect",
    width: 72,
    height: 24,
  } satisfies VizAnchor,
  clnB: { x: 792, y: 342, shape: "rect", width: 72, height: 24 } satisfies VizAnchor,
  bitcoindB: {
    x: 792,
    y: 400,
    shape: "rect",
    width: 72,
    height: 24,
  } satisfies VizAnchor,
  // Lightning overlay graph (channels are their own network).
  lnWallet: { x: 235, y: 452, shape: "circle", r: 13 } satisfies VizAnchor,
  lnA: { x: 400, y: 420, shape: "circle", r: 13 } satisfies VizAnchor,
  lnB: { x: 400, y: 482, shape: "circle", r: 13 } satisfies VizAnchor,
} as const

type NodeId = keyof typeof N

// Adjacency for hover dimming: hovering a node keeps itself + neighbors lit.
const ADJACENCY: Record<NodeId, readonly NodeId[]> = {
  requester: ["walletCln", "relayA", "relayB", "lnWallet"],
  walletCln: ["requester", "lnWallet"],
  relayA: ["requester", "providerA"],
  relayB: ["requester", "providerB"],
  providerA: ["relayA", "clnA", "bitcoindA", "lnA"],
  providerB: ["relayB", "clnB", "bitcoindB", "lnB"],
  clnA: ["providerA", "lnA"],
  bitcoindA: ["providerA"],
  clnB: ["providerB", "lnB"],
  bitcoindB: ["providerB"],
  lnWallet: ["lnA", "lnB", "walletCln", "requester"],
  lnA: ["lnWallet", "lnB", "clnA", "providerA"],
  lnB: ["lnWallet", "lnA", "clnB", "providerB"],
}

interface EdgeSpec {
  id: string
  from: NodeId
  to: NodeId
  klass: "socket" | "giftwrap" | "channel" | "rpc"
  label?: string
  labelOffset?: string
  title?: string
  stateFrom?: "socket"
  route?: ReadonlyArray<{ x: number; y: number }>
  /** Vertical offset applied to the from-anchor only (parallel-line trick). */
  offsetFromY?: number
}

const EDGES: readonly EdgeSpec[] = [
  { id: "sock-req-a", from: "requester", to: "relayA", klass: "socket", label: "wss", stateFrom: "socket" },
  { id: "sock-req-b", from: "requester", to: "relayB", klass: "socket", label: "wss", stateFrom: "socket" },
  { id: "sock-prov-a", from: "providerA", to: "relayA", klass: "socket" },
  { id: "sock-prov-b", from: "providerB", to: "relayB", klass: "socket" },
  {
    id: "wrap-a",
    from: "requester",
    to: "providerA",
    klass: "giftwrap",
    label: "NIP-59 · 39604–39609",
    labelOffset: "72%",
    title: "Gift-wrapped records requester ↔ provider-a, stored and forwarded by relay-a",
    route: [{ x: 425, y: 150 }],
    offsetFromY: -12,
  },
  {
    id: "wrap-b",
    from: "requester",
    to: "providerB",
    klass: "giftwrap",
    title: "Gift-wrapped records requester ↔ provider-b, stored and forwarded by relay-b",
    route: [{ x: 425, y: 245 }],
    offsetFromY: 12,
  },
  { id: "rpc-a-cln", from: "providerA", to: "clnA", klass: "rpc" },
  { id: "rpc-a-btc", from: "providerA", to: "bitcoindA", klass: "rpc" },
  { id: "rpc-b-cln", from: "providerB", to: "clnB", klass: "rpc" },
  { id: "rpc-b-btc", from: "providerB", to: "bitcoindB", klass: "rpc" },
  {
    id: "chan-wa",
    from: "lnWallet",
    to: "lnA",
    klass: "channel",
    title: "Lightning channel A ↔ requester",
  },
  {
    id: "chan-wb",
    from: "lnWallet",
    to: "lnB",
    klass: "channel",
    title: "Lightning channel B ↔ requester",
  },
  {
    id: "chan-ab",
    from: "lnA",
    to: "lnB",
    klass: "channel",
    title: "Lightning channel A ↔ B",
  },
]

function offsetFrom(anchor: VizAnchor, dy: number | undefined): VizAnchor {
  if (!dy) return anchor
  return { ...anchor, y: anchor.y + dy }
}

const NODE_META: Record<
  NodeId,
  {
    role: "requester" | "relay" | "provider" | "rail" | "service"
    label: string
    sublabel?: string
    labelPlacement?: "below" | "inside"
    stateKey?: keyof NetworkTopologyStates
  }
> = {
  requester: {
    role: "requester",
    label: "requester",
    sublabel: "browser · wasm",
  },
  walletCln: { role: "rail", label: "CLN", labelPlacement: "inside" },
  relayA: {
    role: "relay",
    label: "relay-a",
    sublabel: "postgres",
    stateKey: "relay-a",
  },
  relayB: {
    role: "relay",
    label: "relay-b",
    sublabel: "postgres",
    stateKey: "relay-b",
  },
  providerA: {
    role: "provider",
    label: "provider-a",
    stateKey: "provider-a",
  },
  providerB: {
    role: "provider",
    label: "provider-b",
    stateKey: "provider-b",
  },
  clnA: { role: "rail", label: "CLN", labelPlacement: "inside" },
  bitcoindA: { role: "rail", label: "bitcoind", labelPlacement: "inside" },
  clnB: { role: "rail", label: "CLN", labelPlacement: "inside" },
  bitcoindB: { role: "rail", label: "bitcoind", labelPlacement: "inside" },
  lnWallet: { role: "rail", label: "requester" },
  lnA: { role: "rail", label: "A", labelPlacement: "inside" },
  lnB: { role: "rail", label: "B", labelPlacement: "inside" },
}

// Keyboard/reading order: requester → relays → providers → rails → overlay.
const NODE_ORDER: readonly NodeId[] = [
  "requester",
  "walletCln",
  "relayA",
  "relayB",
  "providerA",
  "clnA",
  "bitcoindA",
  "providerB",
  "clnB",
  "bitcoindB",
  "lnWallet",
  "lnA",
  "lnB",
]

export function ImmortalNetworkTopologyScene({
  states = {},
  socketState = "live",
  className,
}: ImmortalNetworkTopologySceneProps) {
  const [hovered, setHovered] = React.useState<NodeId | null>(null)

  const nodeState = (id: NodeId): VizNodeState => {
    const key = NODE_META[id].stateKey
    return (key ? states[key] : undefined) ?? "ready"
  }

  const nodeDimmed = (id: NodeId): boolean => {
    if (hovered === null) return false
    return id !== hovered && !ADJACENCY[hovered].includes(id)
  }

  const edgeDimmed = (edge: EdgeSpec): boolean => {
    if (hovered === null) return false
    return edge.from !== hovered && edge.to !== hovered
  }

  return (
    <>
      <VizScene
        width={W}
        height={H}
        label="Immortal network topology: browser requester, two relays, two providers with private rails, and the Lightning channel overlay"
        role="group"
        className={className}
      >
        <VizZone x={30} y={70} width={200} height={240} label="requester" detail="keys stay local" />
        <VizZone
          x={330}
          y={70}
          width={190}
          height={240}
          label="coordination"
          detail="no custody"
        />
        <VizZone x={600} y={40} width={250} height={190} label="provider-a" detail="custody" />
        <VizZone x={600} y={290} width={250} height={190} label="provider-b" detail="custody" />
        <VizZone
          x={150}
          y={378}
          width={300}
          height={128}
          label="lightning channels"
          detail="overlay"
        />

        {EDGES.map((edge) => (
          <VizEdge
            key={edge.id}
            from={offsetFrom(N[edge.from], edge.offsetFromY)}
            to={N[edge.to]}
            klass={edge.klass}
            label={edge.label}
            labelOffset={edge.labelOffset}
            state={edge.stateFrom === "socket" ? socketState : undefined}
            title={edge.title}
            route={edge.route}
            head={edge.klass === "giftwrap" ? "arc" : "none"}
            dimmed={edgeDimmed(edge)}
          />
        ))}

        {NODE_ORDER.map((id) => {
          const meta = NODE_META[id]
          const anchor = N[id]
          return (
            <g
              key={id}
              onPointerEnter={() => setHovered(id)}
              onPointerLeave={() => setHovered((h) => (h === id ? null : h))}
              onFocus={() => setHovered(id)}
              onBlur={() => setHovered((h) => (h === id ? null : h))}
            >
              <VizNode
                x={anchor.x}
                y={anchor.y}
                shape={anchor.shape}
                r={anchor.shape === "circle" ? anchor.r : undefined}
                width={anchor.shape === "rect" ? anchor.width : undefined}
                height={anchor.shape === "rect" ? anchor.height : undefined}
                role={meta.role}
                state={nodeState(id)}
                label={meta.label}
                sublabel={meta.sublabel}
                labelPlacement={meta.labelPlacement}
                interactive
                selected={hovered === id}
                dimmed={nodeDimmed(id)}
              />
            </g>
          )
        })}
      </VizScene>
      {/* Screen-reader mirror of the drawn scene. */}
      <table className="sr-only">
        <caption>Network topology nodes and connections</caption>
        <tbody>
          {NODE_ORDER.map((id) => {
            const meta = NODE_META[id]
            return (
              <tr key={id}>
                <th scope="row">{meta.label}</th>
                <td>{meta.role}</td>
                <td>{nodeState(id)}</td>
                <td>
                  {ADJACENCY[id]
                    .map((neighbor) => NODE_META[neighbor].label)
                    .join(", ")}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </>
  )
}
