// Pure fold from public-safe network observations to the `PanoramaNetwork`
// shape that `ImmortalNetworkPanorama` renders (docs/network-map-and-
// onboarding.md §3). Inputs are exactly the sources the browser already
// holds as the protocol host: the verified signed launch manifest, per-relay
// socket states, NIP-11 documents, discovered kind 39600/39601 replaceable
// heads observed on connected relays, and client-side aggregates of kind
// 39603 public market receipts. No fetching, no timers, no trust decisions —
// the manifest stays the trust boundary and everything else lands in the
// "discovered" tier, dimmed and explicitly unpinned.
//
// Honesty constraints:
// - Only manifest relays plus relays listed by discovered providers appear;
//   no fabricated channel graph (channels stay the panorama's own
//   provider-ring rendering of the overlay network).
// - A discovered provider must publish an active 39600 profile head AND at
//   least one active, well-formed 39601 offering head to appear at all.
// - Signature verification is NOT re-done here: heads must come from
//   authenticated relay lanes (the transport already validates delivery).

import type { Event } from "@openagentsinc/nip-mkt"

import type { VizNodeState } from "@/components/viz/core"
import type {
  PanoramaNetwork,
  PanoramaProvider,
  PanoramaRelay,
} from "@/components/viz/immortal/network-panorama"
import type { RelayConnectionState } from "@/lib/immortal/transport"

const PROFILE_KIND = 39_600
const OFFERING_KIND = 39_601
const MAXIMUM_HEAD_CONTENT_BYTES = 65_536
const ACTIVITY_FLOOR = 0.1
const ACTIVITY_SWAPS_FULL_SCALE = 400

// --- inputs ----------------------------------------------------------------

/** Structural subset of the verified `PublicRegtestConfig`. */
export interface PanoramaManifestRelay {
  readonly websocketUrl: string
}

export interface PanoramaManifestProvider {
  readonly role: string
  readonly pubkey: string
  readonly offeringCoordinate: string
}

export interface PanoramaManifestInput {
  readonly relays: readonly PanoramaManifestRelay[]
  readonly providers: readonly PanoramaManifestProvider[]
}

/** The public-safe slice of a NIP-11 relay information document. */
export interface PanoramaNip11Document {
  readonly software?: string
  readonly version?: string
  readonly supportedNips?: readonly number[]
  readonly supportedExtensions?: readonly string[]
}

export type PanoramaNip11State =
  | { readonly state: "ok"; readonly document: PanoramaNip11Document }
  | { readonly state: "unavailable" }

/** A kind 39600/39601 head with the relay lane it was observed on. */
export interface PanoramaProviderHead {
  readonly event: Event
  readonly relayUrl: string
}

/** Client-side aggregation of kind 39603 public market receipts. */
export interface PanoramaReceiptAggregate {
  readonly swaps24h: number
  readonly volumeSat24h: number
  readonly feeSat24h: number
}

export interface PanoramaNetworkInputs {
  /** HUD name; defaults to "public regtest". */
  readonly name?: string
  /** Verified manifest, or null when the launch profile is unconfigured. */
  readonly manifest: PanoramaManifestInput | null
  /** Live socket state keyed by relay websocket URL. */
  readonly socketStates?: Readonly<Record<string, RelayConnectionState>>
  /** NIP-11 probe results keyed by relay websocket URL. */
  readonly nip11?: Readonly<Record<string, PanoramaNip11State>>
  /** Observed kind 39600/39601 heads (pinned and discovered publishers). */
  readonly heads?: readonly PanoramaProviderHead[]
  /** 39603 receipt aggregates keyed by provider pubkey. */
  readonly receiptAggregates?: Readonly<
    Record<string, PanoramaReceiptAggregate>
  >
  /** Visible client sessions; the map never invents clients. */
  readonly clientCount?: number
}

// --- fold --------------------------------------------------------------------

