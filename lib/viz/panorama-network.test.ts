import assert from "node:assert/strict"
import test from "node:test"

import type { Event } from "@openagentsinc/nip-mkt"

import {
  aggregatePublicReceipts,
  buildPanoramaNetwork,
  normalizeRelayUrl,
  type PanoramaManifestInput,
  type PanoramaProviderHead,
} from "./panorama-network"

const providerA = "11".repeat(32)
const providerB = "22".repeat(32)
const discovered1 = "aa".repeat(32)
const discovered2 = "bb".repeat(32)

const RELAY_A = "wss://relay-a.example.com"
const RELAY_B = "wss://relay-b.example.com"
const RELAY_NEW = "wss://relay-join.example.net"

const MANIFEST: PanoramaManifestInput = {
  relays: [{ websocketUrl: RELAY_A }, { websocketUrl: RELAY_B }],
  providers: [
    {
      role: "provider-a",
      pubkey: providerA,
      offeringCoordinate: `39601:${providerA}:no-spend-default`,
    },
    {
      role: "provider-b",
      pubkey: providerB,
      offeringCoordinate: `39601:${providerB}:no-spend-alternate`,
    },
  ],
}

function event(
  pubkey: string,
  createdAt: number,
  kind: number,
  tags: string[][],
  content: string,
  id = `${createdAt}`.padStart(8, "0").repeat(8)
): Event {
  return { id, pubkey, created_at: createdAt, kind, tags, content, sig: "ff" }
}

function profile(
  pubkey: string,
  createdAt: number,
  status: string,
  relayTags: string[] = []
): Event {
  return event(
    pubkey,
    createdAt,
    39_600,
    [
      ["d", "main"],
      ["status", status],
      ...relayTags.map((url) => ["relay", url]),
    ],
    JSON.stringify({ name: pubkey.slice(0, 8) })
  )
}

function offering(
  pubkey: string,
  distinct: string,
  createdAt: number,
  status: string,
  feeBps: readonly string[] = ["100"]
): Event {
  return event(
    pubkey,
    createdAt,
    39_601,
    [
      ["d", distinct],
      ["status", status],
      ["provider", `39600:${pubkey}:main`],
    ],
    JSON.stringify({
      mkt_swp: {
        sides: feeBps.map((fee) => ({ fee_bps: fee })),
      },
    })
  )
}

function head(event: Event, relayUrl: string): PanoramaProviderHead {
  return { event, relayUrl }
}

test("pinned manifest folds to pinned relays and providers", () => {
  const network = buildPanoramaNetwork({
    manifest: MANIFEST,
    socketStates: { [RELAY_A]: "live", [RELAY_B]: "live" },
    nip11: {
      [RELAY_A]: { state: "ok", document: { version: "0.1.0" } },
      [RELAY_B]: { state: "ok", document: { version: "0.1.0" } },
    },
    heads: [
      head(profile(providerA, 10, "active"), RELAY_A),
      head(
        offering(providerA, "no-spend-default", 11, "active", ["40"]),
        RELAY_A
      ),
      head(profile(providerB, 10, "active"), RELAY_B),
      head(
        offering(providerB, "no-spend-alternate", 11, "active", ["55"]),
        RELAY_B
      ),
    ],
    clientCount: 1,
  })

  assert.deepEqual(
    network.relays.map((relay) => [
      relay.id,
      relay.label,
      relay.state,
      relay.trust,
    ]),
    [
      [RELAY_A, "relay-a", "ready", "pinned"],
      [RELAY_B, "relay-b", "ready", "pinned"],
    ]
  )
  assert.deepEqual(
    network.providers.map((provider) => [
      provider.label,
      provider.state,
      provider.trust,
      provider.feeBps,
      provider.relayIds,
    ]),
    [
      ["provider-a", "ready", "pinned", 40, [RELAY_A]],
      ["provider-b", "ready", "pinned", 55, [RELAY_B]],
    ]
  )
  assert.equal(network.name, "public regtest")
  assert.equal(network.clientCount, 1)
})

