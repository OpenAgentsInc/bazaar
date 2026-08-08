"use client"

// /network — one live birds-eye map of the public regtest network
// (docs/network-map-and-onboarding.md §3): panorama hero fed by
// usePanoramaNetwork, the custody-model topology as the drill-down
// explainer, and the "Run a node" join panel. REGTEST-labeled throughout;
// regtest sats are not real value.

import Link from "next/link"

import { ImmortalNetworkPanorama } from "@/components/viz/immortal/network-panorama"
import { ImmortalNetworkTopologyScene } from "@/components/viz/immortal/network-topology"
import {
  usePanoramaNetwork,
  type PanoramaLiveInputs,
} from "@/hooks/use-panorama-network"
import type { PublicRegtestConfigResult } from "@/lib/immortal/public-config"

const JOIN_DOC_URL =
  "https://github.com/OpenAgentsInc/immortal/blob/main/docs/join-regtest.md"
const IMMORTAL_REPO_URL = "https://github.com/OpenAgentsInc/immortal"
const RELAY_PLACEHOLDER = "wss://relay-a…,wss://relay-b…"
const PUBLIC_REGTEST_ADDNODE = "34.41.78.122:18444"
const PUBLIC_REGTEST_GATEWAY = "https://gateway.34-41-78-122.sslip.io"

export interface NetworkPageProps {
  publicConfig: PublicRegtestConfigResult
  /**
   * Live observations (socket lanes, market heads, receipt aggregates) from
   * a caller that owns authenticated relay lanes. Optional: without them the
   * map renders manifest + NIP-11 reachability only.
   */
  live?: PanoramaLiveInputs
}

export function NetworkPage({ publicConfig, live }: NetworkPageProps) {
  const view = usePanoramaNetwork(publicConfig, live)

  const pinnedRelayUrls =
    view.state === "unconfigured"
      ? publicConfig.state === "ready"
        ? publicConfig.config.relays.map((relay) => relay.websocketUrl)
        : []
      : view.network.relays
          .filter((relay) => (relay.trust ?? "pinned") === "pinned")
          .map((relay) => relay.id)
  const relayArgument =
    pinnedRelayUrls.length > 0 ? pinnedRelayUrls.join(",") : RELAY_PLACEHOLDER

  return (
    <main className="dark min-h-svh bg-background px-5 py-8 text-foreground sm:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
              <Link href="/" className="hover:text-foreground">
                bazaar
              </Link>{" "}
              / network
            </p>
            <h1 className="mt-1 font-mono text-xl tracking-tight">
              Immortal network
            </h1>
          </div>
          <span
            className="rounded-md border border-amber-500/60 px-2 py-1 font-mono text-[0.625rem] tracking-widest text-amber-500 uppercase"
            aria-label="Regtest network — regtest sats, not real value"
          >
            regtest
          </span>
        </header>

        {/* Hero: the birds-eye panorama, or an honest empty state. */}
        <section
          aria-label="Network panorama"
          className="rounded-2xl border border-border p-4"
        >
          <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            State of the network as this browser sees it
          </p>
          {view.state === "unconfigured" ? (
            <div
              role="status"
              className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border p-8 text-center"
            >
              <p className="font-mono text-sm">network map unavailable</p>
              <p className="max-w-md text-xs text-muted-foreground">
                {view.detail} The map renders only from a signed public launch
                manifest — nothing is fabricated while the deployment is
                unconfigured.
              </p>
              <p className="font-mono text-[0.625rem] text-muted-foreground">
                {view.code}
              </p>
            </div>
          ) : (
            <>
              {view.state === "connecting" ? (
                <p role="status" className="mb-2 text-xs text-muted-foreground">
                  Probing relay identities (NIP-11)…
                </p>
              ) : null}
              <ImmortalNetworkPanorama network={view.network} />
            </>
          )}
          <p className="mt-2 font-mono text-[0.625rem] text-muted-foreground">
            regtest sats — not real value
          </p>
        </section>

        {/* Trust tiers: what pinned versus discovered means. */}
        <section
          aria-label="Trust tiers"
          className="rounded-2xl border border-border p-4"
        >
          <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            Trust tiers
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            <li>
              <span className="font-mono text-foreground">pinned</span> — relays
              and providers in the signed launch manifest: full color, verified
              by the envelope, routable from the swap card.
            </li>
            <li>
              <span className="font-mono text-foreground">
                discovered · unpinned
              </span>{" "}
              — any additional provider publishing valid 39600/39601 heads on a
              connected relay renders dimmed with an explicit unpinned tag.
              Visible on the map within one relay snapshot, never routable from
              the swap card until an operator re-signs the manifest.
            </li>
          </ul>
        </section>

        {/* Drill-down: the custody model behind every node on the map. */}
        <section
          aria-label="Custody model"
          className="rounded-2xl border border-border p-4"
        >
          <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            The custody model behind the map
          </p>
          <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
            Every swap on this network is custody-free: the requester talks to
            relays over authenticated sockets, providers quote through
            gift-wrapped records, and money moves only on the Bitcoin and
            Lightning rails inside each party&apos;s own custody zone. Relays
            never interconnect and never touch funds — going dark stops
            coordination, not custody.
          </p>
          <ImmortalNetworkTopologyScene socketState="live" />
        </section>

        {/* Join panel: one command to appear on this map. */}
        <section
          aria-label="Run a node"
          className="rounded-2xl border border-border p-4"
        >
          <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
            Run a node
          </p>
          <p className="mb-3 max-w-3xl text-xs text-muted-foreground">
            Spin up a provider, join the public regtest network, and appear on
            this map in the discovered tier — before any operator action.
          </p>
          <pre className="overflow-x-auto rounded-xl border border-border bg-card p-4 font-mono text-xs leading-relaxed">
            <code>{`git clone ${IMMORTAL_REPO_URL} && cd immortal
./scripts/join-regtest.sh provider \\
  --relays ${relayArgument} \\
  --addnode ${PUBLIC_REGTEST_ADDNODE} \\
  --gateway ${PUBLIC_REGTEST_GATEWAY} \\
  --state-dir ~/.local/share/immortal-public-regtest/provider`}</code>
          </pre>
          <p className="mt-3 text-xs text-muted-foreground">
            Full instructions:{" "}
            <a
              href={JOIN_DOC_URL}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-foreground underline underline-offset-2"
            >
              docs/join-regtest.md
            </a>
            . Listing stays a signed, human decision: the join kit ends by
            printing a request-listing line, an operator re-signs the manifest,
            and the node moves from discovered to pinned on the next manifest
            refresh.
          </p>
          <p className="mt-2 font-mono text-[0.625rem] text-muted-foreground">
            regtest sats — not real value
          </p>
        </section>
      </div>
    </main>
  )
}
