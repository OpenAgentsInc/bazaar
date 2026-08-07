import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { fn } from "storybook/test"

import {
  FundedEvidencePanel,
  FundedRuntimeDisclosure,
  FundedSwapContent,
  LifecyclePanel,
  RuntimeDisclosure,
  RuntimePopover,
  VerificationTile,
} from "@/components/swap-page"

import {
  FUNDED_SESSION,
  INACTIVE_FUNDED_RUNTIME,
  LIVE_STATUS,
  MOCK_PROVENANCE,
  READY_FUNDED_RUNTIME,
  RUNNING_LIFECYCLE,
  UNAVAILABLE_FUNDED_CONFIG,
} from "../swap/fixtures"

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
  title: "Immortal/Bazaar Runtime Integration",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const RelayRuntimeStatus: Story = {
  render: () => (
    <Frame>
      <RuntimeDisclosure status={LIVE_STATUS} />
    </Frame>
  ),
}

export const MarketLifecycle: Story = {
  render: () => (
    <Frame>
      <LifecyclePanel lifecycle={RUNNING_LIFECYCLE} />
    </Frame>
  ),
}

export const FundedAdapterInactive: Story = {
  render: () => (
    <Frame>
      <FundedRuntimeDisclosure runtime={INACTIVE_FUNDED_RUNTIME} />
    </Frame>
  ),
}

export const FundedAdapterReady: Story = {
  render: () => (
    <Frame>
      <FundedSwapContent runtime={READY_FUNDED_RUNTIME} onAuthorize={fn()} />
    </Frame>
  ),
}

export const RequesterVerification: Story = {
  render: () => (
    <Frame>
      <VerificationTile
        label="Local rails"
        value="BTC + LN verified"
        detail="Immortal requester verification"
        verified
      />
    </Frame>
  ),
}

export const PublicSafeEvidence: Story = {
  render: () => (
    <Frame>
      <FundedEvidencePanel session={FUNDED_SESSION} />
    </Frame>
  ),
}

export const RuntimeSettings: Story = {
  render: () => (
    <Frame>
      <div className="grid grid-cols-[1fr_auto_1fr] rounded-xl border border-border bg-card p-3">
        <RuntimePopover
          mode="no_spend"
          onModeChange={fn()}
          modeLocked={false}
          fundedConfig={UNAVAILABLE_FUNDED_CONFIG}
          fundedRuntime={INACTIVE_FUNDED_RUNTIME}
          status={LIVE_STATUS}
          provenance={MOCK_PROVENANCE}
        />
      </div>
    </Frame>
  ),
}

export const IntegratedRuntime: Story = {
  render: () => (
    <Frame wide>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <RuntimeDisclosure status={LIVE_STATUS} />
          <LifecyclePanel lifecycle={RUNNING_LIFECYCLE} />
        </div>
        <div className="space-y-4">
          <FundedRuntimeDisclosure runtime={READY_FUNDED_RUNTIME} />
          <FundedEvidencePanel session={FUNDED_SESSION} />
        </div>
      </div>
    </Frame>
  ),
}
