import { createHash, randomBytes, webcrypto } from "node:crypto"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { Effect, Schema } from "effect"
import WebSocket from "ws"
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  serializeSignedEvent,
  unwrapPrivateRecord,
  verifyEvent,
  wrapPrivateRecordCopies,
  type Event,
  type GiftWrappedEvent,
} from "@openagentsinc/nip-mkt"

import {
  createRequesterSession,
  loadImmortalBrowserClient,
  requesterRfq,
  validateImmortalDelivery,
  verifySignedRequesterRecord,
  type ImmortalBrowserClient,
} from "../../../../vendor/mkt-swp/immortal-browser-abi.js"
import { BoundaryError, assertHttpUrl } from "../boundaries.js"
import { fetchManifestSummary } from "../manifest.js"
import { foldHeads, tagValue } from "../nostr.js"
import { normalizeOffering } from "../offerings.js"
import { ok, toolError, type ToolResult } from "../result.js"

if (!globalThis.crypto)
  Object.defineProperty(globalThis, "crypto", { value: webcrypto })

const CHAIN = "swp:1:bip122:0f9188f13cb7b2c9e5c72a6b65eeada4:btc:chain"
const LIGHTNING = "swp:1:bip122:0f9188f13cb7b2c9e5c72a6b65eeada4:btc:lightning"
const PRIVATE_PROFILES = [
  {
    id: "mkt-swp",
    version: 1,
    privateKinds: [39_610],
    referenceMarkers: ["cancel-request", "cancel-accept"],
    criticalMembers: ["mkt_swp"],
    understoodMembers: ["mkt_swp"],
  },
] as const
const TIMEOUT_MS = 15_000

export interface GetQuotesArgs {
  manifestUrl?: string
  direction: "LN->BTC"
  amountSat: number
}

interface Route {
  providerPubkey: string
  offeringCoordinate: string
  relayUrl: string
  side: {
    inputAssetId: string
    outputAssetId: string
    min: string
    max: string
    feeBps: string
  }
  offering: Event
}

interface QuoteResult {
  providerPubkey: string
  sessionId: string
  rfqId: string
  quoteId: string
  outputAmount: string
  maximumTotalFee: string
  feeBps: string
  expiresAt: number
  rawQuote: Event
}

export async function getQuotes(args: GetQuotesArgs): Promise<ToolResult> {
  const manifestUrl = args.manifestUrl ?? process.env.IMMORTAL_MANIFEST_URL
  if (!manifestUrl) {
    return toolError(
      "manifest_url_required",
      "Provide manifestUrl or set IMMORTAL_MANIFEST_URL."
    )
  }
  assertHttpUrl(manifestUrl, "manifestUrl")
  const manifest = await fetchManifestSummary(manifestUrl)
  if (
    manifest.verification.signatureEvent !== "verified" ||
    manifest.verification.contentBinding !== "bound" ||
    manifest.serviceState !== "ready"
  ) {
    throw new BoundaryError(
      "manifest_untrusted",
      "The public-regtest manifest is not signed, bound, and ready."
    )
  }

  const privateKey = generateSecretKey()
  const requesterPubkey = getPublicKey(privateKey)
  const client = await Effect.runPromise(
    loadImmortalBrowserClient(await readRequesterWasm())
  )
  const headsByRelay = await Promise.all(
    manifest.relays.map(async (relay) => ({
      relayUrl: relay.websocketUrl,
      events: await authenticatedSnapshot(
        relay.websocketUrl,
        privateKey,
        [39_600, 39_601]
      ),
    }))
  )
  const routes = eligibleRoutes(
    manifest.providers,
    headsByRelay,
    args.amountSat
  )
  if (routes.length < 2) {
    return toolError(
      "competitive_quotes_unavailable",
      `Only ${routes.length} eligible pinned provider route(s) are live; two are required.`
    )
  }

  const logicalRequestId = digestJson({
    schema: "openagents.immortal-mcp.logical-rfq.v1",
    nonce: randomBytes(32).toString("hex"),
    amountSat: args.amountSat,
  })
  const settled = await Promise.allSettled(
    routes.map((route) =>
      requestProviderQuote(
        client,
        route,
        privateKey,
        requesterPubkey,
        logicalRequestId,
        args.amountSat
      )
    )
  )
  const quotes = settled.flatMap((entry) =>
    entry.status === "fulfilled" ? [entry.value] : []
  )
  if (quotes.length < 2) {
    return toolError(
      "competitive_quotes_unavailable",
      `Only ${quotes.length} current signed Quote(s) passed the Immortal requester engine.`,
      {
        failures: settled.flatMap((entry) =>
          entry.status === "rejected"
            ? [
                entry.reason instanceof Error
                  ? entry.reason.message
                  : String(entry.reason),
              ]
            : []
        ),
      }
    )
  }
  quotes.sort(
    (left, right) =>
      compareDecimal(right.outputAmount, left.outputAmount) ||
      compareDecimal(left.maximumTotalFee, right.maximumTotalFee) ||
      left.providerPubkey.localeCompare(right.providerPubkey)
  )
  const selected = quotes[0]!
  return ok({
    schema: "openagents.immortal-mcp.signed-quotes.v1",
    network: manifest.network,
    direction: args.direction,
    inputAmountSat: args.amountSat,
    logicalRequestId,
    selectionPolicy: "highest_output_then_lowest_fee_then_provider_key",
    quotes: quotes.map(publicQuote),
    selected: publicQuote(selected),
    custody: "ephemeral_requester_identity_destroyed_after_no_spend_quote",
  })
}

