import { expect, test } from "@playwright/test"

test("renders the complete Boltz component, status, and screen inventory", async ({
  page,
}) => {
  await page.goto("/boltz")

  await expect(
    page.getByRole("heading", {
      name: "Complete component and screen inventory",
    })
  ).toBeVisible()
  await expect(page.locator("[data-boltz-reference]")).toHaveCount(91)
  await expect(page.locator("[data-boltz-screen]")).toHaveCount(23)
  await expect(
    page.locator('[data-boltz-reference="BridgeSendRecovery"]')
  ).toBeVisible()
  await expect(
    page.locator('[data-boltz-screen="GasAbstractionSweepRescue"]')
  ).toBeAttached()
  await expect(page.getByText("114", { exact: true })).toBeVisible()
})
