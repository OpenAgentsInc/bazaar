import { createServer } from "node:http"

import { writeFundedLaunchManifest } from "../../scripts/create-funded-launch-manifest.mjs"

const HOST = "127.0.0.1"
const PORT = 18183
const ORIGIN = "http://127.0.0.1:3102"
const NETWORK = "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4"
const launchPath = await writeFundedLaunchManifest({
  output: "tmp/funded-test-launch.json",
  adapter: `http://${HOST}:${PORT}`,
  origin: ORIGIN,
  immortalRevision: "11".repeat(20),
  bazaarRevision: "22".repeat(20),
})

const effects = {
  submarine: effect("submarine", 1_000),
  reverse: effect("reverse", 1_100),
}
const receipts = new Map()
const railCalls = { submarine: 0, reverse: 0 }
let adapterRestarts = 0
let unavailableUntil = 0
const manifest = baseManifest()

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", `http://${HOST}:${PORT}`).pathname
  if (path === "/health") {
    json(response, 200, {
      ready: true,
      launch_path: launchPath,
      rail_calls: railCalls,
      adapter_restarts: adapterRestarts,
    })
    return
  }
  if (request.method === "POST" && path === "/control/restart") {
    adapterRestarts += 1
    unavailableUntil = Date.now() + 750
    json(response, 202, { restarting: true })
    return
  }
  if (request.headers.origin !== ORIGIN) {
    json(response, 403, { error: "origin_refused" })
    return
  }
  cors(response)
  if (Date.now() < unavailableUntil) {
    json(response, 503, { error: "adapter_restarting" })
    return
  }
  if (
    request.method === "OPTIONS" &&
    ["/v1/session", "/v1/effects"].includes(path)
  ) {
    response.writeHead(204).end()
    return
  }
  if (request.method === "GET" && path === "/v1/session") {
    json(response, 200, manifest)
    return
  }
  if (request.method !== "POST" || path !== "/v1/effects") {
    json(response, 404, { error: "unknown_method" })
    return
  }
  try {
    const submitted = JSON.parse(await boundedBody(request))
    const expected = effects[manifest.active_journey]
    if (JSON.stringify(submitted) !== JSON.stringify(expected)) {
      json(response, 409, { error: "effect_conflict" })
      return
    }
    let receipt = receipts.get(expected.effect_id)
    if (!receipt) {
      railCalls[manifest.active_journey] += 1
      receipt = effectReceipt(expected)
      receipts.set(expected.effect_id, receipt)
      manifest.journeys[manifest.active_journey].effect_receipt = receipt
      manifest.journeys[manifest.active_journey].requester_verification.state =
        "effect_admitted"
      await new Promise((resolve) => setTimeout(resolve, 350))
      completeJourney(manifest.active_journey)
    }
    json(response, 200, receipt)
  } catch {
    json(response, 400, { error: "invalid_effect" })
  }
})

server.listen(PORT, HOST, () => {
  process.stdout.write(`fake-funded-adapter ${HOST}:${PORT}\n`)
})

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)))
}

function effect(journey, amountSat) {
  return {
    schema: "openagents.immortal.browser-demo-effect.v1",
    network: NETWORK,
    journey,
    session_id: (journey === "submarine" ? "11" : "12").repeat(32),
    order_id: (journey === "submarine" ? "21" : "22").repeat(32),
    effect_id: (journey === "submarine" ? "31" : "32").repeat(32),
    idempotency_digest: (journey === "submarine" ? "41" : "42").repeat(32),
    method:
      journey === "submarine"
        ? "broadcast_bitcoin_funding"
        : "pay_lightning_invoice",
    amount_sat: amountSat,
  }
}

function journey(name) {
  return {
    swap_type: name,
    session_id: effects[name].session_id,
    order_id: effects[name].order_id,
    provider_pubkey: (name === "submarine" ? "61" : "62").repeat(32),
    relay_url: "ws://127.0.0.1:18182/",
    provider_status_claim: { state: "funding_requested", verified: false },
    requester_verification: {
      state: "effect_authorized",
      engine: "immortal-client",
      independent_rail_evidence: [],
    },
    pending_effect: effects[name],
    effect_receipt: null,
    presentation: { settled_allowed: false },
  }
}

function baseManifest() {
  return {
    schema: "openagents.immortal.browser-demo-manifest.v1",
    mode: "unsafe_local_funded_regtest_demo",
    warning: "disposable fixture regtest only",
    network: NETWORK,
    allowed_origin: ORIGIN,
    active_journey: "submarine",
    requester_pubkey: "51".repeat(32),
    journeys: { submarine: journey("submarine") },
  }
}

function effectReceipt(request) {
  return {
    schema: "openagents.immortal.browser-demo-effect-receipt.v1",
    request,
    external_identifier: (request.journey === "submarine" ? "71" : "72").repeat(
      32
    ),
    result_digest: (request.journey === "submarine" ? "81" : "82").repeat(32),
    state: "admitted",
    admitted_at: Math.floor(Date.now() / 1_000),
  }
}

function completeJourney(name) {
  const active = manifest.journeys[name]
  active.pending_effect = null
  active.provider_status_claim = { state: "completed", verified: false }
  active.requester_verification = {
    state: "terminal_rail_evidence_verified",
    engine: "immortal-client",
    independent_rail_evidence: [
      {
        rail: "bitcoin",
        lockup_txid: (name === "submarine" ? "91" : "92").repeat(32),
        claim_txid: (name === "submarine" ? "a1" : "a2").repeat(32),
      },
      {
        rail: "lightning",
        payment_hash: (name === "submarine" ? "b1" : "b2").repeat(32),
        state: "paid",
      },
    ],
  }
  active.presentation = { settled_allowed: true }
  if (name === "submarine") {
    manifest.journeys.reverse = journey("reverse")
    manifest.active_journey = "reverse"
  }
}

async function boundedBody(request) {
  const chunks = []
  let length = 0
  for await (const chunk of request) {
    length += chunk.length
    if (length > 16_384) throw new Error("unbounded")
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

function cors(response) {
  response.setHeader("Access-Control-Allow-Origin", ORIGIN)
  response.setHeader("Access-Control-Allow-Headers", "Content-Type")
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  response.setHeader("Cache-Control", "no-store")
}

function json(response, status, value) {
  const body = JSON.stringify(value)
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  })
  response.end(body)
}
