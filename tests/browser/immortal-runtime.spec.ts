import { expect, test } from "@playwright/test"
import { readFile, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

test("browser loads pinned engine and connects directly to the authenticated relay", async ({
  page,
}) => {
  const webSockets: string[] = []
  const swapApiRequests: string[] = []
  page.on("websocket", (socket) => webSockets.push(socket.url()))
  page.on("request", (request) => {
    if (
      /\/api\/(?:swap|immortal|relay)/.test(new URL(request.url()).pathname)
    ) {
      swapApiRequests.push(request.url())
    }
  })

  await page.goto("/")
  await page.getByRole("button", { name: "Swap settings" }).click()
  const status = page.locator('[data-immortal-state="live"]')
  await expect(status).toBeVisible({ timeout: 30_000 })
  await expect(status).toContainText("Immortal live")
  await expect(status).toContainText(
    /\d+ signed offerings · 0 restored sessions/
  )
  await expect(page.getByText("DIRECT", { exact: true })).toBeVisible()
  await expect(page.getByText("NIP-42", { exact: true })).toBeVisible()
  expect(
    webSockets.some(
      (url) => url.startsWith("ws://127.0.0.1:") && !url.includes(":3102/")
    )
  ).toBe(true)
  expect(swapApiRequests).toEqual([])

  await page.reload()
  await page.getByRole("button", { name: "Swap settings" }).click()
  await expect(page.locator('[data-immortal-state="live"]')).toBeVisible({
    timeout: 30_000,
  })
  expect(swapApiRequests).toEqual([])
})

test("real topology returns two engine-verified signed Quotes", async ({
  page,
}) => {
  test.skip(
    !process.env.IMMORTAL_DEMO_MANIFEST,
    "requires scripts/dev-no-spend-demo.sh from Immortal"
  )

  await page.goto("/")
  await expect(page.getByText("Min 1,000 · Max 1,000 sats")).toBeVisible({
    timeout: 30_000,
  })
  await page.getByLabel("Send", { exact: true }).fill("1000")
  await expect(
    page.getByText("2 signed Quotes verified · best route selected")
  ).toBeVisible({
    timeout: 30_000,
  })

  await page.getByRole("button", { name: /2 providers/ }).click()
  await expect(page.locator("[data-quote-provider]")).toHaveCount(2)
  await expect(page.locator("[data-selected='true']")).toHaveCount(1)
  await expect(page.getByText("Exact signed output")).toBeVisible()
  await expect(page.getByLabel("Receive", { exact: true })).toHaveValue("890")

  await page.getByLabel("Bitcoin address").fill("bcrt1qimmortaldemoonly")
  await expect(page.getByRole("button", { name: "Create Swap" })).toBeEnabled()
})

test("real topology completes and restores the exact no-spend lifecycle", async ({
  page,
}) => {
  const manifest = process.env.IMMORTAL_DEMO_MANIFEST
  test.skip(!manifest, "requires scripts/dev-no-spend-demo.sh from Immortal")

  await page.goto("/")
  await expect(page.getByText("Min 1,000 · Max 1,000 sats")).toBeVisible({
    timeout: 30_000,
  })
  await page.getByLabel("Send", { exact: true }).fill("1000")
  await expect(
    page.getByText("2 signed Quotes verified · best route selected")
  ).toBeVisible({ timeout: 30_000 })
  await page.getByLabel("Bitcoin address").fill("bcrt1qimmortaldemoonly")
  await page.getByRole("button", { name: "Create Swap" }).click()

  await expect(
    page.locator(
      '[data-lifecycle-milestone="reservation_recorded"][data-complete="true"]'
    )
  ).toBeVisible({ timeout: 30_000 })
  const providerRole = await page
    .locator("[data-provider-role]")
    .getAttribute("data-provider-role")
  expect(providerRole).toMatch(/^provider-[ab]$/)
  const manifestBeforeRestart = JSON.parse(
    await readFile(manifest!, "utf8")
  ) as {
    providers: {
      role: string
      health: { state: string; restart_count: number }
    }[]
  }
  const previousRestartCount = manifestBeforeRestart.providers.find(
    (candidate) => candidate.role === providerRole
  )?.health.restart_count
  expect(previousRestartCount).toBeGreaterThanOrEqual(0)
  await writeFile(
    join(dirname(manifest!), "control", `restart-${providerRole}`),
    ""
  )
  await expect
    .poll(
      async () => {
        const document = JSON.parse(await readFile(manifest!, "utf8")) as {
          providers: {
            role: string
            health: { state: string; restart_count: number }
          }[]
        }
        const provider = document.providers.find(
          (candidate) => candidate.role === providerRole
        )
        return `${provider?.health.state}:${provider?.health.restart_count}`
      },
      { timeout: 30_000 }
    )
    .toBe(`ready:${(previousRestartCount ?? 0) + 1}`)

  for (const stage of [
    "reservation_recorded",
    "contracts_signed",
    "verification_passed",
    "cancellation_effective",
  ]) {
    await expect(
      page.locator(
        `[data-lifecycle-milestone="${stage}"][data-complete="true"]`
      )
    ).toBeVisible({ timeout: 30_000 })
    await page.reload()
  }

  await expect(page.locator('[data-lifecycle-state="complete"]')).toBeVisible({
    timeout: 30_000,
  })
  await expect(
    page.getByText("Demo complete — reservation released, 0 sats moved.")
  ).toBeVisible()
  await expect(
    page.locator('[data-lifecycle-milestone][data-complete="true"]')
  ).toHaveCount(8)
  await expect(
    page.getByRole("button", { name: "Run another demo" })
  ).toBeEnabled()

  await page.reload()
  await expect(page.locator('[data-lifecycle-state="complete"]')).toBeVisible({
    timeout: 30_000,
  })
  await expect(
    page.locator('[data-lifecycle-milestone][data-complete="true"]')
  ).toHaveCount(8)
})
