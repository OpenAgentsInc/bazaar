// list_offerings: one bounded REQ for kind 39601 heads per relay, normalized
// into pairs / min / max / fee bps / status / provider pubkey.

import { assertWsUrl } from "../boundaries.js"
import { fetchRelaySnapshot, foldHeads } from "../nostr.js"
import { normalizeOffering } from "../offerings.js"
import { ok, type ToolResult } from "../result.js"

export interface ListOfferingsArgs {
  relays: string[]
}

export async function listOfferings(
  args: ListOfferingsArgs
): Promise<ToolResult> {
  for (const relay of args.relays) assertWsUrl(relay, "relays[]")

  const snapshots = await Promise.all(
    args.relays.map((relay) => fetchRelaySnapshot(relay, [39_601], 10_000))
  )
  const heads = [
    ...foldHeads(snapshots.flatMap((snapshot) => [...snapshot.events])).values(),
  ]
  return ok({
    schema: "openagents.immortal-mcp.offerings.v1",
    relays: snapshots.map((snapshot) => ({
      url: snapshot.url,
      reachable: snapshot.reachable,
      events: snapshot.events.length,
      droppedInvalidSignatures: snapshot.droppedInvalidSignatures,
      closedReason: snapshot.closedReason ?? null,
      error: snapshot.error ?? null,
    })),
    offerings: heads
      .filter((event) => event.kind === 39_601)
      .map((event) => {
        const offering = normalizeOffering(event)
        return {
          providerPubkey: offering.providerPubkey,
          coordinate: offering.coordinate,
          status: offering.status,
          swapTypes: offering.swapTypes,
          pairs: offering.sides.map((side) => ({
            inputAssetId: side.inputAssetId,
            outputAssetId: side.outputAssetId,
            min: side.min,
            max: side.max,
            feeBps: side.feeBps,
          })),
          parseError: offering.parseError ?? null,
        }
      }),
  })
}
