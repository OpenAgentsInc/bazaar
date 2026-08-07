import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  BoltzReferenceCard,
  BoltzReferenceCatalog,
} from "@/components/boltz/reference-showcase"
import {
  boltzReferenceComponents,
  type BoltzReferenceKind,
} from "@/components/boltz/reference-catalog"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh overflow-auto bg-background p-5 text-foreground sm:p-8">
      <div className="mx-auto max-w-7xl">{children}</div>
    </div>
  )
}

function ComponentGroup({ kinds }: { kinds: BoltzReferenceKind[] }) {
  const entries = boltzReferenceComponents.filter((entry) =>
    kinds.includes(entry.kind)
  )
  return (
    <Frame>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {entries.map((entry) => (
          <BoltzReferenceCard key={entry.path} entry={entry} />
        ))}
      </div>
    </Frame>
  )
}

const meta = {
  title: "Boltz/Reference Components",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Foundations: Story = {
  render: () => <ComponentGroup kinds={["foundation"]} />,
}

export const InputsAndSelection: Story = {
  render: () => <ComponentGroup kinds={["input"]} />,
}

export const SwapAndQuotes: Story = {
  render: () => <ComponentGroup kinds={["swap"]} />,
}

export const PaymentsAndBridges: Story = {
  render: () => <ComponentGroup kinds={["payment"]} />,
}

export const WalletConnections: Story = {
  render: () => <ComponentGroup kinds={["wallet"]} />,
}

export const BackupAndRecovery: Story = {
  render: () => <ComponentGroup kinds={["recovery"]} />,
}

export const ShellAndFeedback: Story = {
  render: () => <ComponentGroup kinds={["shell"]} />,
}

export const Settings: Story = {
  render: () => <ComponentGroup kinds={["setting"]} />,
}

export const CompleteInventory: Story = {
  render: () => <BoltzReferenceCatalog />,
}
