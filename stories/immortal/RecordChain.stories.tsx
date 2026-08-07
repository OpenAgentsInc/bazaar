import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import {
  ImmortalRecordChainViz,
  type RecordChainEntry,
} from "@/components/viz/immortal/record-chain"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">{children}</div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-3 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      <div className="overflow-x-auto">{children}</div>
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Record Chain",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

const HAPPY: readonly RecordChainEntry[] = [
  { type: "RFQ", kind: 39604, author: "requester", state: "verified" },
  { type: "Quote", kind: 39605, author: "provider", state: "verified" },
  { type: "Order", kind: 39606, author: "requester", state: "verified" },
  { type: "Contract", kind: 39610, author: "requester", state: "verified" },
  { type: "Status", kind: 39607, author: "provider", state: "current" },
  { type: "Close", kind: 39609, author: "provider", state: "pending" },
]

const CANCELLED: readonly RecordChainEntry[] = [
  { type: "RFQ", kind: 39604, author: "requester", state: "verified" },
  { type: "Quote", kind: 39605, author: "provider", state: "verified" },
  { type: "Order", kind: 39606, author: "requester", state: "verified" },
  { type: "Cancel", kind: 39608, author: "requester", state: "refused" },
  { type: "Close", kind: 39609, author: "provider", state: "current" },
]

export const HappyPath: Story = {
  render: () => (
    <Frame>
      <Panel title="Authorship rhythm — requester lane above, provider below">
        <ImmortalRecordChainViz records={HAPPY} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /Signed record chain/ })
    ).toBeInTheDocument()
  },
}

export const CancelPath: Story = {
  render: () => (
    <Frame>
      <Panel title="Cancellation — the chain still terminates in a Close">
        <ImmortalRecordChainViz records={CANCELLED} />
      </Panel>
    </Frame>
  ),
}
