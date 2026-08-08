import { expect, test, type Browser, type Page } from "@playwright/test"
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
  const pacingMilliseconds = boundedEnvironment(
    "BAZAAR_PUBLIC_REGTEST_SESSION_PACING_MS",
    10_000,
    8_000,
    60_000
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
    if (index > 0) {
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, pacingMilliseconds)
      )
    }
    sequential.push(
      await runIsolatedJourney(
        browser,
        index % 2 === 0 ? "reverse" : "submarine",
        unexpectedAuthorities
      )
    )
  }
  expect([...unexpectedAuthorities]).toEqual([])
  const service = await publicReadiness()

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
    session_pacing_milliseconds: pacingMilliseconds,
    isolation: {
      concurrent_sessions_distinct: true,
      fresh_context_per_sequential_session: true,
      reload_replay_checked_per_session: true,
    },
    browser_network_authorities: [...ALLOWED_AUTHORITIES].sort(),
    public_service: service,
    test_results: {
      funded_concurrency: "passed",
      funded_sequential_soak: "passed",
      reload_effect_replay: "passed",
      browser_authority_policy: "passed",
      edge_security_policy: "passed",
    },
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
  const page = await context.newPage()
  try {
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
    expect(await revokeStoredSession(page)).toBe(true)
    return {
      direction,
      durationSeconds: Math.ceil((Date.now() - started) / 1_000),
      isolationToken,
      selectedProviderPrefix: journey.selected_provider_prefix,
    }
  } finally {
    await revokeStoredSession(page).catch(() => false)
    await context.close()
  }
}

async function publicReadiness() {
  const response = await fetch("https://gateway.34-41-78-122.sslip.io/readyz")
  expect(response.status).toBe(200)
  const value = (await response.json()) as Record<string, unknown>
  expect(value.schema).toBe(
    "openagents.immortal.public-regtest-service-readiness.v1"
  )
  expect(value.ready).toBe(true)
  expect(value.revision).toBe(
    requiredEnvironment("BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION")
  )
  expect(value.failures).toEqual([])
  expect(value.provider_pubkeys).toEqual([
    expect.stringMatching(/^[0-9a-f]{64}$/),
    expect.stringMatching(/^[0-9a-f]{64}$/),
  ])
  expect(value.lightning_node_ids).toEqual([
    expect.stringMatching(/^(?:02|03)[0-9a-f]{64}$/),
    expect.stringMatching(/^(?:02|03)[0-9a-f]{64}$/),
    expect.stringMatching(/^(?:02|03)[0-9a-f]{64}$/),
  ])
  return {
    schema: value.schema,
    revision: value.revision,
    checked_at: value.checked_at,
    provider_pubkeys: value.provider_pubkeys,
    lightning_node_ids: value.lightning_node_ids,
    ready: value.ready,
    failures: value.failures,
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