export function buildPanoramaNetwork(
  inputs: PanoramaNetworkInputs
): PanoramaNetwork {
  const socketStates = inputs.socketStates ?? {}
  const nip11 = inputs.nip11 ?? {}
  const heads = inputs.heads ?? []
  const aggregates = inputs.receiptAggregates ?? {}

  const pinnedRelayUrls = (inputs.manifest?.relays ?? []).map((relay) =>
    normalizeRelayUrl(relay.websocketUrl)
  )
  const pinnedRelaySet = new Set(pinnedRelayUrls)
  const pinnedProviders = inputs.manifest?.providers ?? []
  const pinnedProviderKeys = new Set(
    pinnedProviders.map((provider) => provider.pubkey)
  )

  // Replaceable-head fold: newest created_at wins per (kind:pubkey:d);
  // equal timestamps break toward the lexicographically lower event id.
  const folded = new Map<string, PanoramaProviderHead>()
  const seenRelaysByPubkey = new Map<string, Set<string>>()
  for (const head of heads) {
    const { event } = head
    if (event.kind !== PROFILE_KIND && event.kind !== OFFERING_KIND) continue
    const distinct = tagValue(event.tags, "d")
    if (!distinct) continue
    const seen =
      seenRelaysByPubkey.get(event.pubkey) ?? new Set<string>()
    seen.add(normalizeRelayUrl(head.relayUrl))
    seenRelaysByPubkey.set(event.pubkey, seen)
    const key = `${event.kind}:${event.pubkey}:${distinct}`
    const current = folded.get(key)
    if (!current || newerHead(event, current.event)) folded.set(key, head)
  }

  // Active profiles per pubkey, plus the relays each profile lists.
  const activeProfileCoordinates = new Set<string>()
  const profileRelayUrls = new Map<string, readonly string[]>()
  const pubkeysWithAnyHead = new Set<string>()
  for (const head of folded.values()) {
    pubkeysWithAnyHead.add(head.event.pubkey)
    if (head.event.kind !== PROFILE_KIND) continue
    if (tagValue(head.event.tags, "status") !== "active") continue
    const distinct = tagValue(head.event.tags, "d")!
    activeProfileCoordinates.add(
      `${PROFILE_KIND}:${head.event.pubkey}:${distinct}`
    )
    profileRelayUrls.set(
      head.event.pubkey,
      head.event.tags
        .filter(
          (tag) => tag[0] === "relay" && (tag[1] ?? "").startsWith("wss://")
        )
        .map((tag) => normalizeRelayUrl(tag[1]!))
    )
  }

  // Valid active offerings per pubkey: bound to an active profile of the
  // same pubkey, with at least one well-formed side. Malformed content
  // excludes the offering (fail closed on discovered eligibility).
  const offeringFeeByPubkey = new Map<string, number>()
  const offeringCoordinatesByPubkey = new Map<string, Set<string>>()
  for (const head of folded.values()) {
    const { event } = head
    if (event.kind !== OFFERING_KIND) continue
    if (tagValue(event.tags, "status") !== "active") continue
    const providerCoordinate = tagValue(event.tags, "provider")
    if (
      !providerCoordinate ||
      !providerCoordinate.startsWith(`${PROFILE_KIND}:${event.pubkey}:`) ||
      !activeProfileCoordinates.has(providerCoordinate)
    )
      continue
    const feeBps = minimumOfferingFeeBps(event)
    if (feeBps === null) continue
    const distinct = tagValue(event.tags, "d")!
    const coordinate = `${OFFERING_KIND}:${event.pubkey}:${distinct}`
    const coordinates =
      offeringCoordinatesByPubkey.get(event.pubkey) ?? new Set<string>()
    coordinates.add(coordinate)
    offeringCoordinatesByPubkey.set(event.pubkey, coordinates)
    const current = offeringFeeByPubkey.get(event.pubkey)
    if (current === undefined || feeBps < current)
      offeringFeeByPubkey.set(event.pubkey, feeBps)
  }

  const hasActiveProfile = (pubkey: string): boolean =>
    [...activeProfileCoordinates].some((coordinate) =>
      coordinate.startsWith(`${PROFILE_KIND}:${pubkey}:`)
    )

  // Discovered providers: active profile + at least one valid offering,
  // and not pinned by the manifest.
  const discoveredProviderKeys = [...offeringCoordinatesByPubkey.keys()]
    .filter(
      (pubkey) => !pinnedProviderKeys.has(pubkey) && hasActiveProfile(pubkey)
    )
    .sort()

  // Discovered relays: relays a discovered provider lists in its profile
  // that the manifest does not pin. Never invented from anything else.
  const discoveredRelayUrls = [
    ...new Set(
      discoveredProviderKeys.flatMap(
        (pubkey) => profileRelayUrls.get(pubkey) ?? []
      )
    ),
  ]
    .filter((url) => !pinnedRelaySet.has(url))
    .sort()

  const relayUrls = [...pinnedRelayUrls, ...discoveredRelayUrls]
  const labels = relayLabels(relayUrls)
  const relays: PanoramaRelay[] = relayUrls.map((url) => ({
    id: url,
    label: labels.get(url)!,
    state: relayState(socketStates[url], nip11[url]),
    trust: pinnedRelaySet.has(url) ? "pinned" : "discovered",
  }))
  const knownRelayIds = new Set(relayUrls)

  const relayIdsFor = (
    pubkey: string,
    fallback: readonly string[]
  ): readonly string[] => {
    const seen = [...(seenRelaysByPubkey.get(pubkey) ?? [])]
      .filter((url) => knownRelayIds.has(url))
      .sort()
    return seen.length > 0 ? seen : fallback
  }

  const providers: PanoramaProvider[] = [
    ...pinnedProviders.map((provider): PanoramaProvider => {
      const aggregate = aggregates[provider.pubkey]
      return {
        id: provider.pubkey,
        label: provider.role,
        state: hasActiveProfile(provider.pubkey)
          ? "ready"
          : pubkeysWithAnyHead.has(provider.pubkey)
            ? "offline"
            : "starting",
        trust: "pinned",
        // Manifest-implied sockets until heads are observed on a lane.
        relayIds: relayIdsFor(provider.pubkey, pinnedRelayUrls),
        feeBps: pinnedOfferingFee(provider, folded) ?? 0,
        swaps24h: aggregate?.swaps24h ?? 0,
        volumeSat24h: aggregate?.volumeSat24h ?? 0,
      }
    }),
    ...discoveredProviderKeys.map((pubkey): PanoramaProvider => {
      const aggregate = aggregates[pubkey]
      return {
        id: pubkey,
        label: pubkey.slice(0, 8),
        state: "ready",
        trust: "discovered",
        relayIds: relayIdsFor(pubkey, []),
        feeBps: offeringFeeByPubkey.get(pubkey) ?? 0,
        swaps24h: aggregate?.swaps24h ?? 0,
        volumeSat24h: aggregate?.volumeSat24h ?? 0,
      }
    }),
  ]

  const stats = providers.reduce(
    (sum, provider) => ({
      swaps24h: sum.swaps24h + provider.swaps24h,
      volumeSat24h: sum.volumeSat24h + provider.volumeSat24h,
      operatorFeeSat24h:
        sum.operatorFeeSat24h + (aggregates[provider.id]?.feeSat24h ?? 0),
    }),
    { swaps24h: 0, volumeSat24h: 0, operatorFeeSat24h: 0 }
  )

  const readyRelays = relays.filter(
    (relay) => (relay.state ?? "ready") === "ready"
  ).length
  const activity =
    readyRelays === 0
      ? 0
      : Math.min(
          1,
          ACTIVITY_FLOOR + stats.swaps24h / ACTIVITY_SWAPS_FULL_SCALE
        )

  return {
    name: inputs.name ?? "public regtest",
    relays,
    providers,
    clientCount: inputs.clientCount ?? 0,
    stats,
    activity,
  }
}

