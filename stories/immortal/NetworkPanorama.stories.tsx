import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { ImmortalNetworkPanorama } from "@/components/viz/immortal/network-panorama"

import {
  MEDIUM_NETWORK,
  OUTAGE_NETWORK,
  SMALL_NETWORK,
  THRIVING_NETWORK,
} from "./network-fixtures"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </div>
  )
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {caption ? (
        <p className="mb-3 text-xs text-muted-foreground">{caption}</p>
      ) : null}
      {children}
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Network Panorama",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SmallNetwork: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Small — the persistent public regtest"
        caption="Two relays, two providers, a handful of clients. Clients cloud inside the relay ring; providers sit outside it; channels arc between providers."
      >
        <ImmortalNetworkPanorama network={SMALL_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /Network panorama "public regtest"/ })
    ).toBeInTheDocument()
  },
}

export const GrowingMarket: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Medium — mixed health"
        caption="Seven providers across four relays. One relay is degraded (amber dashes) and one provider is offline (red, dimmed) — the market keeps routing around them."
      >
        <ImmortalNetworkPanorama network={MEDIUM_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "immortal-0 (degraded)" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "fathom (offline)" })
    ).toBeInTheDocument()
  },
}

export const ThrivingMarket: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Large — an absolutely thriving market"
        caption="Eight relays, eighteen providers, 140 clients. Edge width and provider size scale with 24h volume; pulses are coordination records and channel payments in flight. ≈20 BTC moved in 24h."
      >
        <ImmortalNetworkPanorama network={THRIVING_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /thriving market/ })
    ).toBeInTheDocument()
    // The HUD mirror carries the market stats for screen readers.
    await expect(canvas.getByText("7,475")).toBeInTheDocument()
    await expect(canvas.getByText("20.26 BTC")).toBeInTheDocument()
  },
}

export const RelayOutage: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Large — relay outage, market routes around it"
        caption="One relay offline, one degraded. Sockets to the dead relay stop pulsing and dash red; every provider with a second relay set keeps trading. No single point of failure."
      >
        <ImmortalNetworkPanorama network={OUTAGE_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "damus (offline)" })
    ).toBeInTheDocument()
  },
}

export const WithoutVolumeOverlay: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Thriving market — topology only"
        caption="The same network with the volume overlay off: uniform edges and node sizes, structure without the money."
      >
        <ImmortalNetworkPanorama network={THRIVING_NETWORK} overlay="none" />
      </Panel>
    </Frame>
  ),
}

export const BirdsEyeComparison: Story = {
  render: () => (
    <Frame>
      <Panel title="Small">
        <ImmortalNetworkPanorama network={SMALL_NETWORK} />
      </Panel>
      <Panel title="Medium">
        <ImmortalNetworkPanorama network={MEDIUM_NETWORK} />
      </Panel>
      <Panel title="Large">
        <ImmortalNetworkPanorama network={THRIVING_NETWORK} />
      </Panel>
    </Frame>
  ),
}
