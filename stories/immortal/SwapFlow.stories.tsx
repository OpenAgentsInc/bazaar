import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"

import { ImmortalSwapFlow } from "@/components/viz/immortal/swap-flow"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-4xl space-y-4">{children}</div>
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Swap Flow",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Replay: Story = {
  render: () => (
    <Frame>
      <ImmortalSwapFlow />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("button", { name: "Play replay" })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Previous step" })
    ).toBeDisabled()
    // Step forward and confirm the caption advances.
    await userEvent.click(canvas.getByRole("button", { name: "Next step" }))
    await expect(
      canvas.getByText("Encrypted RFQ delivered")
    ).toBeInTheDocument()
  },
}

export const OfferingsDiscovered: Story = {
  render: () => (
    <Frame>
      <ImmortalSwapFlow initialStep={0} />
    </Frame>
  ),
}

export const QuoteRace: Story = {
  render: () => (
    <Frame>
      <ImmortalSwapFlow initialStep={2} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByText("Signed quotes race back")
    ).toBeInTheDocument()
  },
}

export const OrderSelectsProvider: Story = {
  render: () => (
    <Frame>
      <ImmortalSwapFlow initialStep={3} />
    </Frame>
  ),
}

export const ZeroLossClose: Story = {
  render: () => (
    <Frame>
      <ImmortalSwapFlow initialStep={6} />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Zero-loss close")).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Next step" })
    ).toBeDisabled()
  },
}

export const ReducedMotionFrame: Story = {
  globals: { prefersReducedMotion: "reduce" },
  render: () => (
    <Frame>
      <ImmortalSwapFlow initialStep={2} />
    </Frame>
  ),
}
