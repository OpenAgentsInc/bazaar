"use client"

// usePanoramaNetwork — assembles the live inputs for the /network map and
// hands them to the pure fold in lib/viz/panorama-network.ts. The hook stays
// deliberately thin:
//
// - Manifest: the verified `PublicRegtestConfigResult` the server already
//   read (the browser never trusts anything unpinned for swapping).
// - NIP-11: probed here over HTTPS (the CSP already allowlists the relay
//   hosts because the swap transport performs the same identity check).
// - Socket states, 39600/39601 heads, and 39603 receipt aggregates arrive as
//   parameters via `live`. Producing them live requires the authenticated
//   relay lanes owned by `lib/immortal/transport.ts` / the swap runtime;
//   rather than duplicating that stack here, callers that already hold those
//   lanes (or a fixture/story) pass their observations in and the fold does
//   the work. Until they do, pinned nodes render from the manifest with
//   NIP-11-derived reachability — honest, just quieter.

import * as React from "react"

import type { PanoramaNetwork } from "@/components/viz/immortal/network-panorama"
import type { PublicRegtestConfigResult } from "@/lib/immortal/public-config"
import type { RelayConnectionState } from "@/lib/immortal/transport"
import { usePanoramaLive } from "@/hooks/use-panorama-live"
import {
  buildPanoramaNetwork,
  normalizeRelayUrl,
  type PanoramaNip11State,
  type PanoramaProviderHead,
  type PanoramaReceiptAggregate,
} from "@/lib/viz/panorama-network"

const NIP11_TIMEOUT_MS = 5_000
const NIP11_MAXIMUM_BYTES = 65_536

/** Live observations owned by callers that hold authenticated relay lanes. */
export interface PanoramaLiveInputs {
  readonly socketStates?: Readonly<Record<string, RelayConnectionState>>
  readonly heads?: readonly PanoramaProviderHead[]
  readonly receiptAggregates?: Readonly<
    Record<string, PanoramaReceiptAggregate>
  >
  /** Defaults to 1 — the visitor's own session, never an invented crowd. */
  readonly clientCount?: number
}

export type PanoramaNetworkView =
  | {
      readonly state: "unconfigured"
      readonly code: string
      readonly detail: string
    }
  | { readonly state: "connecting"; readonly network: PanoramaNetwork }
  | { readonly state: "ready"; readonly network: PanoramaNetwork }

export function usePanoramaNetwork(
  publicConfig: PublicRegtestConfigResult,
  suppliedLive?: PanoramaLiveInputs
): PanoramaNetworkView {
  const observedLive = usePanoramaLive(publicConfig, suppliedLive === undefined)
  const live = suppliedLive ?? observedLive
  const relayUrls = React.useMemo(
    () =>
      publicConfig.state === "ready"
        ? publicConfig.config.relays.map((relay) =>
            normalizeRelayUrl(relay.websocketUrl)
          )
        : [],
    [publicConfig]
  )

  const [nip11, setNip11] = React.useState<
    Readonly<Record<string, PanoramaNip11State>>
  >({})

  // Probe each pinned relay once per manifest; results only ever arrive
  // asynchronously (no synchronous setState in the effect body). A stale
  // entry for a re-pinned URL is overwritten by its fresh probe.
  React.useEffect(() => {
    if (relayUrls.length === 0) return
    const controller = new AbortController()
    for (const url of relayUrls) {
      void probeNip11(url, controller.signal).then((state) => {
        if (controller.signal.aborted) return
        setNip11((current) => ({ ...current, [url]: state }))
      })
    }
    return () => controller.abort()
  }, [relayUrls])

  return React.useMemo(() => {
    if (publicConfig.state !== "ready") {
      return {
        state: "unconfigured",
        code: publicConfig.code,
        detail: publicConfig.detail,
      }
    }
    const network = buildPanoramaNetwork({
      manifest: publicConfig.config,
      socketStates: live.socketStates,
      nip11,
      heads: live.heads,
      receiptAggregates: live.receiptAggregates,
      clientCount: live.clientCount ?? 1,
    })
    const probing = relayUrls.some((url) => nip11[url] === undefined)
    return { state: probing ? "connecting" : "ready", network }
  }, [publicConfig, nip11, relayUrls, live])
}

/**
 * Bounded NIP-11 identity probe over HTTPS. Failure is a rendering signal
 * (the relay reads offline/degraded), never an exception.
 */
async function probeNip11(
  websocketUrl: string,
  signal: AbortSignal
): Promise<PanoramaNip11State> {
  try {
    const url = websocketUrl.replace(/^wss:/, "https:")
    const response = await fetch(url, {
      headers: { Accept: "application/nostr+json" },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([signal, AbortSignal.timeout(NIP11_TIMEOUT_MS)]),
    })
    if (!response.ok) return { state: "unavailable" }
    const raw = await response.text()
    if (raw.length > NIP11_MAXIMUM_BYTES) return { state: "unavailable" }
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return { state: "unavailable" }
    const document = parsed as Record<string, unknown>
    return {
      state: "ok",
      document: {
        software:
          typeof document.software === "string" ? document.software : undefined,
        version:
          typeof document.version === "string" ? document.version : undefined,
        supportedNips: Array.isArray(document.supported_nips)
          ? document.supported_nips.filter(
              (nip): nip is number => typeof nip === "number"
            )
          : undefined,
        supportedExtensions: Array.isArray(document.supported_extensions)
          ? document.supported_extensions.filter(
              (extension): extension is string => typeof extension === "string"
            )
          : undefined,
      },
    }
  } catch {
    return { state: "unavailable" }
  }
}