// --- helpers -----------------------------------------------------------------

export function normalizeRelayUrl(url: string): string {
  return url.replace(/\/+$/, "")
}

/**
 * Short, unique relay labels: the first DNS label of the hostname when that
 * is unique across the network, otherwise the full hostname, otherwise the
 * normalized URL.
 */
function relayLabels(urls: readonly string[]): Map<string, string> {
  const hostname = (url: string): string => {
    try {
      return new URL(url).hostname
    } catch {
      return url
    }
  }
  const short = (url: string): string => hostname(url).split(".")[0] || url
  const shortCounts = new Map<string, number>()
  for (const url of urls) {
    shortCounts.set(short(url), (shortCounts.get(short(url)) ?? 0) + 1)
  }
  const hostCounts = new Map<string, number>()
  for (const url of urls) {
    hostCounts.set(hostname(url), (hostCounts.get(hostname(url)) ?? 0) + 1)
  }
  return new Map(
    urls.map((url) => [
      url,
      shortCounts.get(short(url)) === 1
        ? short(url)
        : hostCounts.get(hostname(url)) === 1
          ? hostname(url)
          : url,
    ])
  )
}

function relayState(
  socket: RelayConnectionState | undefined,
  nip11: PanoramaNip11State | undefined
): VizNodeState {
  if (socket === "live") {
    // A live authenticated socket outranks a failed HTTPS probe, but a
    // relay whose NIP-11 identity is missing reads degraded, not ready.
    return nip11?.state === "unavailable" ? "degraded" : "ready"
  }
  if (
    socket === "connecting" ||
    socket === "authenticating" ||
    socket === "snapshot"
  )
    return "starting"
  if (socket === "closed") return "offline"
  // No socket lane: the HTTPS NIP-11 probe is the only reachability signal.
  if (nip11?.state === "ok") return "ready"
  if (nip11?.state === "unavailable") return "offline"
  return "starting"
}

