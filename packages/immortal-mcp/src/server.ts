import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

import { HARD_BOUNDARIES } from "./boundaries.js"
import { guarded } from "./result.js"
import { faucetFund } from "./tools/faucet-fund.js"
import { joinNetwork } from "./tools/join-network.js"
import { listOfferings } from "./tools/list-offerings.js"
import { networkStatus } from "./tools/network-status.js"
import { nodeHealth } from "./tools/node-health.js"
import { requestListing } from "./tools/request-listing.js"
import { spinUpNode } from "./tools/spin-up-node.js"
import { getQuotes } from "./tools/get-quotes.js"

export const SERVER_NAME = "immortal-mcp"
export const SERVER_VERSION = "0.1.0"

const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true,
} as const

const EFFECTFUL = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const

const APPROVAL_NOTE =
  "EFFECTFUL: hosts should require explicit user approval before running this tool. "

export function buildServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION })

  server.registerTool(
    "network_status",
    {
      title: "Immortal network status",
      description:
        "Read-only. Fetches the public regtest launch manifest envelope JSON, structure-checks it (envelope schema, " +
        "kind 27237 signature event, content binding, regtest network id) and reports the signing pubkey and canonical " +
        "manifest sha256 — signer trust-root pinning is NOT verified here and the result says so. Then fetches each " +
        "pinned relay's NIP-11 document (Accept: application/nostr+json) and takes one bounded EOSE-terminated " +
        "REQ snapshot of kinds 39600/39601 per relay (10 s cap). Returns a PanoramaNetwork-shaped JSON: relays " +
        "(url, software, version, extensions, reachable), providers (pubkey, label, offerings summary, pinned vs " +
        "discovered relative to the manifest), stats null where unknown. " +
        HARD_BOUNDARIES,
      inputSchema: {
        manifestUrl: z
          .string()
          .max(2_048)
          .optional()
          .describe(
            "URL serving the raw public regtest manifest envelope JSON (schema " +
              "openagents.bazaar.public-regtest-envelope.v1), e.g. <origin>/bazaar-public-regtest.json. " +
              "Defaults to the IMMORTAL_MANIFEST_URL environment variable."
          ),
      },
      annotations: { ...READ_ONLY, title: "Immortal network status" },
    },
    async (args) => guarded(() => networkStatus(args))
  )

  server.registerTool(
    "list_offerings",
    {
      title: "List live offerings",
      description:
        "Read-only. Takes one bounded EOSE-terminated REQ snapshot of kind 39601 offering heads per given relay " +
        "(10 s cap, signatures verified, newest head per coordinate) and returns normalized offerings: pairs " +
        "(input/output asset ids), min/max amounts, fee bps, status, provider pubkey. " +
        HARD_BOUNDARIES,
      inputSchema: {
        relays: z
          .array(z.string().max(2_048))
          .min(1)
          .max(4)
          .describe(
            "Regtest relay websocket URLs (wss://…), usually from network_status."
          ),
      },
      annotations: { ...READ_ONLY, title: "List live offerings" },
    },
    async (args) => guarded(() => listOfferings(args))
  )

  server.registerTool(
    "get_quotes",
    {
      title: "Get competing signed quotes",
      description:
        "Read-only and no-spend. Loads the pinned zero-import Immortal requester WASM, generates an ephemeral " +
        "requester identity, authenticates directly to every signed relay with NIP-42, discovers the pinned " +
        "39600/39601 heads, publishes separately gift-wrapped RFQs to each eligible provider, validates returned " +
        "signed Quotes through the Immortal session engine, and selects deterministically by highest output, then " +
        "lowest maximum fee, then provider key. The ephemeral key is never returned or persisted and no Order or " +
        "funding action is created. " +
        HARD_BOUNDARIES,
      inputSchema: {
        manifestUrl: z
          .string()
          .max(2_048)
          .optional()
          .describe(
            "Signed public-regtest manifest envelope URL; defaults to IMMORTAL_MANIFEST_URL."
          ),
        direction: z
          .enum(["LN->BTC"])
          .default("LN->BTC")
          .describe(
            "No-spend quote direction. V1 supports reverse LN→BTC previews."
          ),
        amountSat: z
          .number()
          .int()
          .min(10_000)
          .max(1_000_000)
          .describe("Offered amount in regtest sats (10,000..1,000,000)."),
      },
      annotations: { ...READ_ONLY, title: "Get competing signed quotes" },
    },
    async (args) => guarded(() => getQuotes(args))
  )

  server.registerTool(
    "node_health",
    {
      title: "Local join-kit node health",
      description:
        "Read-only. Reports the local join-kit stack: `docker compose ps --format json` in the join directory " +
        "(IMMORTAL_JOIN_DIR, default ~/work/immortal/deploy/join) plus any health/ownership JSON the kit wrote. " +
        "Returns a clear not_found if the kit is not installed. " +
        HARD_BOUNDARIES,
      inputSchema: {
        stateDir: z
          .string()
          .max(1_024)
          .optional()
          .describe(
            "Join-kit directory override (defaults to IMMORTAL_JOIN_DIR or ~/work/immortal/deploy/join)."
          ),
      },
      annotations: { ...READ_ONLY, title: "Local join-kit node health" },
    },
    async (args) => guarded(() => nodeHealth(args))
  )

  server.registerTool(
    "spin_up_node",
    {
      title: "Spin up a local regtest node",
      description:
        APPROVAL_NOTE +
        "Runs the immortal join kit `scripts/join-regtest.sh <role>` locally " +
        "(IMMORTAL_DIR, default ~/work/immortal; docker required). The script starts bitcoind/CLN/immortal-provider " +
        "(or relay + Postgres), generates a FRESH identity owned by the local daemon — never by this server — and " +
        "publishes kind 39600/39601 on start. Output is streamed as progress notifications and the last 200 lines are " +
        "returned; 15-minute bound. " +
        HARD_BOUNDARIES,
      inputSchema: {
        role: z
          .enum(["provider", "relay"])
          .describe(
            "Node role to bring up: a quoting provider or a public relay."
          ),
        relays: z
          .array(z.string().max(2_048))
          .max(4)
          .optional()
          .describe(
            "Public regtest relay websocket URLs to join (passed as --relays)."
          ),
        addnode: z
          .string()
          .max(253)
          .optional()
          .describe(
            "bitcoind regtest addnode peer endpoint host[:port] (passed as --addnode)."
          ),
        gateway: z
          .string()
          .max(2_048)
          .optional()
          .describe("Public regtest gateway base URL (passed as --gateway)."),
        stateDir: z
          .string()
          .max(1_024)
          .optional()
          .describe(
            "Absolute private state directory owned by this node (passed as --state-dir)."
          ),
        immortalDir: z
          .string()
          .max(1_024)
          .optional()
          .describe(
            "Immortal checkout override (defaults to IMMORTAL_DIR or ~/work/immortal)."
          ),
      },
      annotations: { ...EFFECTFUL, title: "Spin up a local regtest node" },
    },
    async (args, extra) =>
      guarded(async () => {
        const progressToken = extra._meta?.progressToken
        let progress = 0
        const onLine =
          progressToken === undefined
            ? undefined
            : (line: string) => {
                progress += 1
                void extra
                  .sendNotification({
                    method: "notifications/progress",
                    params: { progressToken, progress, message: line },
                  })
                  .catch(() => {})
              }
        return spinUpNode(args, onLine)
      })
  )

  server.registerTool(
    "join_network",
    {
      title: "Publish the local provider to the network",
      description:
        APPROVAL_NOTE +
        "Publishing kind 39600 + 39601 happens inside `join-regtest.sh provider` start. If the installed script " +
        "exposes a discrete publish entrypoint this tool runs it; otherwise it returns typed guidance pointing at " +
        "spin_up_node — it never invents a publish path. The local daemon signs with its own keys. " +
        HARD_BOUNDARIES,
      inputSchema: {
        immortalDir: z
          .string()
          .max(1_024)
          .optional()
          .describe(
            "Immortal checkout override (defaults to IMMORTAL_DIR or ~/work/immortal)."
          ),
      },
      annotations: {
        ...EFFECTFUL,
        title: "Publish the local provider to the network",
      },
    },
    async (args) => guarded(() => joinNetwork(args))
  )

  server.registerTool(
    "faucet_fund",
    {
      title: "Fund a regtest address from the gateway faucet",
      description:
        APPROVAL_NOTE +
        "POSTs the gateway faucet capability (request schema openagents.immortal.public-regtest-faucet-request.v1, " +
        "endpoint <gateway>/v1/public-regtest/faucet) for a LOCAL REGTEST address, then polls the returned status URL " +
        "until paid or a 60-second bound. The address must have the bcrt1 prefix — validated client-side before any " +
        "network effect; bc1/tb1/legacy mainnet addresses and lnbc invoices fail validation. Regtest sats only — no " +
        "real value. " +
        HARD_BOUNDARIES,
      inputSchema: {
        gateway: z
          .string()
          .max(2_048)
          .describe(
            "Gateway base URL from the manifest (network_status → manifest.gatewayBaseUrl)."
          ),
        address: z
          .string()
          .min(10)
          .max(96)
          .describe(
            "Regtest bech32 address; MUST start with bcrt1. Mainnet identifiers fail validation."
          ),
        amountSat: z
          .number()
          .int()
          .min(1)
          .max(10_000_000)
          .describe("Amount in regtest sats (1..10,000,000)."),
      },
      annotations: {
        ...EFFECTFUL,
        title: "Fund a regtest address from the gateway faucet",
      },
    },
    async (args) => guarded(() => faucetFund(args))
  )

  server.registerTool(
    "request_listing",
    {
      title: "Prepare a listing (pin) request",
      description:
        APPROVAL_NOTE +
        "Constructs and RETURNS the prefilled GitHub new-issue URL for the OpenAgentsInc/immortal pin request " +
        "(discovered → pinned). It does NOT open a browser and does NOT create the issue. Pinning stays a signed " +
        "human operator decision; the manifest is re-signed by the operator, never by any tool here. " +
        HARD_BOUNDARIES,
      inputSchema: {
        pubkey: z
          .string()
          .regex(/^[0-9a-f]{64}$/)
          .describe(
            "Provider pubkey (64-char lowercase hex) from the join kit."
          ),
        offeringCoordinate: z
          .string()
          .max(200)
          .describe(
            "Offering coordinate `39601:<pubkey>:<d>` bound to the provider pubkey."
          ),
        nip11Url: z
          .string()
          .max(2_048)
          .describe("HTTPS NIP-11 URL of the relay the provider publishes on."),
        healthJson: z
          .string()
          .max(16_384)
          .describe(
            "The join kit's health summary as a JSON string (≤16 KiB)."
          ),
      },
      annotations: { ...EFFECTFUL, title: "Prepare a listing (pin) request" },
    },
    async (args) => guarded(() => requestListing(args))
  )

  return server
}
