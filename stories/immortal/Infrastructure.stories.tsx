import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  ImmortalConformanceReceipt,
  ImmortalCustodyBoundary,
  ImmortalNetworkTopology,
  ImmortalRailReadiness,
  ImmortalServiceReadiness,
} from "@/components/immortal/infrastructure"

const services = [
  {
    name: "relay-a",
    role: "Nostr relay",
    state: "ready",
    detail: "WSS · isolated Postgres",
  },
  {
    name: "relay-b",
    role: "Nostr relay",
    state: "ready",
    detail: "WSS · isolated Postgres",
  },
  {
    name: "provider-a",
    role: "Liquidity provider",
    state: "ready",
    detail: "bitcoind + CLN synchronized",
  },
  {
    name: "provider-b",
    role: "Liquidity provider",
    state: "ready",
    detail: "bitcoind + CLN synchronized",
  },
] as const

const checks = [
  {
    label: "Browser ABI fixture",
    state: "passed",
    detail: "16 operations · typed version mismatch · exact host effect gate",
  },
  {
    label: "Two-provider quotes",
    state: "passed",
    detail: "Distinct keys and deterministic best-Quote selection",
  },
  {
    label: "Relay partition recovery",
    state: "passed",
    detail: "EOSE snapshot restored after bounded reconnect",
  },
  {
    label: "Funded regtest matrix",
    state: "passed",
    detail: "Submarine, reverse, and noncooperative refund",
  },
] as const

function Frame({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div
        className={
          wide ? "mx-auto max-w-5xl space-y-4" : "mx-auto max-w-xl space-y-4"
        }
      >
        {children}
      </div>
    </div>
  )
}

const meta = {
  title: "Immortal/Infrastructure",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PublicRegtestTopology: Story = {
  render: () => (
    <Frame wide>
      <ImmortalNetworkTopology />
    </Frame>
  ),
}
export const AllServicesReady: Story = {
  render: () => (
    <Frame wide>
      <ImmortalServiceReadiness services={services} />
    </Frame>
  ),
}
export const RelayDegraded: Story = {
  render: () => (
    <Frame wide>
      <ImmortalServiceReadiness
        services={[
          ...services.slice(0, 1),
          {
            name: "relay-b",
            role: "Nostr relay",
            state: "degraded",
            detail: "Database notification gap",
          },
          ...services.slice(2),
        ]}
      />
    </Frame>
  ),
}
export const RailReadiness: Story = {
  render: () => (
    <Frame>
      <ImmortalRailReadiness
        chainHeight={1286}
        chainTipMatches
        lightningChannels={3}
      />
    </Frame>
  ),
}
export const CustodyRoles: Story = {
  render: () => (
    <Frame wide>
      <ImmortalCustodyBoundary />
    </Frame>
  ),
}
export const AcceptanceReceipt: Story = {
  render: () => (
    <Frame>
      <ImmortalConformanceReceipt revision="bee97b4" checks={checks} />
    </Frame>
  ),
}
export const OperationsOverview: Story = {
  render: () => (
    <Frame wide>
      <ImmortalNetworkTopology />
      <ImmortalRailReadiness
        chainHeight={1286}
        chainTipMatches
        lightningChannels={3}
      />
      <ImmortalServiceReadiness services={services} />
      <ImmortalConformanceReceipt revision="bee97b4" checks={checks} />
    </Frame>
  ),
}
