import { expect, test } from "@playwright/test"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"

test("real Immortal topology completes submarine and reverse regtest journeys", async ({
  page,
}) => {
  const launchPath = requiredEnvironment("IMMORTAL_FUNDED_DEMO_MANIFEST")
  const receiptPath = resolve(
    process.env.BAZAAR_FUNDED_RECEIPT ?? "target/funded-regtest-receipt.json"
  )
  const launch = JSON.parse(await readFile(launchPath, "utf8")) as Launch

  await page.goto("/")
  await page.getByRole("button", { name: "Swap settings" }).click()
  await page.getByLabel("Swap mode").click()
  await page.getByRole("option", { name: "Regtest · Funded" }).click()

  const funded = page.locator('[aria-label="Funded regtest swap"]')
  await expect(funded).toHaveAttribute("data-funded-state", "ready")
  await expect(funded).toHaveAttribute("data-funded-journey", "submarine")
  await page
    .getByRole("button", { name: "Authorize Bitcoin funding broadcast" })
    .click()
  await expect(funded).toHaveAttribute("data-funded-state", "authorizing")
  await page.reload()

  await expect(funded).toHaveAttribute("data-funded-journey", "reverse")
  await expect(funded).toHaveAttribute("data-funded-state", "ready")
  await page
    .getByRole("button", { name: "Authorize Lightning invoice payment" })
    .click()
  await expect(funded).toHaveAttribute("data-funded-state", "complete")
  await expect(page.getByText(/settled/i)).toHaveCount(0)

  const manifest = await fetchSession(page, launch.adapter.base_url)
  for (const name of ["submarine", "reverse"] as const) {
    const journey = manifest.journeys[name]
    expect(journey.provider_status_claim.verified).toBe(false)
    expect(journey.requester_verification.state).toBe(
      "terminal_rail_evidence_verified"
    )
    expect(
      journey.requester_verification.independent_rail_evidence
    ).toHaveLength(2)
    expect(journey.effect_receipt.state).toBe("admitted")

    const replay = await postEffect(
      page,
      launch.adapter.base_url,
      journey.effect_receipt.request
    )
    expect(replay).toEqual(journey.effect_receipt)
  }

  await page.reload()
  await expect(funded).toHaveAttribute("data-funded-state", "complete")

  const receipt = publicReceipt(launch, manifest)
  rejectSensitiveMaterial(receipt)
  await mkdir(dirname(receiptPath), { recursive: true })
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8")
})

async function fetchSession(
  page: import("@playwright/test").Page,
  baseUrl: string
) {
  return page.evaluate(async (url) => {
    const response = await fetch(`${url}/v1/session`, {
      credentials: "omit",
      cache: "no-store",
    })
    if (!response.ok) throw new Error(`session HTTP ${response.status}`)
    return response.json()
  }, baseUrl) as Promise<Session>
}

async function postEffect(
  page: import("@playwright/test").Page,
  baseUrl: string,
  effect: Record<string, unknown>
) {
  return page.evaluate(
    async ({ url, body }) => {
      const response = await fetch(`${url}/v1/effects`, {
        method: "POST",
        credentials: "omit",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) throw new Error(`effect replay HTTP ${response.status}`)
      return response.json()
    },
    { url: baseUrl, body: effect }
  )
}

function publicReceipt(launch: Launch, session: Session) {
  return {
    schema: "openagents.bazaar.funded-regtest-receipt.v1",
    network: launch.network,
    completed_at: Math.floor(Date.now() / 1_000),
    revisions: {
      immortal: launch.launcher.immortal_revision,
      bazaar: launch.launcher.bazaar_revision,
      engine_source: launch.engine.source_revision,
      requester_api_sha256: launch.engine.requester_api_sha256,
      wasm_sha256: launch.engine.wasm_sha256,
      browser_abi_version: launch.engine.browser_abi_version,
      adapter_contract_sha256: launch.adapter.contract_sha256,
    },
    requester_pubkey: session.requester_pubkey,
    journeys: Object.fromEntries(
      (["submarine", "reverse"] as const).map((name) => {
        const journey = session.journeys[name]
        return [
          name,
          {
            outcome: "local_rail_evidence_verified",
            provider_pubkey: journey.provider_pubkey,
            provider_status_claim: journey.provider_status_claim,
            session_id: journey.session_id,
            order_id: journey.order_id,
            external_identifier: journey.effect_receipt.external_identifier,
            result_digest: journey.effect_receipt.result_digest,
            independent_rail_evidence:
              journey.requester_verification.independent_rail_evidence,
          },
        ]
      })
    ),
    replay: {
      exact_receipts: true,
      page_reload_preserved_terminal_evidence: true,
    },
  }
}

function rejectSensitiveMaterial(value: unknown): void {
  if (Array.isArray(value)) {
    value.forEach(rejectSensitiveMaterial)
    return
  }
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value)) {
    if (
      /(private|secret|seed|mnemonic|preimage|macaroon|credential|password|raw_transaction|transaction_hex)/i.test(
        key
      )
    ) {
      throw new Error(`receipt contains forbidden field ${key}`)
    }
    rejectSensitiveMaterial(item)
  }
}

function requiredEnvironment(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

interface Launch {
  network: string
  adapter: { base_url: string; contract_sha256: string }
  engine: {
    source_revision: string
    requester_api_sha256: string
    wasm_sha256: string
    browser_abi_version: number
  }
  launcher: { immortal_revision: string; bazaar_revision: string }
}

interface Session {
  requester_pubkey: string
  journeys: Record<
    "submarine" | "reverse",
    {
      provider_pubkey: string
      session_id: string
      order_id: string
      provider_status_claim: { state: string; verified: false }
      requester_verification: {
        state: string
        independent_rail_evidence: unknown[]
      }
      effect_receipt: {
        request: Record<string, unknown>
        external_identifier: string
        result_digest: string
        state: string
      }
    }
  >
}
