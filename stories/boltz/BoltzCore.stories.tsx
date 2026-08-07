import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState, type PropsWithChildren } from "react"
import { expect, fn, userEvent, within } from "storybook/test"

import { BoltzAmountPanel } from "@/components/boltz/amount-panel"
import { BoltzAssetSelector } from "@/components/boltz/asset-selector"
import { BoltzCopyBox } from "@/components/boltz/copy-box"
import { BoltzFeeBreakdown } from "@/components/boltz/fee-breakdown"
import { BoltzSettingsPanel } from "@/components/boltz/settings-panel"
import {
  BoltzSwapHistory,
  type BoltzSwapHistoryItem,
} from "@/components/boltz/swap-history"
import { BoltzSwapStatus } from "@/components/boltz/swap-status"
import { getBoltzAsset, type BoltzAsset } from "@/components/boltz/types"
import { Button } from "@/components/ui/button"

const lightning = getBoltzAsset("LN")
const bitcoin = getBoltzAsset("BTC")
const liquid = getBoltzAsset("LBTC")

const feeItems = [
  { label: "Provider fee", value: "1,000 sats", detail: "Signed quote · 0.4%" },
  {
    label: "Miner fee budget",
    value: "4,000 sats",
    detail: "Claim transaction ceiling",
  },
  { label: "Routing fee", value: "0 sats", detail: "Included on this route" },
]

const historyItems: BoltzSwapHistoryItem[] = [
  {
    id: "swap_91d2…8a4f",
    createdAt: "2 minutes ago",
    from: lightning,
    to: bitcoin,
    amount: "245,000 sats",
    status: "Claimable",
    private: true,
  },
  {
    id: "swap_83ab…12e9",
    createdAt: "Yesterday",
    from: liquid,
    to: lightning,
    amount: "78,500 sats",
    status: "Complete",
  },
]

function StoryFrame({
  children,
  wide = false,
}: PropsWithChildren<{ wide?: boolean }>) {
  return (
    <div className="dark min-h-svh bg-background p-6 text-foreground sm:p-10">
      <div
        className={
          wide ? "mx-auto w-full max-w-4xl" : "mx-auto w-full max-w-[31rem]"
        }
      >
        {children}
      </div>
    </div>
  )
}

function StatefulAssetSelector() {
  const [asset, setAsset] = useState(lightning)
  return <BoltzAssetSelector value={asset} onValueChange={setAsset} />
}

function StatefulAmountPanel() {
  const [asset, setAsset] = useState(lightning)
  const [value, setValue] = useState("250000")
  return (
    <BoltzAmountPanel
      side="Send"
      asset={asset}
      value={value}
      onValueChange={setValue}
      onAssetChange={setAsset}
      onMax={() => setValue("5000000")}
      hint="Min 50,000 · Max 5,000,000 sats"
    />
  )
}

function StatefulSettingsPanel() {
  const [bitcoinOnly, setBitcoinOnly] = useState(false)
  const [zeroConf, setZeroConf] = useState(true)
  const [privacyMode, setPrivacyMode] = useState(true)
  return (
    <BoltzSettingsPanel
      bitcoinOnly={bitcoinOnly}
      zeroConf={zeroConf}
      privacyMode={privacyMode}
      onBitcoinOnlyChange={setBitcoinOnly}
      onZeroConfChange={setZeroConf}
      onPrivacyModeChange={setPrivacyMode}
    />
  )
}

