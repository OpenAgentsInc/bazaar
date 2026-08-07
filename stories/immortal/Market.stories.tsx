import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  ImmortalEffectAuthorization,
  ImmortalEvidenceLedger,
  ImmortalMarketRecordChain,
  ImmortalOfferingCard,
  ImmortalRecoveryPlan,
  ImmortalReservation,
  ImmortalVerificationSummary,
  type ImmortalMarketRecord,
} from "@/components/immortal/market"

const records: ImmortalMarketRecord[] = [
  {
    type: "RFQ",
    kind: 39604,
    author: "requester",
    state: "verified",
    detail:
      "Encrypted request binds route, amount, payment hash, and Offering.",
  },
  {
    type: "Quote",
    kind: 39605,
    author: "provider",
    state: "verified",
    detail:
      "Firm signed terms include exact fees, deadline, and reservation proof.",
  },
  {
    type: "Order",
    kind: 39606,
    author: "requester",
    state: "verified",
    detail: "Requester selects one Quote without changing its terms.",
  },
  {
    type: "Contract",
    kind: 39610,
    author: "requester",
    state: "verified",
    detail: "Requester and provider contracts commit the same rail scripts.",
  },
  {
    type: "Status",
    kind: 39607,
    author: "provider",
    state: "current",
    detail:
      "Provider observation is checked against the allowed sequence graph.",
  },
  {
    type: "Close",
    kind: 39609,
    author: "provider",
    state: "pending",
    detail: "Terminal Close still requires requester-admitted rail evidence.",
  },
]

const evidence = [
  {
    source: "provider",
    rail: "Lightning",
    claim: "Hold invoice accepted",
    state: "observed",
    reference: "status:39607:81f2…a901",
  },
  {
    source: "relay",
    rail: "Bitcoin",
    claim: "Funding transaction observed",
    state: "observed",
    reference: "nip32:1985:1dd7…2aa8",
  },
  {
    source: "requester",
    rail: "Bitcoin",
    claim: "Exact output admitted at height 1,286",
    state: "admitted",
    reference: "tx:4e2f…9b11:vout:1",
  },
  {
    source: "requester",
    rail: "Contract",
    claim: "Bilateral terms verified",
    state: "admitted",
    reference: "contract:39610:7af2…d019",
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
  title: "Immortal/Market and Effects",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ProviderOffering: Story = {
  render: () => (
    <Frame>
      <ImmortalOfferingCard
        provider="provider-a · 9ec5…7a21"
        input="LN"
        output="BTC"
        minimum="50,000"
        maximum="5,000,000"
        feeBps="40"
        quoteLifetime="10 minutes"
      />
    </Frame>
  ),
}
export const SignedRecordChain: Story = {
  render: () => (
    <Frame>
      <ImmortalMarketRecordChain records={records} />
    </Frame>
  ),
}
export const SoftReservation: Story = {
  render: () => (
    <Frame>
      <ImmortalReservation
        provider="9ec5…7a21"
        amount="250,000 sats"
        expiresIn="08:42"
        state="soft"
      />
    </Frame>
  ),
}
export const ReleasedReservation: Story = {
  render: () => (
    <Frame>
      <ImmortalReservation
        provider="0fb2…e814"
        amount="250,000 sats"
        expiresIn="00:00"
        state="released"
      />
    </Frame>
  ),
}

export const PreparedEffect: Story = {
  render: () => (
    <Frame>
      <ImmortalEffectAuthorization
        state="prepared"
        effectId="eff_71cd…981a"
        operation="fund_chain_destination"
        network="Bitcoin regtest"
        amount="250,000 sats"
        destination="bcrt1q8h…g7kh"
      />
    </Frame>
  ),
}
export const AdmittedEffect: Story = {
  render: () => (
    <Frame>
      <ImmortalEffectAuthorization
        state="admitted"
        effectId="eff_71cd…981a"
        operation="fund_chain_destination"
        network="Bitcoin regtest"
        amount="250,000 sats"
        destination="bcrt1q8h…g7kh"
      />
    </Frame>
  ),
}
export const RefusedEffect: Story = {
  render: () => (
    <Frame>
      <ImmortalEffectAuthorization
        state="refused"
        effectId="eff_71cd…981a"
        operation="fund_chain_destination"
        network="Bitcoin mainnet"
        amount="250,000 sats"
        destination="bc1q…"
      />
    </Frame>
  ),
}

export const EvidenceAdmission: Story = {
  render: () => (
    <Frame wide>
      <ImmortalEvidenceLedger items={evidence} />
    </Frame>
  ),
}
export const VerificationClean: Story = {
  render: () => (
    <Frame>
      <ImmortalVerificationSummary
        fundingAuthorized={false}
        statusGaps={0}
        statusForks={0}
        invalidClaims={0}
      />
    </Frame>
  ),
}
export const VerificationRefused: Story = {
  render: () => (
    <Frame>
      <ImmortalVerificationSummary
        fundingAuthorized={false}
        statusGaps={1}
        statusForks={0}
        invalidClaims={1}
      />
    </Frame>
  ),
}

export const KeylessRecovery: Story = {
  render: () => (
    <Frame>
      <ImmortalRecoveryPlan
        path="keyless_exit"
        timelock="144 blocks"
        packageDigest="exit_51ad…f9b2"
        state="actionable"
      />
    </Frame>
  ),
}
export const WatchingRefund: Story = {
  render: () => (
    <Frame>
      <ImmortalRecoveryPlan
        path="script_refund"
        timelock="72 blocks remaining"
        packageDigest="refund_90e1…2ac7"
        state="watching"
      />
    </Frame>
  ),
}

export const CompleteVerifiedSession: Story = {
  render: () => (
    <Frame wide>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ImmortalOfferingCard
            provider="provider-a · 9ec5…7a21"
            input="LN"
            output="BTC"
            minimum="50,000"
            maximum="5,000,000"
            feeBps="40"
            quoteLifetime="10 minutes"
          />
          <ImmortalReservation
            provider="9ec5…7a21"
            amount="250,000 sats"
            expiresIn="08:42"
            state="soft"
          />
          <ImmortalVerificationSummary
            fundingAuthorized={false}
            statusGaps={0}
            statusForks={0}
            invalidClaims={0}
          />
        </div>
        <ImmortalMarketRecordChain records={records} />
      </div>
      <ImmortalEvidenceLedger items={evidence} />
    </Frame>
  ),
}