function eligibleRoutes(
  providers: readonly {
    role: string
    pubkey: string
    offeringCoordinate: string
  }[],
  snapshots: readonly { relayUrl: string; events: readonly Event[] }[],
  amountSat: number
): Route[] {
  const amount = BigInt(amountSat)
  const events = snapshots.flatMap((snapshot) => snapshot.events)
  const heads = foldHeads(events)
  return providers.flatMap((provider, index) => {
    const offering = [...heads.values()].find(
      (event) =>
        event.kind === 39_601 &&
        event.pubkey === provider.pubkey &&
        `39601:${event.pubkey}:${tagValue(event.tags, "d")}` ===
          provider.offeringCoordinate &&
        tagValue(event.tags, "status") === "active"
    )
    if (!offering) return []
    const normalized = normalizeOffering(offering)
    const side = normalized.sides.find(
      (candidate) =>
        candidate.inputAssetId === LIGHTNING &&
        candidate.outputAssetId === CHAIN &&
        /^(0|[1-9][0-9]*)$/.test(candidate.min) &&
        /^(0|[1-9][0-9]*)$/.test(candidate.max) &&
        amount >= BigInt(candidate.min) &&
        amount <= BigInt(candidate.max)
    )
    if (!side) return []
    return [
      {
        providerPubkey: provider.pubkey,
        offeringCoordinate: provider.offeringCoordinate,
        relayUrl: snapshots[index % snapshots.length]!.relayUrl,
        side,
        offering,
      },
    ]
  })
}