test("socket and NIP-11 states map onto honest node states", () => {
  const manifest: PanoramaManifestInput = {
    relays: [
      { websocketUrl: "wss://live-verified.example.com" },
      { websocketUrl: "wss://live-unidentified.example.com" },
      { websocketUrl: "wss://handshaking.example.com" },
      { websocketUrl: "wss://closed.example.com" },
      { websocketUrl: "wss://probe-only.example.com" },
      { websocketUrl: "wss://probe-failed.example.com" },
      { websocketUrl: "wss://unknown.example.com" },
    ],
    providers: [],
  }
  const network = buildPanoramaNetwork({
    manifest,
    socketStates: {
      "wss://live-verified.example.com": "live",
      "wss://live-unidentified.example.com": "live",
      "wss://handshaking.example.com": "authenticating",
      "wss://closed.example.com": "closed",
    },
    nip11: {
      "wss://live-verified.example.com": { state: "ok", document: {} },
      "wss://live-unidentified.example.com": { state: "unavailable" },
      "wss://probe-only.example.com": { state: "ok", document: {} },
      "wss://probe-failed.example.com": { state: "unavailable" },
    },
  })
  assert.deepEqual(
    network.relays.map((relay) => [relay.label, relay.state]),
    [
      ["live-verified", "ready"],
      ["live-unidentified", "degraded"],
      ["handshaking", "starting"],
      ["closed", "offline"],
      ["probe-only", "ready"],
      ["probe-failed", "offline"],
      ["unknown", "starting"],
    ]
  )
})

test("pinned providers without observed heads stay manifest-implied", () => {
  const network = buildPanoramaNetwork({ manifest: MANIFEST })
  assert.deepEqual(
    network.providers.map((provider) => [
      provider.state,
      provider.relayIds,
      provider.feeBps,
    ]),
    [
      ["starting", [RELAY_A, RELAY_B], 0],
      ["starting", [RELAY_A, RELAY_B], 0],
    ]
  )
  // No ready relay lane -> zero activity, never a fabricated pulse.
  assert.equal(network.activity, 0)
})

test("a retired pinned profile reads offline, not hidden", () => {
  const network = buildPanoramaNetwork({
    manifest: MANIFEST,
    heads: [
      head(profile(providerA, 10, "retired"), RELAY_A),
      head(profile(providerB, 10, "active"), RELAY_B),
    ],
  })
  assert.deepEqual(
    network.providers.map((provider) => provider.state),
    ["offline", "ready"]
  )
})

test("replaceable heads: newest created_at wins, ties break to lower id", () => {
  const older = profile(providerA, 10, "active")
  const newer = profile(providerA, 20, "retired")
  const tieLow = event(
    providerA,
    20,
    39_600,
    [
      ["d", "main"],
      ["status", "active"],
    ],
    "{}",
    "0".repeat(64)
  )
  const network = buildPanoramaNetwork({
    manifest: MANIFEST,
    heads: [head(newer, RELAY_A), head(older, RELAY_A), head(tieLow, RELAY_A)],
  })
  // tieLow (same created_at as newer, lower id) is the surviving head.
  assert.equal(network.providers[0]!.state, "ready")
})

test("discovered tier requires an active profile and a valid offering", () => {
  const network = buildPanoramaNetwork({
    manifest: MANIFEST,
    socketStates: { [RELAY_A]: "live", [RELAY_B]: "live" },
    nip11: {
      [RELAY_A]: { state: "ok", document: {} },
      [RELAY_B]: { state: "ok", document: {} },
    },
    heads: [
      head(profile(providerA, 10, "active"), RELAY_A),
      head(offering(providerA, "no-spend-default", 11, "active"), RELAY_A),
      // Fully valid discovered provider on a connected relay.
      head(profile(discovered1, 12, "active", [RELAY_NEW]), RELAY_A),
      head(
        offering(discovered1, "join-offer", 13, "active", ["75", "60"]),
        RELAY_A
      ),
      // Profile without any offering: not discovered.
      head(profile(discovered2, 12, "active"), RELAY_B),
      // Offering with malformed content: excluded, fail closed.
      head(
        event(
          discovered2,
          13,
          39_601,
          [
            ["d", "bad"],
            ["status", "active"],
            ["provider", `39600:${discovered2}:main`],
          ],
          "not json"
        ),
        RELAY_B
      ),
    ],
  })

  const discovered = network.providers.filter(
    (provider) => provider.trust === "discovered"
  )
  assert.deepEqual(
    discovered.map((provider) => [
      provider.id,
      provider.label,
      provider.state,
      provider.feeBps,
      provider.relayIds,
    ]),
    [[discovered1, discovered1.slice(0, 8), "ready", 60, [RELAY_A]]]
  )
  // The relay the discovered provider lists in its profile appears as an
  // unpinned discovered relay with no fabricated socket state.
  const joined = network.relays.find((relay) => relay.id === RELAY_NEW)
  assert.deepEqual(
    [joined?.trust, joined?.state, joined?.label],
    ["discovered", "starting", "relay-join"]
  )
})

