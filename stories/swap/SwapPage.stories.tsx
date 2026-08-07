import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"

import { SwapPage } from "@/components/swap-page"

import { UNAVAILABLE_CONFIG, UNAVAILABLE_FUNDED_CONFIG } from "./fixtures"

const meta = {
  title: "Swap/Complete Swap Card",
  component: SwapPage,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    config: UNAVAILABLE_CONFIG,
    fundedConfig: UNAVAILABLE_FUNDED_CONFIG,
  },
} satisfies Meta<typeof SwapPage>

export default meta
type Story = StoryObj<typeof meta>

export const ReadyToSwap: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const sendAmount = canvas.getByLabelText("Send")
    const destination = canvas.getByPlaceholderText(
      "Enter BTC address to receive funds"
    )
    const submit = canvas.getByRole("button", { name: "Create Swap" })

    await expect(canvas.getByLabelText("Receive")).toHaveValue("245000")
    await expect(submit).toBeDisabled()

    await userEvent.type(sendAmount, "250000")
    await userEvent.type(destination, "bcrt1qstorybookdestination")

    await expect(submit).toBeEnabled()
  },
}
