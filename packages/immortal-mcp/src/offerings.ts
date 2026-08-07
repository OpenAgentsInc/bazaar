// Normalizes kind 39600 (provider_profile) and 39601 (offering) replaceable
// heads into plain JSON summaries. Parsing is defensive: malformed content is
// reported as a parse error, never silently invented.

import {
  parseJsonRejectingDuplicateMembers,
  type Event,
} from "@openagentsinc/nip-mkt"

import { tagValue } from "./nostr.js"

export interface OfferingSide {
  readonly inputAssetId: string
  readonly outputAssetId: string
  readonly min: string
  readonly max: string
  readonly feeBps: string
}

export interface NormalizedOffering {
  readonly providerPubkey: string
  readonly coordinate: string
  readonly status: string
  readonly providerReference: string
  readonly swapTypes: readonly string[]
  readonly sides: readonly OfferingSide[]
  readonly eventId: string
  readonly createdAt: number
  readonly parseError?: string
}

export interface NormalizedProviderProfile {
  readonly pubkey: string
  readonly coordinate: string
  readonly status: string
  readonly label: string
  readonly eventId: string
  readonly createdAt: number
}

function contentRecord(event: Event): Record<string, unknown> | undefined {
  try {
    const parsed = parseJsonRejectingDuplicateMembers(event.content)
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed as Record<string, unknown>
  } catch {
    // fall through
  }
  return undefined
}

export function normalizeOffering(event: Event): NormalizedOffering {
  const base = {
    providerPubkey: event.pubkey,
    coordinate: `39601:${event.pubkey}:${tagValue(event.tags, "d")}`,
    status: tagValue(event.tags, "status"),
    providerReference: tagValue(event.tags, "provider"),
    eventId: event.id,
    createdAt: event.created_at,
  }
  const content = contentRecord(event)
  const profile =
    content && typeof content.mkt_swp === "object" && content.mkt_swp !== null
      ? (content.mkt_swp as Record<string, unknown>)
      : undefined
  if (!profile) {
    return {
      ...base,
      swapTypes: [],
      sides: [],
      parseError: "offering content has no mkt_swp profile object",
    }
  }
  const swapTypes = Array.isArray(profile.swap_types)
    ? profile.swap_types.filter(
        (value): value is string => typeof value === "string"
      )
    : []
  const sides: OfferingSide[] = []
  let parseError: string | undefined
  if (Array.isArray(profile.sides)) {
    for (const value of profile.sides) {
      if (value === null || typeof value !== "object") {
        parseError = "offering side is not an object"
        continue
      }
      const side = value as Record<string, unknown>
      sides.push({
        inputAssetId: String(side.input_asset_id ?? ""),
        outputAssetId: String(side.output_asset_id ?? ""),
        min: String(side.min ?? ""),
        max: String(side.max ?? ""),
        feeBps: String(side.fee_bps ?? ""),
      })
    }
  } else {
    parseError = "offering profile has no sides array"
  }
  return { ...base, swapTypes, sides, parseError }
}

export function normalizeProviderProfile(
  event: Event
): NormalizedProviderProfile {
  const content = contentRecord(event)
  const profile =
    content && typeof content.mkt_swp === "object" && content.mkt_swp !== null
      ? (content.mkt_swp as Record<string, unknown>)
      : undefined
  const labelCandidate =
    profile &&
    ["name", "display_name", "label"]
      .map((key) => profile[key])
      .find((value) => typeof value === "string" && value.length > 0)
  const alt = tagValue(event.tags, "alt")
  return {
    pubkey: event.pubkey,
    coordinate: `39600:${event.pubkey}:${tagValue(event.tags, "d")}`,
    status: tagValue(event.tags, "status"),
    label:
      typeof labelCandidate === "string"
        ? labelCandidate
        : alt || `provider ${event.pubkey.slice(0, 12)}…`,
    eventId: event.id,
    createdAt: event.created_at,
  }
}
