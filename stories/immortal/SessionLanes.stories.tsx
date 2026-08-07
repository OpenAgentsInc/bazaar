import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import {
  ImmortalSessionLanes,
  type SessionStatusRecord,
} from "@/components/viz/immortal/session-lanes"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">{children}</div>
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Session Sequence",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

// Reverse swap happy path (matches the fixture quotes' swapType).
const PROVIDER_HAPPY: readonly SessionStatusRecord[] = [
  { seq: 0, swpState: "accepted", rung: "reserved" },
  { seq: 1, swpState: "hold_invoice_ready", rung: "pledged" },
  {
    seq: 2,
    swpState: "lightning_htlcs_held",
    rung: "measured",
    requiresCounterpartySeq: 1,
  },
  { seq: 3, swpState: "provider_lock_terms_ready", rung: "pledged" },
  { seq: 4, swpState: "provider_funding_broadcast", rung: "measured" },
  { seq: 5, swpState: "funding_final", rung: "measured" },
  {
    seq: 6,
    swpState: "lightning_paid",
    rung: "paid",
    requiresCounterpartySeq: 4,
  },
]

const REQUESTER_HAPPY: readonly SessionStatusRecord[] = [
  {
    seq: 0,
    swpState: "requester_invoice_verified",
    rung: "verified",
    requiresCounterpartySeq: 1,
  },
  { seq: 1, swpState: "lightning_payment_pending", rung: "measured" },
  {
    seq: 2,
    swpState: "requester_lock_verified",
    rung: "verified",
    requiresCounterpartySeq: 3,
  },
  {
    seq: 3,
    swpState: "requester_claim_pending",
    rung: "verified",
    requiresCounterpartySeq: 5,
  },
  { seq: 4, swpState: "requester_claimed", rung: "settled" },
]

export const HappyPath: Story = {
  render: () => (
    <Frame>
      <ImmortalSessionLanes
        provider={PROVIDER_HAPPY}
        requester={REQUESTER_HAPPY}
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /Session sequence/ })
    ).toBeInTheDocument()
    // The sr-only mirror carries the causal-gate semantics.
    await expect(
      canvas.getByText(/requester_claim_pending .*requires counterparty seq 5/)
    ).toBeInTheDocument()
  },
}

export const StatusGap: Story = {
  render: () => (
    <Frame>
      <ImmortalSessionLanes
        provider={PROVIDER_HAPPY.filter((record) => record.seq !== 3)}
        requester={REQUESTER_HAPPY.slice(0, 3)}
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("missing (gap)")).toBeInTheDocument()
  },
}

export const StatusFork: Story = {
  render: () => (
    <Frame>
      <ImmortalSessionLanes
        provider={[
          ...PROVIDER_HAPPY.slice(0, 5),
          {
            seq: 4,
            swpState: "provider_refund_prepared",
            rung: "pledged",
          },
        ]}
        requester={REQUESTER_HAPPY.slice(0, 4)}
      />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Both records at seq 4 are retained and displayed, never collapsed.
    await expect(
      canvas.getByText(/provider_funding_broadcast .* \/ provider_refund_prepared/)
    ).toBeInTheDocument()
  },
}

export const CausalGateHighlight: Story = {
  render: () => (
    <Frame>
      <div className="rounded-2xl border border-border p-4">
        <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
          Cross-participant causal gates
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Each action Status carries exactly one e-tag naming the counterparty
          Status it requires. Relay arrival order and created_at never
          establish the edge — hover a gate to trace it.
        </p>
        <ImmortalSessionLanes
          provider={PROVIDER_HAPPY}
          requester={REQUESTER_HAPPY}
        />
      </div>
    </Frame>
  ),
}
