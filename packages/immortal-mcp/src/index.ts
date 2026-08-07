#!/usr/bin/env node
// @openagentsinc/immortal-mcp — MCP stdio server for the Immortal public
// regtest network. Regtest only; never holds provider seeds; mainnet
// identifiers fail validation; cannot alter or sign the launch manifest.

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import { buildServer } from "./server.js"

async function main(): Promise<void> {
  const server = buildServer()
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stdout belongs to the MCP protocol; log to stderr only.
  console.error("immortal-mcp: stdio server ready (regtest only)")
}

main().catch((cause) => {
  console.error("immortal-mcp: fatal", cause)
  process.exit(1)
})