function ComposedSwap() {
  const [sendAsset, setSendAsset] = useState(lightning)
  const [receiveAsset, setReceiveAsset] = useState(bitcoin)
  const [amount, setAmount] = useState("250000")

  function selectSendAsset(asset: BoltzAsset) {
    setSendAsset(asset)
    if (asset.ticker === receiveAsset.ticker) setReceiveAsset(lightning)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,0.78fr)]">
      <main className="rounded-2xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-4">
          <p className="font-mono text-[0.6875rem] tracking-wide text-primary uppercase">
            Boltz route
          </p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">
            Create an atomic swap
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Review the route, limits, and signed fee ceiling before funding.
          </p>
        </div>
        <div className="space-y-2">
          <BoltzAmountPanel
            side="Send"
            asset={sendAsset}
            value={amount}
            onValueChange={setAmount}
            onAssetChange={selectSendAsset}
            onMax={() => setAmount("5000000")}
            hint="Min 50,000 · Max 5,000,000 sats"
          />
          <BoltzAmountPanel
            side="Receive"
            asset={receiveAsset}
            value="245000"
            readOnly
            loading={false}
            onAssetChange={setReceiveAsset}
            hint="Best signed quote · 2 providers"
          />
        </div>
        <div className="mt-3">
          <BoltzFeeBreakdown total="5,000" items={feeItems} />
        </div>
        <Button className="mt-4 h-10 w-full">Review swap</Button>
      </main>
      <aside className="space-y-4">
        <BoltzSwapStatus
          title="Swap swap_91d2…8a4f"
          status="In progress"
          stages={[
            {
              label: "Quote accepted",
              detail: "Provider signature verified",
              state: "complete",
            },
            {
              label: "Payment detected",
              detail: "Waiting for one confirmation",
              state: "current",
            },
            { label: "Claim available", state: "pending" },
          ]}
        />
        <BoltzCopyBox
          label="Refund address"
          value="bc1q8ugrjfz3p4m9gke0f73mlk6hd4y2qx7sn2v4ag"
        />
      </aside>
    </div>
  )
}

const meta = {
  title: "Boltz/Core Components",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AssetSelector: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulAssetSelector />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /select asset: lightning/i })
    )
    const dialog = within(canvasElement.ownerDocument.body)
    await userEvent.type(
      dialog.getByLabelText("Search assets and networks"),
      "on-chain"
    )
    await userEvent.click(dialog.getByRole("option", { name: /bitcoin/i }))
    await expect(
      canvas.getByRole("button", { name: /select asset: bitcoin/i })
    ).toBeVisible()
  },
}

export const AmountEntry: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulAmountPanel />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Max" }))
    await expect(canvas.getByLabelText("Send amount in LN")).toHaveValue(
      "5000000"
    )
  },
}

export const QuoteLoading: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzAmountPanel
      side="Receive"
      asset={bitcoin}
      value=""
      loading
      onAssetChange={fn()}
      hint="Requesting signed quotes…"
    />
  ),
}

export const FeeDisclosure: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <BoltzFeeBreakdown total="5,000" items={feeItems} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /fees/i }))
    await expect(canvas.getByText("Provider fee")).toBeVisible()
  },
}

export const CopyablePaymentDetail: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzCopyBox
      label="Bitcoin address"
      value="bc1q8ugrjfz3p4m9gke0f73mlk6hd4y2qx7sn2v4ag"
    />
  ),
}

export const SwapLifecycle: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzSwapStatus
      title="Submarine swap"
      status="Awaiting claim"
      stages={[
        { label: "Invoice paid", detail: "250,000 sats", state: "complete" },
        {
          label: "Transaction confirmed",
          detail: "1 of 1 confirmations",
          state: "complete",
        },
        {
          label: "Claim transaction",
          detail: "Broadcasting to Bitcoin",
          state: "current",
        },
        { label: "Swap complete", state: "pending" },
      ]}
    />
  ),
}

export const RecentSwaps: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <BoltzSwapHistory items={historyItems} onSelect={fn()} />,
}

export const SwapSettings: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulSettingsPanel />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const bitcoinOnly = canvas.getByRole("switch", { name: "Bitcoin only" })
    await userEvent.click(bitcoinOnly)
    await expect(bitcoinOnly).toBeChecked()
  },
}

export const ComposedSwapSurface: Story = {
  decorators: [
    (Story) => (
      <StoryFrame wide>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <ComposedSwap />,
}
