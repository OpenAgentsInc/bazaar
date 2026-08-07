import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState, type PropsWithChildren } from "react"
import { expect, fn, userEvent, within } from "storybook/test"

import {
  AmountField,
  AssetIcon,
  AssetPicker,
  EvidenceValue,
  FundedAmountField,
  FundedEvidencePanel,
  FundedRuntimeDisclosure,
  FundedSwapContent,
  LifecyclePanel,
  QuoteRow,
  QuoteSummary,
  RuntimeDisclosure,
  RuntimePopover,
  VerificationTile,
} from "@/components/swap-page"
import type { MarketAssetTicker } from "@/lib/immortal/market"

import {
  ASSETS,
  FUNDED_SESSION,
  INACTIVE_FUNDED_RUNTIME,
  LIGHTNING_TO_BITCOIN,
  LIVE_STATUS,
  MOCK_PROVENANCE,
  QUOTE_B,
  READY_FUNDED_RUNTIME,
  READY_QUOTES,
  RUNNING_LIFECYCLE,
  UNAVAILABLE_FUNDED_CONFIG,
} from "./fixtures"

function StoryFrame({ children }: PropsWithChildren) {
  return (
    <div className="dark min-h-svh bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto w-full max-w-[31rem]">{children}</div>
    </div>
  )
}

function StatefulAssetPicker() {
  const [ticker, setTicker] = useState<MarketAssetTicker>("LN")
  return (
    <div className="relative h-20 rounded-xl border border-border bg-secondary">
      <AssetPicker
        ticker={ticker}
        options={ASSETS}
        onValueChange={setTicker}
        label="Select an asset"
      />
    </div>
  )
}

function StatefulAmountField() {
  const [amount, setAmount] = useState("250000")
  const [ticker, setTicker] = useState<MarketAssetTicker>("LN")
  return (
    <AmountField
      side="Send"
      amount={amount}
      ticker={ticker}
      options={ASSETS}
      onAmountChange={setAmount}
      onAssetChange={setTicker}
      hint="Min 50,000 · Max 5,000,000 sats"
    />
  )
}

const meta = {
  title: "Swap/Individual Components",
  parameters: {
    layout: "fullscreen",
  },
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

export const AssetIcons: Story = {
  render: () => (
    <div className="flex items-center gap-5 rounded-xl border border-border bg-card p-4">
      {ASSETS.map((asset) => (
        <div key={asset.ticker} className="flex items-center gap-2">
          <AssetIcon ticker={asset.ticker} />
          <span className="text-sm font-semibold">{asset.ticker}</span>
        </div>
      ))}
    </div>
  ),
}

export const AssetSelector: Story = {
  render: () => <StatefulAssetPicker />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("combobox", { name: "Select an asset" })
    )
    await userEvent.click(within(document.body).getByText("Bitcoin"))
    await expect(
      canvas.getByRole("combobox", { name: "Select an asset" })
    ).toHaveTextContent("BTC")
  },
}

export const SendAmountField: Story = {
  render: () => <StatefulAmountField />,
  play: async ({ canvasElement }) => {
    const amount = within(canvasElement).getByLabelText("Send")
    await userEvent.clear(amount)
    await userEvent.type(amount, "125000")
    await expect(amount).toHaveValue("125000")
  },
}

export const SelectedQuoteSummary: Story = {
  render: () => (
    <QuoteSummary quotes={READY_QUOTES} direction={LIGHTNING_TO_BITCOIN} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /2 providers/i }))
    await expect(canvas.getByText("Provider A")).toBeVisible()
    await expect(canvas.getByText("Provider B")).toBeVisible()
  },
}

export const SelectedQuoteRow: Story = {
  render: () => <QuoteRow quote={QUOTE_B} selected />,
}

export const RunningLifecycle: Story = {
  render: () => <LifecyclePanel lifecycle={RUNNING_LIFECYCLE} />,
}

export const LiveRuntimeStatus: Story = {
  render: () => <RuntimeDisclosure status={LIVE_STATUS} />,
}

export const InactiveFundedRuntime: Story = {
  render: () => <FundedRuntimeDisclosure runtime={INACTIVE_FUNDED_RUNTIME} />,
}

export const VerifiedRailTile: Story = {
  render: () => (
    <VerificationTile
      label="Local rails"
      value="BTC + LN verified"
      detail="Immortal requester verification"
      verified
    />
  ),
}

export const FundedAmount: Story = {
  render: () => (
    <FundedAmountField
      side="Send"
      ticker="BTC"
      amount="150000"
      hint="150,000 sats · exact effect"
    />
  ),
}

export const FundedSwapReady: Story = {
  render: () => (
    <FundedSwapContent runtime={READY_FUNDED_RUNTIME} onAuthorize={fn()} />
  ),
}

export const PublicEvidence: Story = {
  render: () => <FundedEvidencePanel session={FUNDED_SESSION} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: "Public-safe evidence" })
    )
    await expect(canvas.getByText("Requester key")).toBeVisible()
  },
}

export const CopyableEvidenceValue: Story = {
  render: () => (
    <div className="rounded-xl border border-border bg-secondary p-3">
      <EvidenceValue label="Session ID" value={"a".repeat(64)} />
    </div>
  ),
}

export const SwapSettings: Story = {
  render: () => (
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
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Swap settings" })
    await userEvent.click(trigger)
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(
      await within(canvasElement.ownerDocument.body).findByText("Immortal live")
    ).toBeVisible()
  },
}
