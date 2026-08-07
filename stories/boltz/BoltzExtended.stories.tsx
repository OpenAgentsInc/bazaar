import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { useState, type PropsWithChildren } from "react"
import { expect, fn, userEvent, within } from "storybook/test"

import {
  BoltzDestinationInput,
  type BoltzDestinationKind,
  type BoltzDestinationStatus,
} from "@/components/boltz/destination-input"
import {
  BoltzFeeComparisonTable,
  type BoltzFeeOpportunity,
} from "@/components/boltz/fee-comparison-table"
import { BoltzOptimizedRoute } from "@/components/boltz/optimized-route"
import { BoltzPagination } from "@/components/boltz/pagination"
import { BoltzPaymentRequest } from "@/components/boltz/payment-request"
import {
  BoltzRecoveryFileInput,
  BoltzRecoveryKeyFlow,
} from "@/components/boltz/recovery-key-flow"
import { BoltzSwapLimits } from "@/components/boltz/swap-limits"
import { getBoltzAsset } from "@/components/boltz/types"

const lightning = getBoltzAsset("LN")
const bitcoin = getBoltzAsset("BTC")
const liquid = getBoltzAsset("LBTC")

const feeOpportunities: BoltzFeeOpportunity[] = [
  {
    id: "ln-btc",
    from: lightning,
    to: bitcoin,
    optimizedFee: 0.4,
    regularFee: 0.75,
  },
  {
    id: "lbtc-ln",
    from: liquid,
    to: lightning,
    optimizedFee: 0.1,
    regularFee: 0.5,
  },
]

const paymentAddress = "bc1q8ugrjfz3p4m9gke0f73mlk6hd4y2qx7sn2v4ag"
const paymentUri = `bitcoin:${paymentAddress}?amount=0.0025`

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

function StatefulDestinationInput() {
  const [value, setValue] = useState("")
  const [status, setStatus] = useState<BoltzDestinationStatus>("idle")
  const [kind, setKind] = useState<BoltzDestinationKind>()

  function change(nextValue: string) {
    setValue(nextValue)
    if (!nextValue) {
      setStatus("idle")
      setKind(undefined)
      return
    }
    if (nextValue.startsWith("lnbc")) {
      setStatus("valid")
      setKind("invoice")
      return
    }
    setStatus("invalid")
    setKind(undefined)
  }

  return (
    <BoltzDestinationInput
      value={value}
      onValueChange={change}
      status={status}
      kind={kind}
      error="This is not a valid Bitcoin or Lightning destination."
    />
  )
}

function StatefulPagination() {
  const [page, setPage] = useState(1)
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-4 min-h-20 rounded-xl bg-secondary p-3 text-sm text-foreground">
        Showing swaps {(page - 1) * 15 + 1}–{page * 15}
      </div>
      <BoltzPagination
        currentPage={page}
        totalPages={8}
        onPageChange={setPage}
      />
    </div>
  )
}

function StatefulRecoveryFile() {
  const [fileName, setFileName] = useState<string>()
  return (
    <BoltzRecoveryFileInput
      fileName={fileName}
      onFileChange={(file) => setFileName(file.name)}
      onClear={() => setFileName(undefined)}
    />
  )
}

function FundingCheckpoint() {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <BoltzRecoveryKeyFlow onDownload={fn()} onVerify={async () => true} />
      <BoltzPaymentRequest
        asset={bitcoin}
        amount="0.00250000"
        address={paymentAddress}
        paymentUri={paymentUri}
        expiresAt="10:52 AM"
        routeSavings="1,420"
      />
    </div>
  )
}

const meta = {
  title: "Boltz/Extended Components",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SwapLimit: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <div className="flex items-center justify-between rounded-xl border border-border bg-secondary p-3">
      <span className="text-xs text-muted-foreground">
        Available balance · 5,000,000 sats
      </span>
      <BoltzSwapLimits maximum="5000000" onSelectMaximum={fn()} />
    </div>
  ),
}

export const LoadingSwapLimit: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <BoltzSwapLimits maximum="" loading onSelectMaximum={fn()} />,
}

export const DestinationValidation: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulDestinationInput />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Destination")
    await userEvent.type(input, "not-an-invoice")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await userEvent.clear(input)
    await userEvent.type(input, "lnbc2500n1pvalid")
    await expect(canvas.getByText("BOLT11 invoice detected")).toBeVisible()
  },
}

export const OptimizedRoute: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzOptimizedRoute
      saved="1,420"
      asset="sats"
      description="The selected route avoids an extra settlement hop."
    />
  ),
}

export const FeeOpportunities: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzFeeComparisonTable opportunities={feeOpportunities} onSelect={fn()} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", {
        name: "Select Lightning to Bitcoin",
      })
    ).toBeVisible()
    await expect(canvas.getByText("0.75%")).toBeVisible()
  },
}

export const EmptyFeeOpportunities: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <BoltzFeeComparisonTable opportunities={[]} />,
}

export const HistoryPagination: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulPagination />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Next page" }))
    await expect(canvas.getByText("Page 2 of 8")).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: "Page 2" })
    ).toHaveAttribute("aria-current", "page")
  },
}

export const RecoveryFileInput: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <StatefulRecoveryFile />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText("Choose recovery key file")
    const file = new File(["{}"], "bazaar-recovery.json", {
      type: "application/json",
    })
    await userEvent.upload(input, file)
    await expect(canvas.getByText("bazaar-recovery.json")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Clear recovery key file" })
    )
    await expect(canvas.getByText("Choose recovery key file")).toBeVisible()
  },
}

export const RecoveryKeyFlow: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzRecoveryKeyFlow onDownload={fn()} onVerify={async () => true} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(
      canvas.getByRole("button", { name: /download recovery key/i })
    )
    const input = canvas.getByLabelText("Choose recovery key file")
    await userEvent.upload(
      input,
      new File(["{}"], "bazaar-recovery.json", {
        type: "application/json",
      })
    )
    await expect(canvas.getByText("Recovery key verified")).toBeVisible()
  },
}

export const OnchainPaymentRequest: Story = {
  decorators: [
    (Story) => (
      <StoryFrame>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => (
    <BoltzPaymentRequest
      asset={bitcoin}
      amount="0.00250000"
      address={paymentAddress}
      paymentUri={paymentUri}
      expiresAt="10:52 AM"
      routeSavings="1,420"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      await canvas.findByAltText("Payment QR code for Bitcoin")
    ).toBeVisible()
    await expect(
      canvas.getByRole("link", { name: /open in wallet/i })
    ).toHaveAttribute("href", paymentUri)
  },
}

export const FundingSafetyCheckpoint: Story = {
  decorators: [
    (Story) => (
      <StoryFrame wide>
        <Story />
      </StoryFrame>
    ),
  ],
  render: () => <FundingCheckpoint />,
}
