import { expect, type Page } from "@playwright/test"

export const ALLOWED_AUTHORITIES = new Set([
  "bazaar.openagents.com",
  "gateway.34-41-78-122.sslip.io",
  "relay-a.34-41-78-122.nip.io",
  "relay-b.34-41-78-122.sslip.io",
])

const FORBIDDEN_RECEIPT_KEY =
  /(capability|destination|invoice|private|secret|seed|mnemonic|preimage|macaroon|credential|password|raw_transaction|transaction_hex)/i

export async function completeJourney(
  page: Page,
  direction: "reverse" | "submarine"
) {
  await page.getByRole("textbox", { name: "Send", exact: true }).fill("100000")
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
  const createSwap = page.getByRole("button", { name: "Create Swap" })
  await expect(createSwap).toBeEnabled({ timeout: 90_000 })
  await page.getByRole("button", { name: /2 providers.*Fees/ }).click()
  await expect(page.locator("[data-quote-provider]")).toHaveCount(2)
  await expect(
    page.locator("[data-quote-provider][data-selected]")
  ).toHaveCount(1)
  await createSwap.click()

  await expect(page.locator("[data-public-regtest-state]")).not.toHaveAttribute(
    "data-public-regtest-state",
    "ready"
  )
  await page.reload({ waitUntil: "domcontentloaded" })
  const action = page.locator("[data-public-regtest-state]")
  await page.waitForFunction(
    () => {
      const state = document
        .querySelector("[data-public-regtest-state]")
        ?.getAttribute("data-public-regtest-state")
      return state === "complete" || state === "error"
    },
    undefined,
    { timeout: 8 * 60_000 }
  )
  const terminalState = await action.getAttribute("data-public-regtest-state")
  if (terminalState === "error") {
    const detail = await page
      .getByRole("region", { name: "Public funded regtest session" })
      .textContent()
    throw new Error(`public regtest journey failed: ${detail ?? "unknown"}`)
  }
  expect(terminalState).toBe("complete")
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

export async function ready(page: Page) {
  await expect(page.locator("[data-public-regtest-state]")).toHaveAttribute(
    "data-public-regtest-state",
    "ready",
    { timeout: 90_000 }
  )
  await expect(page.getByText("2 providers")).toBeVisible()
}

export async function storedCapability(page: Page): Promise<string> {
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

export function rejectSensitiveMaterial(value: unknown): void {
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

export function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!/^[0-9a-f]{40}$/.test(value ?? "")) {
    throw new Error(`${name} must be a lower-hex Git revision`)
  }
  return value!
}