async function requestProviderQuote(
  client: ImmortalBrowserClient,
  route: Route,
  privateKey: Uint8Array,
  requesterPubkey: string,
  logicalRequestId: string,
  amountSat: number
): Promise<QuoteResult> {
  const now = Math.floor(Date.now() / 1_000)
  const sessionId = digestJson({
    logicalRequestId,
    provider: route.providerPubkey,
  })
  const config = {
    session_id: sessionId,
    requester_pubkey: requesterPubkey,
    provider_pubkey: route.providerPubkey,
    offering_address: route.offeringCoordinate,
  }
  const offeringContent = JSON.parse(route.offering.content) as Record<
    string,
    unknown
  >
  const profile = offeringContent.mkt_swp as Record<string, unknown>
  const signingRequest = await Effect.runPromise(
    requesterRfq(
      client,
      jsonValue({
        config,
        created_at: now,
        distinct: digestJson({ logicalRequestId, sessionId, kind: "rfq" }),
        expiration: now + 900,
        mkt_swp: {
          constraints: {
            allowed_script_modes: arrayStrings(profile.script_modes),
            asset_pair: [LIGHTNING, CHAIN],
            confirmation_policy: profile.confirmation_policy,
            desired_completion_time: now + 7_800,
            destination_commitment_sha256: digestJson({
              logicalRequestId,
              destination: "no-spend",
            }),
            firm_quote_required: true,
            input_amount: String(amountSat),
            maximum_total_fee: String(amountSat),
            payment_hash: logicalRequestId,
            reservation_class: "soft",
            requester_public_keys: [
              {
                leg_id: "destination",
                path: "claim",
                public_key: requesterPubkey,
              },
            ],
            swap_type: "reverse",
          },
        },
      })
    )
  )
  const rfq = finalizeEvent(
    {
      kind: signingRequest.kind,
      created_at: signingRequest.created_at,
      tags: signingRequest.tags.map((tag) => [...tag]),
      content: signingRequest.content,
    },
    privateKey
  )
  if (rfq.id !== signingRequest.expected_event_id)
    throw new Error("RFQ event id mismatch")
  await Effect.runPromise(
    verifySignedRequesterRecord(
      client,
      jsonValue({ request: signingRequest, event: rfq })
    )
  )
  const copies = await Effect.runPromise(
    wrapPrivateRecordCopies(
      serializeSignedEvent(rfq),
      privateKey,
      route.providerPubkey,
      PRIVATE_PROFILES
    )
  )
  const quoteWrap = await publishAndWaitForQuote(
    route.relayUrl,
    privateKey,
    requesterPubkey,
    copies.counterparty,
    copies.senderRecovery,
    sessionId
  )
  const delivered = await Effect.runPromise(
    unwrapPrivateRecord(quoteWrap, privateKey, PRIVATE_PROFILES, {
      receivedAt: Math.floor(Date.now() / 1_000),
      sourceProvenance: ["nip42_authenticated", "nip59_verified"],
    })
  )
  const quote = delivered.event
  if (quote.kind !== 39_605 || quote.pubkey !== route.providerPubkey) {
    throw new Error("provider returned a non-Quote or wrong signer")
  }
  const localDelivery = {
    raw_signed_event_hex: Buffer.from(
      serializeSignedEvent(rfq),
      "utf8"
    ).toString("hex"),
    observed_at: now,
    provenance: "locally_signed" as const,
  }
  const quoteDelivery = {
    raw_signed_event_hex: Buffer.from(delivered.raw, "utf8").toString("hex"),
    observed_at: Math.floor(Date.now() / 1_000),
    provenance: "direct" as const,
  }
  await Effect.runPromise(
    validateImmortalDelivery(client, jsonValue(localDelivery))
  )
  await Effect.runPromise(
    validateImmortalDelivery(client, jsonValue(quoteDelivery))
  )
  const session = await Effect.runPromise(
    createRequesterSession(
      client,
      jsonValue({
        config,
        records: [rfq, quote],
        exit_packages: [],
        deliveries: [localDelivery, quoteDelivery],
      })
    )
  )
  const view = session.view.quote
  if (
    view.rfq_id !== rfq.id ||
    view.provider_pubkey !== route.providerPubkey ||
    view.input_amount !== String(amountSat) ||
    view.input_asset_id !== LIGHTNING ||
    view.output_asset_id !== CHAIN ||
    view.quote_id !== quote.id ||
    view.quote_class !== "firm" ||
    Math.floor(Date.now() / 1_000) >= view.effective_acceptance_deadline
  ) {
    throw new Error("signed Quote failed requester binding checks")
  }
  return {
    providerPubkey: route.providerPubkey,
    sessionId,
    rfqId: rfq.id,
    quoteId: quote.id,
    outputAmount: view.output_amount,
    maximumTotalFee: view.fees.maximum_total_fee,
    feeBps: view.fees.fee_bps,
    expiresAt: view.effective_acceptance_deadline,
    rawQuote: quote,
  }
}

function authenticatedSnapshot(
  relayUrl: string,
  privateKey: Uint8Array,
  kinds: readonly number[]
): Promise<Event[]> {
  return withAuthenticatedRelay(
    relayUrl,
    privateKey,
    async (socket, sendAndAck) => {
      const subscription = `mcp-heads-${randomBytes(8).toString("hex")}`
      const events: Event[] = []
      socket.send(JSON.stringify(["REQ", subscription, { kinds, limit: 512 }]))
      await waitFor(socket, (message) => {
        if (message[0] === "EVENT" && message[1] === subscription) {
          const event = message[2] as Event
          if (kinds.includes(event?.kind) && verifyEvent(event))
            events.push(event)
          return false
        }
        return message[0] === "EOSE" && message[1] === subscription
      })
      socket.send(JSON.stringify(["CLOSE", subscription]))
      void sendAndAck
      return events
    }
  )
}

function publishAndWaitForQuote(
  relayUrl: string,
  privateKey: Uint8Array,
  requesterPubkey: string,
  counterparty: GiftWrappedEvent,
  recovery: GiftWrappedEvent,
  sessionId: string
): Promise<GiftWrappedEvent> {
  return withAuthenticatedRelay(
    relayUrl,
    privateKey,
    async (socket, sendAndAck) => {
      const subscription = `mcp-quotes-${randomBytes(8).toString("hex")}`
      socket.send(
        JSON.stringify([
          "REQ",
          subscription,
          { kinds: [1_059], "#p": [requesterPubkey], limit: 128 },
        ])
      )
      await waitFor(
        socket,
        (message) => message[0] === "EOSE" && message[1] === subscription
      )
      const quotePromise = waitForValue(socket, async (message) => {
        if (message[0] !== "EVENT" || message[1] !== subscription)
          return undefined
        const wrap = message[2] as GiftWrappedEvent
        if (!verifyEvent(wrap as unknown as Event)) return undefined
        try {
          const delivery = await Effect.runPromise(
            unwrapPrivateRecord(wrap, privateKey, PRIVATE_PROFILES)
          )
          return delivery.event.kind === 39_605 &&
            delivery.event.tags.some(
              (tag) => tag[0] === "session" && tag[1] === sessionId
            )
            ? wrap
            : undefined
        } catch {
          return undefined
        }
      })
      await sendAndAck(counterparty)
      await sendAndAck(recovery)
      return quotePromise
    }
  )
}

