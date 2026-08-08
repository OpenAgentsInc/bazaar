import { expect, test } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import {
  ALLOWED_AUTHORITIES,
  completeJourney,
  ready,
  rejectSensitiveMaterial,
  requiredEnvironment,
  revokeStoredSession,
  storedCapability,
} from "./support"

test("public regtest completes reverse and submarine swaps", async ({
  page,
  context,
}) => {
  const unexpectedAuthorities = new Set<string>()
  page.on("request", (request) => {
    const url = new URL(request.url())
    if (!ALLOWED_AUTHORITIES.has(url.hostname)) {
      unexpectedAuthorities.add(url.hostname)
    }
  })

  await page.goto("/", { waitUntil: "domcontentloaded" })
  await expect(page.getByText("PUBLIC · REGTEST")).toBeVisible()
  await ready(page)

  const firstTabCapability = await storedCapability(page)
  expect(firstTabCapability).toMatch(/^[0-9a-f]{64}$/)
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    firstTabCapability
  )

  const reverse = await completeJourney(page, "reverse")
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("[data-public-regtest-state]")).toHaveAttribute(
    "data-public-regtest-state",
    "complete"
  )
  expect(await storedCapability(page)).toBe(firstTabCapability)

  await page.getByRole("button", { name: "Run another public swap" }).click()
  await ready(page)
  const secondSessionCapability = await storedCapability(page)
  expect(secondSessionCapability).not.toBe(firstTabCapability)

  await page.getByRole("button", { name: "Reverse swap direction" }).click()
  const submarine = await completeJourney(page, "submarine")

  await expect
    .poll(publicServiceReady, {
      message: "public service should reconverge before isolation admission",
      timeout: 90_000,
      intervals: [1_000, 2_000, 5_000],
    })
    .toBe(true)
  const otherPage = await context.newPage()
  await otherPage.goto("/", { waitUntil: "domcontentloaded" })
  await ready(otherPage)
  expect(await storedCapability(otherPage)).not.toBe(secondSessionCapability)
  expect(await revokeStoredSession(otherPage)).toBe(true)
  await otherPage.close()

  expect([...unexpectedAuthorities]).toEqual([])
  const receipt = {
    schema: "openagents.bazaar.public-regtest-acceptance.v1",
    origin: new URL(page.url()).origin,
    completed_at: Math.floor(Date.now() / 1_000),
    revisions: {
      bazaar: requiredEnvironment("BAZAAR_PUBLIC_REGTEST_BAZAAR_REVISION"),
      immortal: requiredEnvironment("BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION"),
    },
    providers_discovered: 2,
    journeys: { reverse, submarine },
    isolation: {
      reload_preserved_session: true,
      new_session_isolated: true,
      second_tab_isolated: true,
    },
    browser_network_authorities: [...ALLOWED_AUTHORITIES].sort(),
  }
  rejectSensitiveMaterial(receipt)
  const receiptPath = resolve(
    process.env.BAZAAR_PUBLIC_REGTEST_RECEIPT ??
      "target/public-regtest-acceptance.json"
  )
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8")
  expect(await revokeStoredSession(page)).toBe(true)
})

async function publicServiceReady(): Promise<boolean> {
  const response = await fetch("https://gateway.34-41-78-122.sslip.io/readyz", {
    cache: "no-store",
  })
  if (response.status !== 200) return false
  const value = (await response.json()) as Record<string, unknown>
  return (
    value.ready === true &&
    Array.isArray(value.failures) &&
    value.failures.length === 0
  )
}
