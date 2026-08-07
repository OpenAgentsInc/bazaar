import { expect, test, type Page } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

const ALLOWED_AUTHORITIES = new Set([
  "bazaar.openagents.com",
  "gateway.34-41-78-122.sslip.io",
  "relay-a.34-41-78-122.nip.io",
  "relay-b.34-41-78-122.sslip.io",
])
const FORBIDDEN_RECEIPT_KEY =
  /(capability|destination|invoice|private|secret|seed|mnemonic|preimage|macaroon|credential|password|raw_transaction|transaction_hex)/i

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

  const otherPage = await context.newPage()
  await otherPage.goto("/", { waitUntil: "domcontentloaded" })
  await ready(otherPage)
  expect(await storedCapability(otherPage)).not.toBe(secondSessionCapability)
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
      new_session_rotated_capability: true,
      second_tab_received_distinct_capability: true,
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
})

async function completeJourney(page: Page, direction: "reverse" | "submarine") {
  await page.getByLabel("Send").fill("100000")
  await page
    .getByRole("button", {
      name:
        direction === "reverse"
          ? "Generate demo bcrt1 address"
          : "Generate amount-matched demo invoice",
    })
    .click()
  await expect(
    page.getByText(
      direction === "reverse"
        ? "Regtest address verified locally"
        : "Regtest BOLT11 invoice verified locally"
    )
  ).toBeVisible()
  await expect(
    page.getByText("2 signed Quotes verified · best route selected")
  ).toBeVisible({ timeout: 90_000 })
  await expect(page.locator("[data-quote-provider]")).toHaveCount(2)
  await page.getByRole("button", { name: "Create Swap" }).click()

  await expect(page.locator("[data-public-regtest-state]")).not.toHaveAttribute(
    "data-public-regtest-state",
    "ready"
  )
  await page.reload({ waitUntil: "domcontentloaded" })
  await expect(page.locator("[data-public-regtest-state]")).toHaveAttribute(
    "data-public-regtest-state",
    "complete",
    {
      timeout: 8 * 60_000,
    }
  )
  await expect(page.getByText("BTC + LN verified")).toBeVisible()
  await expect(page.getByText(/loser released/)).toBeVisible()
  const provider = await page.getByText(/Selected provider ·/).textContent()
  return {
    direction,
    outcome: "requester_rails_verified",
    selected_provider_prefix: provider?.match(/[0-9a-f]{12}/)?.[0] ?? "unknown",
    unselected_provider_released: true,
    exact_effect_replay_after_reload: true,
  }
}

async function ready(page: Page) {
  await expect(page.locator("[data-public-regtest-state]")).toHaveAttribute(
    "data-public-regtest-state",
    "ready",
    {
      timeout: 90_000,
    }
  )
  await expect(page.getByText("2 providers")).toBeVisible()
}

async function storedCapability(page: Page): Promise<string> {
  return page.evaluate(() => {
    const entries = Object.values(sessionStorage)
    for (const encoded of entries) {
      try {
        const value = JSON.parse(encoded) as { capability?: unknown }
        if (typeof value.capability === "string") return value.capability
      } catch {
        // Non-Bazaar session storage is irrelevant to this assertion.
      }
    }
    throw new Error("public regtest capability not found in tab storage")
  })
}

function rejectSensitiveMaterial(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectSensitiveMaterial)
    return
  }
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_RECEIPT_KEY.test(key)) {
      throw new Error(`acceptance receipt contains forbidden field ${key}`)
    }
    rejectSensitiveMaterial(item)
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!/^[0-9a-f]{40}$/.test(value ?? "")) {
    throw new Error(`${name} must be a lower-hex Git revision`)
  }
  return value!
}