function pinnedOfferingFee(
  provider: PanoramaManifestProvider,
  folded: ReadonlyMap<string, PanoramaProviderHead>
): number | null {
  // A pinned provider's advertised fee comes only from the head at its
  // manifest-bound offering coordinate.
  const head = folded.get(provider.offeringCoordinate)
  if (!head || head.event.pubkey !== provider.pubkey) return null
  if (tagValue(head.event.tags, "status") !== "active") return null
  return minimumOfferingFeeBps(head.event)
}

function newerHead(candidate: Event, current: Event): boolean {
  if (candidate.created_at !== current.created_at)
    return candidate.created_at > current.created_at
  return candidate.id < current.id
}

function tagValue(
  tags: readonly (readonly string[])[],
  name: string
): string | null {
  for (const tag of tags) if (tag[0] === name) return tag[1] ?? null
  return null
}

/**
 * Display-only tolerant parse of an Offering's advertised fee: the minimum
 * `fee_bps` across its sides. Returns null when the content is malformed,
 * oversized, or has no well-formed side — such an offering never qualifies
 * a discovered provider.
 */
function minimumOfferingFeeBps(event: Event): number | null {
  if (event.content.length > MAXIMUM_HEAD_CONTENT_BYTES) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(event.content)
  } catch {
    return null
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
    return null
  const profile = (parsed as Record<string, unknown>).mkt_swp
  if (
    profile === null ||
    typeof profile !== "object" ||
    Array.isArray(profile)
  )
    return null
  const sides = (profile as Record<string, unknown>).sides
  if (!Array.isArray(sides)) return null
  let minimum: number | null = null
  for (const side of sides) {
    if (side === null || typeof side !== "object" || Array.isArray(side))
      continue
    const raw = (side as Record<string, unknown>).fee_bps
    if (typeof raw !== "string" || !/^(0|[1-9][0-9]*)$/.test(raw)) continue
    const feeBps = Number(raw)
    if (!Number.isSafeInteger(feeBps)) continue
    if (minimum === null || feeBps < minimum) minimum = feeBps
  }
  return minimum
}
