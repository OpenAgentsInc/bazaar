// MCP conformance check: spawns the server over stdio, performs initialize +
// tools/list, asserts the eight v1 tools with schemas and annotations, calls
// request_listing (pure — no network) and asserts the URL shape, and asserts
// the typed failure modes of get_quotes and the faucet mainnet guard.

import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"

const here = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const EXPECTED_TOOLS: Record<string, { readOnly: boolean }> = {
  network_status: { readOnly: true },
  list_offerings: { readOnly: true },
  get_quotes: { readOnly: true },
  node_health: { readOnly: true },
  spin_up_node: { readOnly: false },
  join_network: { readOnly: false },
  faucet_fund: { readOnly: false },
  request_listing: { readOnly: false },
}

const SAMPLE_PUBKEY = "a".repeat(64)

let failures = 0
function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    console.log(`PASS ${name}`)
  } else {
    failures += 1
    console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`)
  }
}

function firstText(result: unknown): string {
  const content = (result as { content?: { type: string; text?: string }[] })
    .content
  const text = content?.find((entry) => entry.type === "text")?.text
  if (typeof text !== "string") throw new Error("tool returned no text content")
  return text
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [require.resolve("tsx/cli"), join(here, "..", "src", "index.ts")],
    stderr: "ignore",
  })
  const client = new Client({ name: "immortal-mcp-conformance", version: "0.0.1" })
  await client.connect(transport)

  const serverVersion = client.getServerVersion()
  check(
    "initialize: server identifies as immortal-mcp",
    serverVersion?.name === "immortal-mcp",
    JSON.stringify(serverVersion)
  )

  const { tools } = await client.listTools()
  check(
    "tools/list: exactly 8 tools",
    tools.length === 8,
    `got ${tools.length}: ${tools.map((tool) => tool.name).join(", ")}`
  )
  for (const [name, expectation] of Object.entries(EXPECTED_TOOLS)) {
    const tool = tools.find((candidate) => candidate.name === name)
    check(`tools/list: ${name} present`, tool !== undefined)
    if (!tool) continue
    check(
      `tools/list: ${name} has an object input schema`,
      tool.inputSchema?.type === "object"
    )
    check(
      `tools/list: ${name} readOnlyHint === ${expectation.readOnly}`,
      tool.annotations?.readOnlyHint === expectation.readOnly,
      JSON.stringify(tool.annotations)
    )
    if (!expectation.readOnly) {
      check(
        `tools/list: ${name} destructiveHint === false`,
        tool.annotations?.destructiveHint === false,
        JSON.stringify(tool.annotations)
      )
    }
    check(
      `tools/list: ${name} description states the hard boundaries`,
      typeof tool.description === "string" &&
        tool.description.includes("regtest only") &&
        tool.description.includes("never holds provider seeds") &&
        tool.description.includes("launch manifest")
    )
  }

  // request_listing is pure: URL construction only, no network, no browser.
  const listing = await client.callTool({
    name: "request_listing",
    arguments: {
      pubkey: SAMPLE_PUBKEY,
      offeringCoordinate: `39601:${SAMPLE_PUBKEY}:offering-1`,
      nip11Url: "https://relay-a.example.org/",
      healthJson: JSON.stringify({ state: "healthy", role: "provider" }),
    },
  })
  check("request_listing: not an error", listing.isError !== true)
  try {
    const payload = JSON.parse(firstText(listing)) as { url?: string }
    const url = new URL(payload.url ?? "")
    check("request_listing: github.com host", url.hostname === "github.com")
    check(
      "request_listing: immortal new-issue path",
      url.pathname === "/OpenAgentsInc/immortal/issues/new"
    )
    check(
      "request_listing: body carries the pubkey",
      (url.searchParams.get("body") ?? "").includes(SAMPLE_PUBKEY)
    )
    check(
      "request_listing: title present",
      (url.searchParams.get("title") ?? "").startsWith("Listing request")
    )
  } catch (cause) {
    check("request_listing: parseable URL payload", false, String(cause))
  }

  // get_quotes is an honest v1 stub — a typed not_implemented error.
  const quotes = await client.callTool({
    name: "get_quotes",
    arguments: { direction: "LN->BTC", amountSat: 100000 },
  })
  check("get_quotes: isError true (v1 scope cut)", quotes.isError === true)
  check(
    "get_quotes: typed not_implemented",
    firstText(quotes).includes('"not_implemented"')
  )

  // Mainnet identifiers must fail validation before any network effect.
  const mainnet = await client.callTool({
    name: "faucet_fund",
    arguments: {
      gateway: "https://gateway.example.org",
      address: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
      amountSat: 1000,
    },
  })
  check("faucet_fund: mainnet address rejected", mainnet.isError === true)
  check(
    "faucet_fund: boundary error code",
    firstText(mainnet).includes("mainnet_identifier_rejected")
  )

  await client.close()

  if (failures > 0) {
    console.error(`conformance: ${failures} check(s) failed`)
    process.exit(1)
  }
  console.log("conformance: all checks passed")
}

main().catch((cause) => {
  console.error("conformance: fatal", cause)
  process.exit(1)
})
