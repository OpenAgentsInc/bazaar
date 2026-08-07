import { expect, test } from "@playwright/test"

const ADDRESS =
  "bcrt1pvcpgfdxvvnklep6kdyewn80pphta54nwwrex3ahrvh2uh0e9dgwsalmcu5"

test("destination field reports typed regtest validation accessibly", async ({
  page,
}) => {
  await page.goto("/")
  const destination = page.getByLabel(
    "Enter a bcrt1 address to receive Bitcoin"
  )

  await destination.fill(
    "bc1pqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqpqqenm"
  )
  const validation = page.locator("#destination-validation")
  await expect(destination).toHaveAttribute("aria-invalid", "true")
  await expect(validation).toHaveAttribute("role", "alert")
  await expect(validation).toHaveText("Use a Bitcoin regtest destination.")

  await destination.fill(` ${ADDRESS}`)
  await expect(validation).toHaveText(
    "Remove leading, trailing, or embedded whitespace."
  )

  await destination.fill(ADDRESS)
  await expect(destination).toHaveAttribute("aria-invalid", "false")
  await expect(page.getByText("Regtest address verified locally")).toBeVisible()
  await expect(
    page.getByText(/BOLT12, LNURL, and Liquid unavailable/)
  ).toHaveCount(0)
})
