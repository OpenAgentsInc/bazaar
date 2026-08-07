import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { BoltzScreenPreview } from "@/components/boltz/reference-showcase"
import { boltzReferenceScreens } from "@/components/boltz/reference-catalog"

function findScreen(name: string) {
  const screen = boltzReferenceScreens.find((entry) => entry.name === name)
  if (!screen) throw new globalThis.Error(`Unknown Boltz screen: ${name}`)
  return screen
}

function screenStory(name: string): Story {
  return {
    render: () => (
      <Frame>
        <BoltzScreenPreview entry={findScreen(name)} />
      </Frame>
    ),
  }
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-8">
      <div className="mx-auto max-w-3xl">{children}</div>
    </div>
  )
}

const meta = {
  title: "Boltz/Reference Screens",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const AllScreens: Story = {
  render: () => (
    <div className="dark min-h-svh overflow-auto bg-background p-5 text-foreground sm:p-8">
      <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-2">
        {boltzReferenceScreens.map((entry) => (
          <BoltzScreenPreview key={entry.path} entry={entry} />
        ))}
      </div>
    </div>
  ),
}

export const ClaimRescue = screenStory("ClaimRescue")
export const Create = screenStory("Create")
export const Error = screenStory("Error")
export const ErrorWasm = screenStory("ErrorWasm")
export const FeeComparison = screenStory("FeeComparison")
export const GasAbstractionSweepRescue = screenStory(
  "GasAbstractionSweepRescue"
)
export const Hero = screenStory("Hero")
export const History = screenStory("History")
export const NotFound = screenStory("NotFound")
export const Pay = screenStory("Pay")
export const Privacy = screenStory("Privacy")
export const RefundEvm = screenStory("RefundEvm")
export const RefundRescue = screenStory("RefundRescue")
export const Rescue = screenStory("Rescue")
export const RescueEvm = screenStory("RescueEvm")
export const Terms = screenStory("Terms")
export const Btcpay = screenStory("Btcpay")
export const Client = screenStory("Client")
export const Pro = screenStory("Pro")
export const Products = screenStory("Products")
export const MethodSelection = screenStory("MethodSelection")
export const Recovery = screenStory("Recovery")
export const Results = screenStory("Results")
