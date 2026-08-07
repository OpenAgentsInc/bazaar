import { expect, test } from "@playwright/test"

test("browser loads pinned engine and connects directly to the authenticated relay", async ({
  page,
}) => {
  const webSockets: string[] = []
  const swapApiRequests: string[] = []
  page.on("websocket", (socket) => webSockets.push(socket.url()))
  page.on("request", (request) => {
    if (/\/api\/(?:swap|immortal|relay)/.test(new URL(request.url()).pathname)) {
      swapApiRequests.push(request.url())
    }
  })

  await page.goto("/")
  await page.getByRole("button", { name: "Swap settings" }).click()
  const status = page.locator('[data-immortal-state="live"]')
  await expect(status).toBeVisible({ timeout: 30_000 })
  await expect(status).toContainText("Immortal live")
  await expect(status).toContainText(/\d+ signed offerings · 0 restored sessions/)
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
