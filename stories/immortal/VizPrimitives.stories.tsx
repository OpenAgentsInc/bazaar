import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import {
  VizBoundary,
  VizChip,
  VizEdge,
  VizNode,
  VizPort,
  VizProgressRail,
  VizScene,
  VizZone,
  vizPortAnchor,
  type VizAnchor,
  type VizEdgeClass,
  type VizNodeRole,
  type VizNodeState,
} from "@/components/viz/core"

function Frame({
  children,
  grayscale = false,
}: {
  children: React.ReactNode
  grayscale?: boolean
}) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div
        className="mx-auto max-w-3xl space-y-4"
        style={grayscale ? { filter: "grayscale(1)" } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-3 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Primitives",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const NODE_ROLES: readonly VizNodeRole[] = [
  "requester",
  "relay",
  "provider",
  "rail",
  "service",
]
const NODE_STATES: readonly VizNodeState[] = [
  "ready",
  "starting",
  "degraded",
  "offline",
]

function NodeGallery() {
  return (
    <VizScene width={660} height={330} label="Node roles and states gallery">
      {NODE_ROLES.map((role, column) =>
        NODE_STATES.map((state, row) => (
          <VizNode
            key={`${role}-${state}`}
            x={90 + column * 120}
            y={50 + row * 72}
            shape={role === "rail" || role === "service" ? "rect" : "circle"}
            r={18}
            width={52}
            height={30}
            role={role}
            state={state}
            label={role}
            sublabel={state}
          />
        ))
      )}
    </VizScene>
  )
}

const EDGE_CASES: ReadonlyArray<{
  klass: VizEdgeClass
  label: string
  state?: string
  head: "none" | "arrow" | "arc"
}> = [
  { klass: "socket", label: "WSS", state: "live", head: "arrow" },
  { klass: "giftwrap", label: "NIP-59 wrap", state: "kind 39605", head: "arc" },
  { klass: "channel", label: "channel", state: "A ↔ requester", head: "none" },
  { klass: "rpc", label: "bitcoind RPC", head: "arrow" },
  {
    klass: "evidence",
    label: "rail evidence",
    state: "not authority",
    head: "arrow",
  },
]

function EdgeGallery() {
  return (
    <VizScene width={660} height={340} label="Edge class gallery">
      {EDGE_CASES.map((edge, row) => {
        const y = 45 + row * 64
        const from: VizAnchor = { x: 90, y, shape: "circle", r: 16 }
        const to: VizAnchor = { x: 560, y, shape: "circle", r: 16 }
        return (
          <g key={edge.klass}>
            <VizNode x={90} y={y} shape="circle" r={16} role="neutral" />
            <VizNode x={560} y={y} shape="circle" r={16} role="neutral" />
            <VizEdge
              from={from}
              to={to}
              klass={edge.klass}
              label={edge.label}
              state={edge.state}
              head={edge.head}
            />
            <text
              x={20}
              y={y + 3}
              className="font-mono"
              fontSize={9}
              style={{ fill: "var(--viz-muted)" }}
            >
              {edge.klass}
            </text>
          </g>
        )
      })}
    </VizScene>
  )
}

function PortChipGallery() {
  const node: VizAnchor = { x: 180, y: 90, shape: "circle", r: 26 }
  const chipDock = vizPortAnchor(node, 0, 3)
  return (
    <VizScene width={660} height={180} label="Ports and record chips gallery">
      <VizNode
        x={180}
        y={90}
        shape="circle"
        r={26}
        role="provider"
        label="provider-a"
      />
      <VizPort node={node} angleDeg={210} klass="socket" direction="input" label="WSS inbox" />
      <VizPort node={node} angleDeg={150} klass="giftwrap" direction="input" label="gift-wrap inbox" />
      <VizPort node={node} angleDeg={90} klass="channel" direction="output" label="channel port" />
      <VizPort node={node} angleDeg={0} klass="rpc" direction="output" label="rail RPC" />
      <VizChip x={chipDock.x + 70} y={chipDock.y} kind={39605} label="Quote" tone="active" />
      <VizChip x={430} y={50} kind={39604} label="RFQ" />
      <VizChip x={430} y={90} kind={39610} label="Contract" tone="ok" />
      <VizChip x={430} y={130} kind={39607} label="Status" tone="warn" />
    </VizScene>
  )
}

