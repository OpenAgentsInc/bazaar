import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState } from "react"
import { expect, fn, userEvent, within } from "storybook/test"

import {
  ProviderSelectionLedger,
  PublicAcceptanceReceipt,
  PublicRegtestOperationalNotice,
  PublicRegtestReadiness,
  QuoteCommitment,
  RailEvidenceGate,
  RegtestBoundaryBanner,
  VerifyBeforeFund,
} from "@/components/immortal/public-regtest"
import { PublicRegtestDestination } from "@/components/immortal/public-regtest-destination"

const READY_CHECKS = [
  {
    label: "Signed public configuration",
    detail: "Authentic, current, and origin-bound",
    state: "ready",
  },
  {
    label: "Direct relay transport",
    detail: "2 WSS relays · NIP-11 identity · NIP-42",
    state: "ready",
  },
  {
    label: "Regtest chain tip",
    detail: "Height 1,284 · providers synchronized",
    state: "ready",
  },
  {
    label: "Lightning channels",
    detail: "Two provider routes ready",
    state: "ready",
  },
] as const

const PROVIDERS = [
  {
    name: "Northstar",
    publicKey: "9ec5…7a21",
    quote: "249,360 sats output",
    state: "selected",
  },
  {
    name: "Lumen",
    publicKey: "0fb2…e814",
    quote: "249,210 sats output",
    state: "released",
  },
] as const

const VERIFIED_CHECKS = [
  {
    label: "Destination",
    detail: "bcrt1q…g7kh matches the signed request",
    state: "verified",
  },
  {
    label: "Amount and fee",
    detail: "250,000 sats input · 640 sats maximum fee",
    state: "verified",
  },
  {
    label: "Provider identity",
    detail: "Northstar · 9ec5…7a21",
    state: "verified",
  },
  {
    label: "Engine effect",
    detail: "Exact regtest-only request digest verified",
    state: "verified",
  },
] as const

function StoryFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto w-full max-w-[36rem] space-y-4">{children}</div>
    </div>
  )
}

const meta = {
  title: "Swap/Public Regtest Demo",
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const BoundaryAndReadiness: Story = {
  render: () => (
    <>
      <RegtestBoundaryBanner capabilityExpiresIn="08:42" />
      <PublicRegtestReadiness
        revision="public-regtest@8a71c2f"
        checks={READY_CHECKS}
      />
    </>
  ),
}

export const ReadinessBlocked: Story = {
  render: () => (
    <PublicRegtestReadiness
      revision="public-regtest@8a71c2f"
      checks={[
        READY_CHECKS[0],
        {
          label: "Direct relay transport",
          detail: "Primary relay reconnecting",
          state: "checking",
        },
        {
          label: "Regtest chain tip",
          detail: "Provider tip divergence detected",
          state: "blocked",
        },
        READY_CHECKS[3],
      ]}
    />
  ),
}

export const TypedOperationalStates: Story = {
  render: () => (
    <div className="space-y-3">
      <PublicRegtestOperationalNotice code="maintenance" />
      <PublicRegtestOperationalNotice
        code="rate_limited"
        retryIn="42 seconds"
      />
      <PublicRegtestOperationalNotice code="relay_reconnecting" />
      <PublicRegtestOperationalNotice code="capability_expired" />
    </div>
  ),
}

export const ExactQuoteCommitment: Story = {
  render: () => (
    <QuoteCommitment
      provider="Northstar · 9ec5…7a21"
      input="250,000 sats"
      output="249,360 sats"
      fee="640 sats"
      destination="bcrt1q8h…g7kh"
      state="current"
    />
  ),
}

function StatefulRegtestDestination() {
  const [value, setValue] = useState("bcrt1q8h2f4k0z9v7s3m6xqg7kh")
  return (
    <PublicRegtestDestination
      value={value}
      onValueChange={setValue}
      kind="address"
      status="valid"
    />
  )
}

export const RegtestDestination: Story = {
  render: () => <StatefulRegtestDestination />,
}

export const WrongNetworkDestination: Story = {
  render: () => (
    <PublicRegtestDestination
      value="bc1qmainnetdestination"
      onValueChange={() => undefined}
      kind="address"
      error="wrong_network"
    />
  ),
}

export const QuoteInvalidatedAfterEdit: Story = {
  render: () => (
    <QuoteCommitment
      provider="Northstar · 9ec5…7a21"
      input="250,000 sats"
      output="249,360 sats"
      fee="640 sats"
      destination="bcrt1q8h…g7kh"
      state="invalidated"
    />
  ),
}

export const SelectedAndReleasedProviders: Story = {
  render: () => <ProviderSelectionLedger providers={PROVIDERS} />,
}

export const FundingLocked: Story = {
  render: () => (
    <VerifyBeforeFund
      checks={[
        ...VERIFIED_CHECKS.slice(0, 3),
        {
          label: "Engine effect",
          detail: "Waiting for contract digest",
          state: "pending",
        },
      ]}
    />
  ),
}

export const FundingVerified: Story = {
  render: () => <VerifyBeforeFund checks={VERIFIED_CHECKS} />,
}

export const RequesterEvidenceGate: Story = {
  render: () => (
    <RailEvidenceGate
      evidence={[
        {
          rail: "Bitcoin",
          requesterState: "verified",
          requesterDetail: "Funding output admitted at regtest height 1,286",
          providerClaim: "funded",
        },
        {
          rail: "Lightning",
          requesterState: "pending",
          requesterDetail: "Waiting for requester-observed settlement",
          providerClaim: "invoice paid",
        },
      ]}
    />
  ),
}

const newDemo = fn()

export const SafeTerminalReceipt: Story = {
  render: () => (
    <>
      <RegtestBoundaryBanner />
      <PublicAcceptanceReceipt
        revision="public-regtest@8a71c2f"
        duration="18.4 s"
        providers={["9ec5…7a21", "0fb2…e814"]}
        outcome="completed"
        onNewDemo={newDemo}
      />
    </>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Start a new isolated demo" })
    )
    await expect(newDemo).toHaveBeenCalled()
  },
}

export const CompletePublicDemoSurface: Story = {
  render: () => (
    <>
      <RegtestBoundaryBanner capabilityExpiresIn="08:42" />
      <PublicRegtestReadiness
        revision="public-regtest@8a71c2f"
        checks={READY_CHECKS}
      />
      <ProviderSelectionLedger providers={PROVIDERS} />
      <QuoteCommitment
        provider="Northstar · 9ec5…7a21"
        input="250,000 sats"
        output="249,360 sats"
        fee="640 sats"
        destination="bcrt1q8h…g7kh"
        state="current"
      />
      <VerifyBeforeFund checks={VERIFIED_CHECKS} />
    </>
  ),
}
