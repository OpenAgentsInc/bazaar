// Live-shaped fixtures for the Network Map catalog: instead of hand-writing
// `PanoramaNetwork` objects, these run the real `buildPanoramaNetwork` fold
// over exactly the inputs the /network page assembles — verified-manifest
// shape, socket states, NIP-11 probes, 39600/39601 heads, and 39603 receipt
// aggregates — so the stories exercise the same code path as production.

import type { Event } from "@openagentsinc/nip-mkt"

import type { PanoramaNetwork } from "@/components/viz/immortal/network-panorama"
import type { PanoramaNetworkView } from "@/hooks/use-panorama-network"
import {
  buildPanoramaNetwork,
  type PanoramaManifestInput,
  type PanoramaNetworkInputs,
  type PanoramaProviderHead,
} from "@/lib/viz/panorama-network"

const PROVIDER_A = "11".repeat(32)
const PROVIDER_B = "22".repeat(32)
const DISCOVERED_1 = "a1c9".repeat(16)
const DISCOVERED_2 = "b7e2".repeat(16)
const DISCOVERED_3 = "c3f8".repeat(16)

const RELAY_A = "wss://relay-a.regtest.openagents.com"
const RELAY_B = "wss://relay-b.regtest.openagents.com"
const RELAY_JOINED = "wss://relay-join.example.net"

export const MAP_MANIFEST: PanoramaManifestInput = {
  relays: [{ websocketUrl: RELAY_A }, { websocketUrl: RELAY_B }],
  providers: [
    {
      role: "provider-a",
      pubkey: PROVIDER_A,
      offeringCoordinate: `39601:${PROVIDER_A}:no-spend-default`,
    },
    {
      role: "provider-b",
      pubkey: PROVIDER_B,
      offeringCoordinate: `39601:${PROVIDER_B}:no-spend-alternate`,
    },
  ],
}

let sequence = 0
function fixtureEvent(
  pubkey: string,
  createdAt: number,
  kind: number,
  tags: string[][],
  content: string
): Event {
  sequence += 1
  return {
    id: `${sequence}`.padStart(8, "0").repeat(8),
    pubkey,
    created_at: createdAt,
    kind,
    tags,
    content,
    sig: "ff",
  }
}

function profileHead(
  pubkey: string,
  relayUrl: string,
  relayTags: string[] = []
): PanoramaProviderHead {
  return {
    event: fixtureEvent(
      pubkey,
      1_700_000_000,
      39_600,
      [
        ["d", "main"],
        ["status", "active"],
        ...relayTags.map((url) => ["relay", url]),
      ],
      JSON.stringify({ name: pubkey.slice(0, 8) })
    ),
    relayUrl,
  }
}

function offeringHead(
  pubkey: string,
  distinct: string,
  feeBps: string,
  relayUrl: string
): PanoramaProviderHead {
  return {
    event: fixtureEvent(
      pubkey,
      1_700_000_100,
      39_601,
      [
        ["d", distinct],
        ["status", "active"],
        ["provider", `39600:${pubkey}:main`],
      ],
      JSON.stringify({ mkt_swp: { sides: [{ fee_bps: feeBps }] } })
    ),
    relayUrl,
  }
}

const PINNED_HEADS: readonly PanoramaProviderHead[] = [
  profileHead(PROVIDER_A, RELAY_A),
  offeringHead(PROVIDER_A, "no-spend-default", "50", RELAY_A),
  profileHead(PROVIDER_B, RELAY_B),
  offeringHead(PROVIDER_B, "no-spend-alternate", "40", RELAY_B),
]

const DISCOVERED_HEADS: readonly PanoramaProviderHead[] = [
  profileHead(DISCOVERED_1, RELAY_A, [RELAY_JOINED]),
  offeringHead(DISCOVERED_1, "join-offer", "65", RELAY_A),
  profileHead(DISCOVERED_2, RELAY_B),
  offeringHead(DISCOVERED_2, "join-offer", "80", RELAY_B),
  profileHead(DISCOVERED_3, RELAY_A),
  offeringHead(DISCOVERED_3, "join-offer", "35", RELAY_A),
]

const HEALTHY_BASE: Omit<PanoramaNetworkInputs, "heads"> = {
  manifest: MAP_MANIFEST,
  socketStates: { [RELAY_A]: "live", [RELAY_B]: "live" },
  nip11: {
    [RELAY_A]: { state: "ok", document: { version: "0.1.0" } },
    [RELAY_B]: { state: "ok", document: { version: "0.1.0" } },
  },
  receiptAggregates: {
    [PROVIDER_A]: { swaps24h: 14, volumeSat24h: 3_400_000, feeSat24h: 17_000 },
    [PROVIDER_B]: { swaps24h: 19, volumeSat24h: 4_750_000, feeSat24h: 19_700 },
    [DISCOVERED_1]: { swaps24h: 3, volumeSat24h: 410_000, feeSat24h: 2_600 },
  },
  clientCount: 9,
}

/** Both pinned relays live, both pinned providers quoting; nothing else. */
export const PINNED_ONLY_NETWORK: PanoramaNetwork = buildPanoramaNetwork({
  ...HEALTHY_BASE,
  heads: PINNED_HEADS,
})

/** 2 pinned + 3 discovered providers, plus 1 discovered relay from a
 * discovered provider's profile — the map a fresh join produces. */
export const WITH_DISCOVERED_NETWORK: PanoramaNetwork = buildPanoramaNetwork({
  ...HEALTHY_BASE,
  heads: [...PINNED_HEADS, ...DISCOVERED_HEADS],
})

/** Relay B socket closed, provider B profile stale: the live page mid-outage. */
export const DEGRADED_LIVE_NETWORK: PanoramaNetwork = buildPanoramaNetwork({
  ...HEALTHY_BASE,
  socketStates: { [RELAY_A]: "live", [RELAY_B]: "closed" },
  nip11: {
    [RELAY_A]: { state: "ok", document: { version: "0.1.0" } },
    [RELAY_B]: { state: "unavailable" },
  },
  heads: [
    profileHead(PROVIDER_A, RELAY_A),
    offeringHead(PROVIDER_A, "no-spend-default", "50", RELAY_A),
    // provider-b never published a head this session: starting, not hidden.
  ],
  receiptAggregates: {
    [PROVIDER_A]: { swaps24h: 11, volumeSat24h: 2_650_000, feeSat24h: 13_000 },
  },
  clientCount: 4,
})

/** What the mocked hook serves to page-level stories. */
export const MOCK_PANORAMA_VIEW: PanoramaNetworkView = {
  state: "ready",
  network: WITH_DISCOVERED_NETWORK,
}
