import { expect, test } from "@playwright/test"

test("authorizes both exact funded effects once and presents only local rail proof", async ({
  page,
  request,
}) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Swap settings" }).click()
  await page.getByLabel("Swap mode").click()
  await page.getByRole("option", { name: "Regtest · Funded" }).click()

  const funded = page.locator('[aria-label="Funded regtest swap"]')
  await expect(funded).toHaveAttribute("data-funded-state", "ready")
  await expect(funded).toHaveAttribute("data-funded-journey", "submarine")
  await expect(page.getByText("Counterparty claim · unverified")).toBeVisible()
  await expect(page.getByText(/settled/i)).toHaveCount(0)

  await page
    .getByRole("button", { name: "Authorize Bitcoin funding broadcast" })
    .click()
  await expect(funded).toHaveAttribute("data-funded-state", "authorizing")
  await page.reload()

  await expect(funded).toHaveAttribute("data-funded-journey", "reverse", {
    timeout: 15_000,
  })
  await expect(funded).toHaveAttribute("data-funded-state", "ready")
  let health = await request.get("http://127.0.0.1:18183/health")
  expect((await health.json()).rail_calls).toEqual({ submarine: 1, reverse: 0 })

  const restart = await request.post("http://127.0.0.1:18183/control/restart")
  expect(restart.status()).toBe(202)
  await expect(funded).toHaveAttribute("data-funded-state", "error")
  await expect(funded).toHaveAttribute("data-funded-state", "ready")

  await page
    .getByRole("button", { name: "Authorize Lightning invoice payment" })
    .click()
  await expect(funded).toHaveAttribute("data-funded-state", "complete", {
    timeout: 15_000,
  })
  await expect(
    page.getByText("Both local regtest rails verified by Immortal.")
  ).toBeVisible()
  await expect(page.getByText("BTC + LN verified")).toBeVisible()
  await expect(page.getByText(/settled/i)).toHaveCount(0)

  await page.getByRole("button", { name: "Public-safe evidence" }).click()
  await expect(
    page.getByRole("button", { name: "Copy Provider key" })
  ).toHaveCount(2)
  await expect(
    page.getByRole("button", { name: "Copy Lockup txid" })
  ).toHaveCount(2)
  await expect(
    page.getByRole("button", { name: "Copy Payment hash" })
  ).toHaveCount(2)

  health = await request.get("http://127.0.0.1:18183/health")
  let healthBody = await health.json()
  expect(healthBody.rail_calls).toEqual({ submarine: 1, reverse: 1 })
  expect(healthBody.adapter_restarts).toBe(1)

  await page.reload()
  await expect(funded).toHaveAttribute("data-funded-state", "complete", {
    timeout: 15_000,
  })
  health = await request.get("http://127.0.0.1:18183/health")
  healthBody = await health.json()
  expect(healthBody.rail_calls).toEqual({ submarine: 1, reverse: 1 })
  expect(healthBody.adapter_restarts).toBe(1)
})
