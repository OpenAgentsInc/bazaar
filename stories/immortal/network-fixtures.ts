// Deterministic example networks for the panorama stories: the same data
// shape a live "state of the network" feed would produce, at three scales
// and several health states.

import type {
  PanoramaNetwork,
  PanoramaProvider,
  PanoramaRelay,
} from "@/components/viz/immortal/network-panorama"

// --- small: the persistent public regtest we actually run -----------------

export const SMALL_NETWORK: PanoramaNetwork = {
  name: "public regtest",
  relays: [
    { id: "relay-a", label: "relay-a" },
    { id: "relay-b", label: "relay-b" },
  ],
  providers: [
    {
      id: "provider-a",
      label: "provider-a",
      relayIds: ["relay-a"],
      feeBps: 50,
      swaps24h: 14,
      volumeSat24h: 3_400_000,
    },
    {
      id: "provider-b",
      label: "provider-b",
      relayIds: ["relay-b"],
      feeBps: 40,
      swaps24h: 19,
      volumeSat24h: 4_750_000,
    },
  ],
  clientCount: 9,
  stats: {
    swaps24h: 33,
    volumeSat24h: 8_150_000,
    operatorFeeSat24h: 36_700,
  },
  activity: 0.25,
}

// --- medium: a young mainnet-shaped market with mixed health ---------------

export const MEDIUM_NETWORK: PanoramaNetwork = {
  name: "growing market",
  relays: [
    { id: "r1", label: "iris" },
    { id: "r2", label: "damus" },
    { id: "r3", label: "immortal-0", state: "degraded" },
    { id: "r4", label: "sovran" },
  ],
  providers: [
    { id: "p1", label: "aqua", relayIds: ["r1", "r2"], feeBps: 35, swaps24h: 210, volumeSat24h: 61_000_000 },
    { id: "p2", label: "borealis", relayIds: ["r2"], feeBps: 45, swaps24h: 96, volumeSat24h: 22_500_000 },
    { id: "p3", label: "cinder", relayIds: ["r2", "r3"], feeBps: 40, swaps24h: 88, volumeSat24h: 19_800_000 },
    { id: "p4", label: "drift", relayIds: ["r3", "r4"], feeBps: 55, swaps24h: 41, volumeSat24h: 8_400_000 },
    { id: "p5", label: "ember", relayIds: ["r4", "r1"], feeBps: 30, swaps24h: 154, volumeSat24h: 47_000_000 },
    { id: "p6", label: "fathom", relayIds: ["r1"], feeBps: 60, swaps24h: 12, volumeSat24h: 2_100_000, state: "offline" },
    { id: "p7", label: "gale", relayIds: ["r4"], feeBps: 42, swaps24h: 67, volumeSat24h: 15_300_000 },
  ],
  clientCount: 46,
  stats: {
    swaps24h: 668,
    volumeSat24h: 176_100_000,
    operatorFeeSat24h: 703_000,
  },
  activity: 0.5,
}

// --- large: the thriving market -------------------------------------------

const LARGE_RELAY_NAMES = [
  "immortal-0",
  "iris",
  "damus",
  "sovran",
  "citadel",
  "nostrich",
  "harbor",
  "beacon",
] as const

const LARGE_PROVIDER_SEED: ReadonlyArray<
  [label: string, feeBps: number, swaps: number, volume: number]
> = [
  ["aqua", 35, 812, 240_000_000],
  ["borealis", 40, 610, 178_000_000],
  ["cinder", 30, 545, 152_000_000],
  ["drift", 45, 431, 121_000_000],
  ["ember", 25, 702, 198_000_000],
  ["fathom", 50, 289, 74_000_000],
  ["gale", 38, 366, 96_000_000],
  ["harrier", 42, 244, 61_000_000],
  ["isarn", 33, 512, 139_000_000],
  ["jetsam", 55, 158, 39_000_000],
  ["keel", 36, 428, 111_000_000],
  ["lumen", 28, 654, 171_000_000],
  ["mistral", 47, 201, 52_000_000],
  ["nadir", 44, 173, 44_000_000],
  ["onyx", 31, 489, 128_000_000],
  ["pharos", 39, 322, 83_000_000],
  ["quill", 52, 141, 35_000_000],
  ["rime", 34, 398, 104_000_000],
]

function largeProviders(): PanoramaProvider[] {
  return LARGE_PROVIDER_SEED.map(([label, feeBps, swaps24h, volumeSat24h], index) => {
    const primary = LARGE_RELAY_NAMES[index % LARGE_RELAY_NAMES.length]!
    const secondary =
      LARGE_RELAY_NAMES[(index + 3) % LARGE_RELAY_NAMES.length]!
    return {
      id: label,
      label,
      relayIds: index % 3 === 0 ? [primary] : [primary, secondary],
      feeBps,
      swaps24h,
      volumeSat24h,
    }
  })
}

const LARGE_RELAYS: PanoramaRelay[] = LARGE_RELAY_NAMES.map((name) => ({
  id: name,
  label: name,
}))

export const THRIVING_NETWORK: PanoramaNetwork = {
  name: "thriving market",
  relays: LARGE_RELAYS,
  providers: largeProviders(),
  clientCount: 140,
  stats: {
    swaps24h: 7_475,
    volumeSat24h: 2_026_000_000, // ≈ 20.26 BTC
    operatorFeeSat24h: 7_610_000,
  },
  activity: 1,
}

// --- large under stress: a relay outage the market routes around ----------

export const OUTAGE_NETWORK: PanoramaNetwork = {
  ...THRIVING_NETWORK,
  name: "relay outage",
  relays: THRIVING_NETWORK.relays.map((relay) =>
    relay.id === "damus"
      ? { ...relay, state: "offline" as const }
      : relay.id === "citadel"
        ? { ...relay, state: "degraded" as const }
        : relay
  ),
  stats: {
    swaps24h: 6_918,
    volumeSat24h: 1_874_000_000,
    operatorFeeSat24h: 7_020_000,
  },
  activity: 0.8,
}