function ZoneGallery() {
  const cln: VizAnchor = { x: 500, y: 96, shape: "rect", width: 64, height: 26 }
  const bitcoind: VizAnchor = {
    x: 590,
    y: 96,
    shape: "rect",
    width: 64,
    height: 26,
  }
  return (
    <VizScene
      width={660}
      height={190}
      label="Custody boundary and provider zone gallery"
    >
      <VizBoundary
        x={330}
        y1={16}
        y2={174}
        labelLeft="coordination — no custody"
        labelRight="custody"
      />
      <VizNode
        x={150}
        y={100}
        shape="circle"
        r={20}
        role="relay"
        label="relay-a"
        sublabel="wss · postgres"
      />
      <VizZone x={400} y={40} width={240} height={120} label="provider-a" detail="private rails">
        <VizNode
          x={500}
          y={96}
          shape="rect"
          width={64}
          height={26}
          role="rail"
          label="CLN"
          labelPlacement="inside"
        />
        <VizNode
          x={590}
          y={96}
          shape="rect"
          width={64}
          height={26}
          role="rail"
          label="bitcoind"
          labelPlacement="inside"
        />
        <VizEdge from={cln} to={bitcoind} klass="rpc" paddingFrom={2} paddingTo={2} />
      </VizZone>
    </VizScene>
  )
}

export const Nodes: Story = {
  render: () => (
    <Frame>
      <Panel title="Node roles × states — state is never color-only">
        <NodeGallery />
      </Panel>
    </Frame>
  ),
}

export const Edges: Story = {
  render: () => (
    <Frame>
      <Panel title="Five edge classes — distinct in shape and color">
        <EdgeGallery />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scene = canvas.getByRole("img", { name: "Edge class gallery" })
    await expect(scene).toBeInTheDocument()
  },
}

export const PortsAndChips: Story = {
  render: () => (
    <Frame>
      <Panel title="Rim ports (hollow input / filled output) and record chips">
        <PortChipGallery />
      </Panel>
    </Frame>
  ),
}

export const ZonesAndBoundary: Story = {
  render: () => (
    <Frame>
      <Panel title="Custody boundary divider and provider private zone">
        <ZoneGallery />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const scene = canvas.getByRole("img", {
      name: "Custody boundary and provider zone gallery",
    })
    await expect(scene).toBeInTheDocument()
  },
}

const RAIL_STAGES = [
  { id: "connecting", label: "Connect" },
  { id: "authenticating", label: "Authenticate" },
  { id: "snapshot", label: "Snapshot" },
  { id: "live", label: "Live" },
]

export const ProgressRails: Story = {
  render: () => (
    <Frame>
      <Panel title="Progress rail — in progress">
        <VizProgressRail
          stages={RAIL_STAGES}
          activeId="snapshot"
          label="Relay session progress: snapshot in progress"
        />
      </Panel>
      <Panel title="Progress rail — complete (live is ongoing)">
        <VizProgressRail
          stages={RAIL_STAGES}
          activeId="live"
          completedIds={RAIL_STAGES.map((stage) => stage.id)}
          label="Relay session progress: live"
        />
      </Panel>
      <Panel title="Progress rail — error, active label only">
        <VizProgressRail
          stages={RAIL_STAGES}
          activeId="authenticating"
          error
          showLabels="active"
          label="Relay session progress: authentication failed"
        />
      </Panel>
    </Frame>
  ),
}

export const GrayscaleAudit: Story = {
  render: () => (
    <Frame grayscale>
      <Panel title="Grayscale audit — classes and states must stay legible">
        <EdgeGallery />
      </Panel>
      <Panel title="Grayscale audit — node states">
        <NodeGallery />
      </Panel>
    </Frame>
  ),
}
