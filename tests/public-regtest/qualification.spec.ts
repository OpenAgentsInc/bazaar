import { expect, test, type Browser, type Page } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

import {
  ALLOWED_AUTHORITIES,
  completeJourney,
  ready,
  rejectSensitiveMaterial,
  requiredEnvironment,
  storedCapability,
} from "./support"

test("public regtest sustains concurrent and sequential funded sessions", async ({
  browser,
}) => {
  test.skip(
    process.env.BAZAAR_PUBLIC_REGTEST_QUALIFICATION !== "true",
    "the funded qualification soak is operator-triggered"
  )
  test.setTimeout(60 * 60_000)

  const concurrency = boundedEnvironment(
    "BAZAAR_PUBLIC_REGTEST_CONCURRENCY",
    5,
    5,
    16
  )
  const sequentialCount = boundedEnvironment(
    "BAZAAR_PUBLIC_REGTEST_SEQUENTIAL_COUNT",
    50,
    50,
    100
  )
  const startedAt = Math.floor(Date.now() / 1_000)
  const unexpectedAuthorities = new Set<string>()

  const concurrent = await Promise.all(
    Array.from({ length: concurrency }, (_, index) =>
      runIsolatedJourney(
        browser,
        index % 2 === 0 ? "reverse" : "submarine",
        unexpectedAuthorities
      )
    )
  )
  expect(new Set(concurrent.map((result) => result.isolationToken)).size).toBe(
    concurrency
  )

  const sequential = []
  for (let index = 0; index < sequentialCount; index += 1) {
    sequential.push(
      await runIsolatedJourney(
        browser,
        index % 2 === 0 ? "reverse" : "submarine",
        unexpectedAuthorities
      )
    )
  }
  expect([...unexpectedAuthorities]).toEqual([])

  const receipt = {
    schema: "openagents.bazaar.public-regtest-qualification.v1",
    origin:
      process.env.BAZAAR_PUBLIC_REGTEST_URL ?? "https://bazaar.openagents.com",
    started_at: startedAt,
    completed_at: Math.floor(Date.now() / 1_000),
    revisions: {
      bazaar: requiredEnvironment("BAZAAR_PUBLIC_REGTEST_BAZAAR_REVISION"),
      immortal: requiredEnvironment("BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION"),
    },
    providers_discovered: 2,
    concurrent: summarize(concurrent),
    sequential: summarize(sequential),
    isolation: {
      concurrent_sessions_distinct: true,
      fresh_context_per_sequential_session: true,
      reload_replay_checked_per_session: true,
    },
    browser_network_authorities: [...ALLOWED_AUTHORITIES].sort(),
  }
  rejectSensitiveMaterial(receipt)
  const receiptPath = resolve(
    process.env.BAZAAR_PUBLIC_REGTEST_QUALIFICATION_RECEIPT ??
      "target/public-regtest-qualification.json"
  )
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8")
})

async function runIsolatedJourney(
  browser: Browser,
  direction: "reverse" | "submarine",
  unexpectedAuthorities: Set<string>
) {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    observeAuthorities(page, unexpectedAuthorities)
    const started = Date.now()
    await page.goto("/", { waitUntil: "domcontentloaded" })
    await expect(page.getByText("PUBLIC · REGTEST")).toBeVisible()
    await ready(page)
    if (direction === "submarine") {
      await page.getByRole("button", { name: "Reverse swap direction" }).click()
    }
    const isolationToken = await storedCapability(page)
    const journey = await completeJourney(page, direction)
    return {
      direction,
      durationSeconds: Math.ceil((Date.now() - started) / 1_000),
      isolationToken,
      selectedProviderPrefix: journey.selected_provider_prefix,
    }
  } finally {
    await context.close()
  }
}

function observeAuthorities(page: Page, unexpected: Set<string>) {
  page.on("request", (request) => {
    const host = new URL(request.url()).hostname
    if (!ALLOWED_AUTHORITIES.has(host)) unexpected.add(host)
  })
}

function summarize(
  values: readonly {
    readonly direction: "reverse" | "submarine"
    readonly durationSeconds: number
    readonly selectedProviderPrefix: string
  }[]
) {
  const providerSelections: Record<string, number> = {}
  for (const value of values) {
    providerSelections[value.selectedProviderPrefix] =
      (providerSelections[value.selectedProviderPrefix] ?? 0) + 1
  }
  return {
    requested: values.length,
    completed: values.length,
    reverse: values.filter((value) => value.direction === "reverse").length,
    submarine: values.filter((value) => value.direction === "submarine").length,
    maximum_duration_seconds: Math.max(
      ...values.map((value) => value.durationSeconds)
    ),
    provider_selections: providerSelections,
  }
}

function boundedEnvironment(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const raw = process.env[name]
  if (raw === undefined) return fallback
  if (!/^[1-9][0-9]*$/.test(raw)) throw new Error(`${name} must be an integer`)
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be from ${minimum} through ${maximum}`)
  }
  return value
}
