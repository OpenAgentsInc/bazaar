import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { ImmortalNetworkTopology } from "@/components/immortal/infrastructure"
import { ImmortalNetworkTopologyScene } from "@/components/viz/immortal/network-topology"

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
        className="mx-auto max-w-4xl space-y-4"
        style={grayscale ? { filter: "grayscale(1)" } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

const meta = {
  title: "Immortal/Network Topology",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Frame>
      <ImmortalNetworkTopology />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "requester" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "relay-a" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "provider-b" })
    ).toBeInTheDocument()
  },
}

export const RelayDegraded: Story = {
  render: () => (
    <Frame>
      <ImmortalNetworkTopology
        states={{ "relay-b": "degraded" }}
        socketState="snapshot"
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "relay-b (degraded)" })
    ).toBeInTheDocument()
  },
}

export const ProviderOffline: Story = {
  render: () => (
    <Frame>
      <ImmortalNetworkTopology states={{ "provider-a": "offline" }} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "provider-a (offline)" })
    ).toBeInTheDocument()
  },
}

export const CustodyBoundaryCallout: Story = {
  render: () => (
    <Frame>
      <div className="rounded-2xl border border-border p-4">
        <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
          The boundary is custody, not computation
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          The coordination zone never holds funds, seeds, node credentials, or
          unreleased preimages. Money colors appear only inside custody zones;
          Lightning channels form their own overlay network that never passes
          through a relay.
        </p>
        <ImmortalNetworkTopologyScene />
      </div>
    </Frame>
  ),
}

export const GrayscaleAudit: Story = {
  render: () => (
    <Frame grayscale>
      <ImmortalNetworkTopology states={{ "relay-b": "degraded" }} />
    </Frame>
  ),
}
