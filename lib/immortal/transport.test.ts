import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { createServer } from "node:http"
import test from "node:test"

import { Effect, Schema } from "effect"
import {
  generateSecretKey,
  getPublicKey,
  verifyEvent,
  type Event,
} from "@openagentsinc/nip-mkt"
import { WebSocket as NodeWebSocket, WebSocketServer } from "ws"

import {
  loadImmortalBrowserClient,
  requesterRfq,
} from "@/vendor/mkt-swp/immortal-browser-abi"
import { IMMORTAL_ARTIFACT, type ImmortalContractIdentity } from "./config"
import {
  ImmortalRelayError,
  ImmortalRelayTransport,
  signImmortalRequest,
  validatePrivateDelivery,
  wrapRequesterRecord,
} from "./transport"
import { bytesToHex, type DemoIdentity } from "./store"

const CONTRACT: ImmortalContractIdentity = {
  schema: "openagents.immortal.contract.v1",
  contractVersion: 1,
  crateName: "immortal",
  crateVersion: "0.1.0",
  nips: [
    { lane: "market", repo: "openagents", subdir: "nips/market", commit: "11".repeat(20) },
    { lane: "relay", repo: "openagents", subdir: "nips/relay", commit: "22".repeat(20) },
    { lane: "swap", repo: "openagents", subdir: "nips/swap", commit: "33".repeat(20) },
  ],
}

function identity(privateKey = generateSecretKey()): DemoIdentity {
  return {
    schema: "openagents.bazaar.demo-identity.v1",
    privateKeyHex: bytesToHex(privateKey),
    pubkey: getPublicKey(privateKey),
    createdAt: 1_700_000_000_000,
    policy: "local_demo_identity_only_never_fund_or_reuse",
  }
}

test("relay transport authenticates with NIP-42 and waits for both EOSE snapshots", async (t) => {
  const requester = identity()
  const observed: { auth?: Event; reqs: unknown[][]; states: string[] } = {
    reqs: [],
    states: [],
  }
  const server = createServer((request, response) => {
    if (request.headers.accept !== "application/nostr+json") {
      response.writeHead(406).end()
      return
    }
    response.writeHead(200, { "content-type": "application/nostr+json" })
    response.end(
      JSON.stringify({
        software: "https://github.com/OpenAgentsInc/immortal",
        version: CONTRACT.crateVersion,
        supported_nips: [11, 42, 59],
        supported_extensions: ["nip-mkt"],
      })
    )
  })
  const sockets = new WebSocketServer({ server })
  sockets.on("connection", (socket) => {
    socket.send(JSON.stringify(["AUTH", "challenge-for-bazaar"]))
    socket.on("message", (data) => {
      const message = JSON.parse(data.toString()) as unknown[]
      if (message[0] === "AUTH") {
        const event = message[1] as Event
        observed.auth = event
        socket.send(JSON.stringify(["OK", event.id, true, "authenticated"]))
      } else if (message[0] === "REQ") {
        observed.reqs.push(message)
        socket.send(JSON.stringify(["EOSE", message[1]]))
      }
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  t.after(() => {
    sockets.close()
    server.close()
  })
  Object.defineProperty(globalThis, "WebSocket", {
    value: NodeWebSocket,
    configurable: true,
  })

  const address = server.address()
  assert.ok(address && typeof address === "object")
  const relayUrl = `ws://127.0.0.1:${address.port}`
  const transport = new ImmortalRelayTransport(relayUrl, requester, CONTRACT)
  t.after(() => transport.close())
  const snapshots: unknown[] = []
  const information = await transport.connect({
    onState: (state) => observed.states.push(state),
    onSnapshot: async (snapshot) => {
      snapshots.push(snapshot)
    },
    onPublicEvent: async () => undefined,
    onPrivateEvent: async () => undefined,
  })

  assert.equal(information.version, CONTRACT.crateVersion)
  assert.equal(snapshots.length, 1)
  assert.equal(observed.reqs.length, 2)
  assert.deepEqual(observed.states, ["connecting", "authenticating", "snapshot", "live"])
  assert.ok(observed.auth && verifyEvent(observed.auth))
  assert.equal(observed.auth.kind, 22_242)
  assert.deepEqual(observed.auth.tags, [
    ["relay", relayUrl],
    ["challenge", "challenge-for-bazaar"],
  ])
})

test("contract identity mismatch refuses the relay before opening a socket", async (t) => {
  const server = createServer((_, response) => {
    response.writeHead(200, { "content-type": "application/nostr+json" })
    response.end(
      JSON.stringify({
        software: "https://github.com/OpenAgentsInc/immortal",
        version: "wrong-version",
        supported_nips: [42],
        supported_extensions: ["nip-mkt"],
      })
    )
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  t.after(() => server.close())
  const address = server.address()
  assert.ok(address && typeof address === "object")
  const transport = new ImmortalRelayTransport(
    `ws://127.0.0.1:${address.port}`,
    identity(),
    CONTRACT
  )
  await assert.rejects(
    transport.connect({
      onSnapshot: async () => undefined,
      onPublicEvent: async () => undefined,
      onPrivateEvent: async () => undefined,
    }),
    (cause) =>
      cause instanceof ImmortalRelayError &&
      cause.code === "contract_identity_mismatch"
  )
})

test("both NIP-59 copies recover the same engine-validated signed RFQ", async () => {
  const requester = identity()
  const provider = identity()
  const wasm = await readFile("public/immortal/immortal_client_web.wasm")
  const client = await Effect.runPromise(loadImmortalBrowserClient(wasm))
  assert.equal(client.metadata.source_revision, IMMORTAL_ARTIFACT.sourceRevision)
  const sessionId = "aa".repeat(32)
  const request = await Effect.runPromise(
    requesterRfq(
      client,
      Schema.decodeUnknownSync(Schema.Json)({
        config: {
          session_id: sessionId,
          requester_pubkey: requester.pubkey,
          provider_pubkey: provider.pubkey,
          offering_address: `39601:${provider.pubkey}:submarine-btc-ln`,
        },
        created_at: 1_700_000_000,
        distinct: sessionId,
        expiration: 1_700_000_600,
        mkt_swp: {
          request: {
            input_asset_id: "BTC",
            output_asset_id: "BTC-LN",
            input_amount: "100000",
          },
        },
      })
    )
  )
  const signed = await signImmortalRequest(client, request, requester)
  const copies = await wrapRequesterRecord(signed, requester, provider.pubkey)

  const counterparty = await validatePrivateDelivery(
    client,
    copies.counterparty,
    provider,
    1_700_000_001
  )
  const recovery = await validatePrivateDelivery(
    client,
    copies.senderRecovery,
    requester,
    1_700_000_001
  )

  assert.equal(counterparty.unwrapped.raw, recovery.unwrapped.raw)
  assert.deepEqual(
    JSON.parse(counterparty.unwrapped.raw),
    JSON.parse(JSON.stringify(signed))
  )
  assert.equal(counterparty.signedRecord.id, signed.id)
  assert.equal(recovery.signedRecord.id, signed.id)
  assert.equal(counterparty.sessionId, sessionId)
  assert.equal(counterparty.storedDelivery.source, "counterparty")
  assert.equal(recovery.storedDelivery.source, "sender_recovery")
  assert.equal(counterparty.engineDelivery.event_id, signed.id)
  assert.notEqual(copies.counterparty.id, copies.senderRecovery.id)
})