test("receipt aggregates roll up into provider rows and network stats", () => {
  const network = buildPanoramaNetwork({
    manifest: MANIFEST,
    socketStates: { [RELAY_A]: "live" },
    nip11: { [RELAY_A]: { state: "ok", document: {} } },
    heads: [
      head(profile(providerA, 10, "active"), RELAY_A),
      head(offering(providerA, "no-spend-default", 11, "active"), RELAY_A),
    ],
    receiptAggregates: {
      [providerA]: { swaps24h: 14, volumeSat24h: 3_400_000, feeSat24h: 17_000 },
      [providerB]: { swaps24h: 19, volumeSat24h: 4_750_000, feeSat24h: 19_700 },
    },
  })
  assert.deepEqual(network.stats, {
    swaps24h: 33,
    volumeSat24h: 8_150_000,
    operatorFeeSat24h: 36_700,
  })
  assert.equal(network.providers[0]!.swaps24h, 14)
  assert.equal(network.providers[1]!.volumeSat24h, 4_750_000)
  // Activity derives from observed swap rate, floored and capped.
  assert.equal(network.activity, Math.min(1, 0.1 + 33 / 400))
})

test("public receipts deduplicate and keep redacted totals unknown", () => {
  const completed = event(
    providerA,
    100_000,
    39_603,
    [
      ["d", "receipt-one"],
      ["profile", "mkt-swp", "1"],
      ["outcome", "completed"],
      ["x", "aa".repeat(32)],
      ["role", "provider"],
    ],
    "",
    "ab".repeat(32)
  )
  const refunded = event(
    providerA,
    100_001,
    39_603,
    [
      ["d", "receipt-two"],
      ["profile", "mkt-swp", "1"],
      ["outcome", "refunded"],
      ["x", "bb".repeat(32)],
      ["role", "provider"],
    ],
    "",
    "cd".repeat(32)
  )
  assert.deepEqual(
    aggregatePublicReceipts([completed, completed, refunded], 100_100),
    {
      [providerA]: {
        swaps24h: 1,
        volumeSat24h: null,
        feeSat24h: null,
      },
    }
  )
})

test("activity saturates at one and needs a ready relay", () => {
  const busy = buildPanoramaNetwork({
    manifest: MANIFEST,
    nip11: { [RELAY_A]: { state: "ok", document: {} } },
    receiptAggregates: {
      [providerA]: { swaps24h: 9_000, volumeSat24h: 1, feeSat24h: 1 },
    },
  })
  assert.equal(busy.activity, 1)
  const dark = buildPanoramaNetwork({
    manifest: MANIFEST,
    socketStates: { [RELAY_A]: "closed", [RELAY_B]: "closed" },
    receiptAggregates: {
      [providerA]: { swaps24h: 9_000, volumeSat24h: 1, feeSat24h: 1 },
    },
  })
  assert.equal(dark.activity, 0)
})

test("an unconfigured launch folds to an empty, honest network", () => {
  const network = buildPanoramaNetwork({ manifest: null })
  assert.deepEqual(network.relays, [])
  assert.deepEqual(network.providers, [])
  assert.equal(network.clientCount, 0)
  assert.equal(network.activity, 0)
  assert.deepEqual(network.stats, {
    swaps24h: 0,
    volumeSat24h: 0,
    operatorFeeSat24h: 0,
  })
})

test("relay URLs normalize and labels fall back on collision", () => {
  assert.equal(normalizeRelayUrl("wss://relay-a.example.com/"), RELAY_A)
  const network = buildPanoramaNetwork({
    manifest: {
      relays: [
        { websocketUrl: "wss://relay.alpha.example.com" },
        { websocketUrl: "wss://relay.beta.example.com" },
      ],
      providers: [],
    },
  })
  assert.deepEqual(
    network.relays.map((relay) => relay.label),
    ["relay.alpha.example.com", "relay.beta.example.com"]
  )
})