async function withAuthenticatedRelay<Result>(
  relayUrl: string,
  privateKey: Uint8Array,
  operation: (
    socket: WebSocket,
    sendAndAck: (event: Event | GiftWrappedEvent) => Promise<void>
  ) => Promise<Result>
): Promise<Result> {
  const socket = new WebSocket(relayUrl, { handshakeTimeout: 5_000 })
  await new Promise<void>((resolveOpen, reject) => {
    socket.once("open", resolveOpen)
    socket.once("error", reject)
  })
  try {
    const challenge = await waitForValue(socket, async (message) =>
      message[0] === "AUTH" && typeof message[1] === "string"
        ? message[1]
        : undefined
    )
    const auth = finalizeEvent(
      {
        kind: 22_242,
        created_at: Math.floor(Date.now() / 1_000),
        tags: [
          ["relay", relayUrl],
          ["challenge", challenge],
        ],
        content: "",
      },
      privateKey
    )
    socket.send(JSON.stringify(["AUTH", auth]))
    await waitFor(
      socket,
      (message) =>
        message[0] === "OK" && message[1] === auth.id && message[2] === true
    )
    const sendAndAck = async (event: Event | GiftWrappedEvent) => {
      socket.send(JSON.stringify(["EVENT", event]))
      await waitFor(socket, (message) => {
        if (message[0] !== "OK" || message[1] !== event.id) return false
        if (message[2] !== true)
          throw new Error(
            `relay rejected ${event.id}: ${String(message[3] ?? "")}`
          )
        return true
      })
    }
    return await operation(socket, sendAndAck)
  } finally {
    socket.close()
  }
}

function waitFor(
  socket: WebSocket,
  predicate: (message: unknown[]) => boolean
): Promise<void> {
  return waitForValue(socket, async (message) =>
    predicate(message) ? true : undefined
  ).then(() => undefined)
}

function waitForValue<Value>(
  socket: WebSocket,
  project: (message: unknown[]) => Promise<Value | undefined>
): Promise<Value> {
  return new Promise((resolveValue, reject) => {
    const timer = setTimeout(
      () => finish(new Error("relay response timeout")),
      TIMEOUT_MS
    )
    const onMessage = (data: WebSocket.RawData) => {
      let message: unknown
      try {
        message = JSON.parse(data.toString())
      } catch {
        return
      }
      if (!Array.isArray(message)) return
      void project(message)
        .then((value) => {
          if (value !== undefined) finish(undefined, value)
        })
        .catch((cause) =>
          finish(cause instanceof Error ? cause : new Error(String(cause)))
        )
    }
    const onError = (cause: Error) => finish(cause)
    const finish = (error?: Error, value?: Value) => {
      clearTimeout(timer)
      socket.off("message", onMessage)
      socket.off("error", onError)
      if (error) reject(error)
      else resolveValue(value as Value)
    }
    socket.on("message", onMessage)
    socket.once("error", onError)
  })
}

async function readRequesterWasm(): Promise<Uint8Array> {
  const here = dirname(fileURLToPath(import.meta.url))
  for (const candidate of [
    resolve(here, "../assets/immortal_client_web.wasm"),
    resolve(here, "../../assets/immortal_client_web.wasm"),
  ]) {
    try {
      return await readFile(candidate)
    } catch {}
  }
  throw new Error("pinned Immortal requester WASM asset is missing")
}

function publicQuote(quote: QuoteResult) {
  return {
    providerPubkey: quote.providerPubkey,
    sessionId: quote.sessionId,
    rfqId: quote.rfqId,
    quoteId: quote.quoteId,
    outputAmountSat: quote.outputAmount,
    maximumTotalFeeSat: quote.maximumTotalFee,
    feeBps: quote.feeBps,
    effectiveAcceptanceDeadline: quote.expiresAt,
    signatureVerified: verifyEvent(quote.rawQuote),
  }
}

function digestJson(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex")
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`
      )
      .join(",")}}`
  }
  return JSON.stringify(value)
}

function compareDecimal(left: string, right: string): number {
  const a = BigInt(left)
  const b = BigInt(right)
  return a < b ? -1 : a > b ? 1 : 0
}

function arrayStrings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function jsonValue(value: unknown): Schema.Json {
  return Schema.decodeUnknownSync(Schema.Json)(value)
}
