import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { BoltzReferenceCard } from "@/components/boltz/reference-showcase"
import {
  boltzReferenceStatuses,
  type BoltzReferenceEntry,
} from "@/components/boltz/reference-catalog"

function findStatus(name: string) {
  const status = boltzReferenceStatuses.find((entry) => entry.name === name)
  if (!status) throw new Error(`Unknown Boltz status: ${name}`)
  return status
}

function statusStory(name: string): Story {
  return {
    render: () => (
      <Frame>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <BoltzReferenceCard entry={findStatus(name)} />
        </div>
      </Frame>
    ),
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-6 text-foreground sm:p-10">
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  )
}

const meta = {
  title: "Boltz/Lifecycle Statuses",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllStatuses: Story = {
  render: () => (
    <div className="dark min-h-svh overflow-auto bg-background p-5 text-foreground sm:p-8">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-xl border border-border bg-card">
        {boltzReferenceStatuses.map((entry: BoltzReferenceEntry) => (
          <BoltzReferenceCard key={entry.path} entry={entry} />
        ))}
      </div>
    </div>
  ),
}

export const Broadcasting = statusStory("Broadcasting")
export const CommitmentCreated = statusStory("CommitmentCreated")
export const CommitmentRejected = statusStory("CommitmentRejected")
export const InvoiceExpired = statusStory("InvoiceExpired")
export const InvoiceFailedToPay = statusStory("InvoiceFailedToPay")
export const InvoicePending = statusStory("InvoicePending")
export const InvoiceSet = statusStory("InvoiceSet")
export const PreBridgeDexQuoteBlocked = statusStory("PreBridgeDexQuoteBlocked")
export const SwapCreated = statusStory("SwapCreated")
export const SwapExpired = statusStory("SwapExpired")
export const SwapRefunded = statusStory("SwapRefunded")
export const TransactionClaimed = statusStory("TransactionClaimed")
export const TransactionConfirmed = statusStory("TransactionConfirmed")
export const TransactionLockupFailed = statusStory("TransactionLockupFailed")
export const TransactionMempool = statusStory("TransactionMempool")
