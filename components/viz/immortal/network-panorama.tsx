"use client"

// Network panorama — the birds-eye "state of the network as we see it".
// Clients cloud inside the relay ring, providers on the outer ring, socket
// edges weighted by 24h volume, Lightning channel arcs between providers,
// coordination pulses flowing along live edges, and a market HUD (swaps,
// volume, operator fees). Layout is deterministic: seeded hashes, no force
// simulation, so no relay or provider is randomly privileged between renders.
//
// Honesty constraints carried from the spec: relays never interconnect
// (there is no federation/gossip), channels connect providers and clients
// directly (the overlay network), and offline infrastructure stops pulsing
// instead of being hidden.

import * as React from "react"

import {
  useVizScene,
  VizNode,
  VizScene,
  type VizNodeState,
} from "@/components/viz/core"
import { cn } from "@/lib/utils"

/**
 * Trust tier for a panorama node. "pinned" nodes come from the signed launch
 * manifest (full color, verified); "discovered" nodes merely published valid
 * market heads on a connected relay — rendered dimmed with an explicit
 * "unpinned" suffix (never color-only), and never routable from the swap
 * card. Absent means pinned (backwards compatible).
 */
export type PanoramaTrust = "pinned" | "discovered"

export interface PanoramaRelay {
  id: string
  label: string
  state?: VizNodeState
  trust?: PanoramaTrust
}

export interface PanoramaProvider {
  id: string
  label: string
  state?: VizNodeState
  trust?: PanoramaTrust
  /** Relay ids this provider publishes offerings on. */
  relayIds: readonly string[]
  feeBps: number
  swaps24h: number
  volumeSat24h: number | null
}

export interface PanoramaStats {
  swaps24h: number
  volumeSat24h: number | null
  operatorFeeSat24h: number | null
}

export interface PanoramaNetwork {
  name: string
  relays: readonly PanoramaRelay[]
  providers: readonly PanoramaProvider[]
  clientCount: number
  stats: PanoramaStats
  /** 0..1 relative market activity — scales pulse density and speed. */
  activity: number
}

export interface ImmortalNetworkPanoramaProps {
  network: PanoramaNetwork
  /** "volume" weights edges/nodes by 24h volume and labels top providers. */
  overlay?: "volume" | "none"
  className?: string
}

// --- deterministic pseudo-randomness -----------------------------------

function hash32(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** mulberry32 — tiny seeded PRNG so layouts are stable across renders. */
function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Discovered-tier rendering: dimmed to ~0.55 and an explicit textual
// "unpinned" suffix carried into the label, the SVG <title>, and the
// sr-only mirror — the tier is never encoded by opacity alone.
const DISCOVERED_OPACITY = 0.55

export function trustLabel(label: string, trust?: PanoramaTrust): string {
  return trust === "discovered" ? `${label} · unpinned` : label
}

export function formatSats(n: number | null): string {
  if (n === null) return "not disclosed"
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(2)} BTC`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M sats`
  return `${n.toLocaleString("en-US")} sats`
}

// --- layout --------------------------------------------------------------

const W = 900
const H = 700
const CX = 470
const CY = 348

interface LayoutPoint {
  x: number
  y: number
  angle: number
}

function circularMean(angles: number[]): number {
  const sx = angles.reduce((s, a) => s + Math.cos(a), 0)
  const sy = angles.reduce((s, a) => s + Math.sin(a), 0)
  return Math.atan2(sy, sx)
}

function usePanoramaLayout(network: PanoramaNetwork) {
  return React.useMemo(() => {
    const relayRadius = Math.min(120 + network.relays.length * 8, 172)
    const providerRadius = relayRadius + 118

    const relayPos = new Map<string, LayoutPoint>()
    network.relays.forEach((relay, index) => {
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / network.relays.length
      relayPos.set(relay.id, {
        x: CX + relayRadius * Math.cos(angle),
        y: CY + relayRadius * Math.sin(angle),
        angle,
      })
    })

    // Providers: desired angle = circular mean of home relays, then spread
    // evenly in that order so nothing overlaps.
    const desired = network.providers.map((provider) => {
      const angles = provider.relayIds
        .map((id) => relayPos.get(id)?.angle)
        .filter((a): a is number => a !== undefined)
      return {
        provider,
        angle: angles.length > 0 ? circularMean(angles) : 0,
      }
    })
    desired.sort((a, b) => a.angle - b.angle)
    const providerPos = new Map<string, LayoutPoint>()
    desired.forEach((entry, index) => {
      // Even distribution (ordered by home-relay angle, so locality holds)
      // with a half-slot stagger so provider and relay rings interleave —
      // channel arcs never line up through a relay.
      const angle =
        -Math.PI / 2 + ((index + 0.5) * 2 * Math.PI) / desired.length
      providerPos.set(entry.provider.id, {
        x: CX + providerRadius * Math.cos(angle),
        y: CY + providerRadius * Math.sin(angle),
        angle,
      })
    })

    // Clients: a seeded cloud inside the relay ring, each homed to a relay.
    const clients: Array<{ x: number; y: number; relayId: string }> = []
    const rand = seededRandom(hash32(network.name))
    for (let i = 0; i < network.clientCount; i += 1) {
      const relay = network.relays[Math.floor(rand() * network.relays.length)]!
      const home = relayPos.get(relay.id)!
      const spread = 0.55 + rand() * 0.5
      const angle =
        home.angle + (rand() - 0.5) * (Math.PI / network.relays.length) * 1.6
      const radius = relayRadius * (1 - spread * 0.72) + rand() * 18
      clients.push({
        x: CX + radius * Math.cos(angle),
        y: CY + radius * Math.sin(angle),
        relayId: relay.id,
      })
    }

    // Channel arcs: neighboring providers on the ring, plus seeded chords.
    const ring = desired.map((entry) => entry.provider)
    const channels: Array<[string, string]> = []
    // Neighbor channels; a 2-provider ring gets exactly one, not a duplicate.
    const neighborCount = ring.length === 2 ? 1 : ring.length
    for (let i = 0; i < neighborCount && ring.length > 1; i += 1) {
      channels.push([ring[i]!.id, ring[(i + 1) % ring.length]!.id])
    }
    const chordRand = seededRandom(hash32(`${network.name}-chords`))
    const chordCount = Math.floor(ring.length / 3)
    for (let i = 0; i < chordCount; i += 1) {
      const a = Math.floor(chordRand() * ring.length)
      const b =
        (a + 2 + Math.floor(chordRand() * (ring.length - 3))) % ring.length
      if (a !== b) channels.push([ring[a]!.id, ring[b]!.id])
    }

    return {
      relayPos,
      providerPos,
      clients,
      channels,
      relayRadius,
      providerRadius,
    }
  }, [network])
}

// --- shared animation clock ----------------------------------------------

function useSceneTime(active: boolean): number {
  const [time, setTime] = React.useState(0)
  React.useEffect(() => {
    if (!active) return
    let frame = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      setTime((now - start) / 1000)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active])
  return time
}

// --- flow particles --------------------------------------------------------

function FlowParticles({
  x0,
  y0,
  x1,
  y1,
  count,
  seedKey,
  color,
  time,
}: {
  x0: number
  y0: number
  x1: number
  y1: number
  count: number
  seedKey: string
  color: string
  time: number
}) {
  const rand = seededRandom(hash32(seedKey))
  const particles = Array.from({ length: count }, (_, index) => ({
    phase: rand(),
    period: 2.4 + rand() * 2.2,
    reverse: (index + Math.floor(rand() * 2)) % 2 === 1,
  }))
  return (
    <>
      {particles.map((particle, index) => {
        const raw = time / particle.period + particle.phase
        let p = raw - Math.floor(raw)
        if (particle.reverse) p = 1 - p
        return (
          <circle
            key={index}
            cx={x0 + (x1 - x0) * p}
            cy={y0 + (y1 - y0) * p}
            r={1.6}
            style={{ fill: color }}
            opacity={0.9}
          />
        )
      })}
    </>
  )
}

// --- scene body (needs the scene's reduced-motion context) -----------------

function PanoramaBody({
  network,
  overlay,
}: {
  network: PanoramaNetwork
  overlay: "volume" | "none"
}) {
  const { reducedMotion } = useVizScene()
  // Static-but-alive frame under reduced motion: particles freeze at their
  // seeded phases (t is constant), so the network still reads as busy.
  const time = useSceneTime(!reducedMotion)
  const frozenTime = 0.42
  const t = reducedMotion ? frozenTime : time

  const layout = usePanoramaLayout(network)
  const maxVolume = Math.max(
    ...network.providers.map((provider) => provider.volumeSat24h ?? 0),
    1
  )
  const relayById = new Map(network.relays.map((relay) => [relay.id, relay]))
  const providerById = new Map(
    network.providers.map((provider) => [provider.id, provider])
  )

  const topProviders = [...network.providers]
    .sort((a, b) => (b.volumeSat24h ?? 0) - (a.volumeSat24h ?? 0))
    .slice(0, 3)
  const topProviderIds = new Set(topProviders.map((provider) => provider.id))

  return (
    <>
      {/* Client cloud: thin sampled socket lines first, dots after. */}
      {layout.clients.map((client, index) => {
        const relay = relayById.get(client.relayId)
        const home = layout.relayPos.get(client.relayId)!
        const relayDown = relay?.state === "offline"
        if (index % 3 === 0 && !relayDown) {
          return (
            <line
              key={`cl-${index}`}
              x1={client.x}
              y1={client.y}
              x2={home.x}
              y2={home.y}
              style={{ stroke: "var(--viz-socket)" }}
              strokeWidth={0.4}
              opacity={0.14}
            />
          )
        }
        return null
      })}

      {/* Channel arcs between providers (the Lightning overlay). */}
      {layout.channels.map(([aId, bId], index) => {
        const a = layout.providerPos.get(aId)
        const b = layout.providerPos.get(bId)
        const providerA = providerById.get(aId)
        const providerB = providerById.get(bId)
        if (!a || !b || !providerA || !providerB) return null
        const down =
          providerA.state === "offline" || providerB.state === "offline"
        const volume = Math.min(
          providerA.volumeSat24h ?? 0,
          providerB.volumeSat24h ?? 0
        )
        const width =
          overlay === "volume" ? 0.6 + (volume / maxVolume) * 1.8 : 0.9
        // Bow the arc outward, away from the center; when the chord passes
        // through the center (diametral pair) fall back to the chord normal.
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        let dx = mx - CX
        let dy = my - CY
        let d = Math.hypot(dx, dy)
        if (d < 12) {
          dx = -(b.y - a.y)
          dy = b.x - a.x
          d = Math.max(Math.hypot(dx, dy), 1)
        }
        const bow = 34 + (index % 3) * 10
        const qx = mx + (dx / d) * bow
        const qy = my + (dy / d) * bow
        return (
          <g key={`ch-${aId}-${bId}-${index}`}>
            <path
              d={`M ${a.x} ${a.y} Q ${qx} ${qy} ${b.x} ${b.y}`}
              fill="none"
              style={{ stroke: "var(--viz-channel)" }}
              strokeWidth={width}
              strokeDasharray={down ? "2 4" : undefined}
              opacity={down ? 0.25 : 0.5}
            />
            {!down && network.activity > 0.05 ? (
              <ChannelParticles
                ax={a.x}
                ay={a.y}
                qx={qx}
                qy={qy}
                bx={b.x}
                by={b.y}
                count={Math.max(1, Math.round(network.activity * 2))}
                seedKey={`${network.name}-ch-${aId}-${bId}`}
                time={t}
              />
            ) : null}
          </g>
        )
      })}

      {/* Provider ↔ relay sockets with coordination pulses. */}
      {network.providers.map((provider) => {
        const from = layout.providerPos.get(provider.id)
        if (!from) return null
        return provider.relayIds.map((relayId) => {
          const to = layout.relayPos.get(relayId)
          const relay = relayById.get(relayId)
          if (!to || !relay) return null
          const down = provider.state === "offline" || relay.state === "offline"
          const degraded =
            provider.state === "degraded" || relay.state === "degraded"
          const width =
            overlay === "volume"
              ? 0.7 + ((provider.volumeSat24h ?? 0) / maxVolume) * 2.4
              : 1
          const pulses = down
            ? 0
            : Math.max(
                1,
                Math.round(
                  network.activity *
                    (1 + ((provider.volumeSat24h ?? 0) / maxVolume) * 5)
                )
              )
          return (
            <g key={`sock-${provider.id}-${relayId}`}>
              <title>
                {`${provider.label} ↔ ${relay.label}: ${
                  down ? "down" : degraded ? "degraded" : "live"
                }${
                  overlay === "volume"
                    ? `, ${formatSats(provider.volumeSat24h)} 24h`
                    : ""
                }`}
              </title>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                style={{
                  stroke: down
                    ? "var(--viz-danger)"
                    : degraded
                      ? "var(--viz-warn)"
                      : "var(--viz-socket)",
                }}
                strokeWidth={width}
                strokeDasharray={down ? "2 4" : degraded ? "5 3" : undefined}
                opacity={down ? 0.3 : 0.45}
              />
              {pulses > 0 ? (
                <FlowParticles
                  x0={from.x}
                  y0={from.y}
                  x1={to.x}
                  y1={to.y}
                  count={pulses}
                  seedKey={`${network.name}-${provider.id}-${relayId}`}
                  color="var(--viz-giftwrap)"
                  time={t}
                />
              ) : null}
            </g>
          )
        })
      })}

      {/* Client dots above the lines. */}
      {layout.clients.map((client, index) => (
        <circle
          key={`c-${index}`}
          cx={client.x}
          cy={client.y}
          r={1.8}
          style={{ fill: "var(--viz-muted)" }}
          opacity={0.75}
        />
      ))}

      {/* Relays. */}
      {network.relays.map((relay) => {
        const at = layout.relayPos.get(relay.id)!
        const discovered = relay.trust === "discovered"
        return (
          <g key={relay.id} opacity={discovered ? DISCOVERED_OPACITY : 1}>
            <VizNode
              x={at.x}
              y={at.y}
              shape="circle"
              r={13}
              role="relay"
              state={relay.state ?? "ready"}
              label={trustLabel(relay.label, relay.trust)}
            />
          </g>
        )
      })}

      {/* Providers, sized by volume under the volume overlay. */}
      {network.providers.map((provider) => {
        const at = layout.providerPos.get(provider.id)
        if (!at) return null
        const r =
          overlay === "volume"
            ? 9 + Math.sqrt((provider.volumeSat24h ?? 0) / maxVolume) * 9
            : 11
        const labelSide = at.x >= CX ? 1 : -1
        const discovered = provider.trust === "discovered"
        return (
          <g key={provider.id} opacity={discovered ? DISCOVERED_OPACITY : 1}>
            <VizNode
              x={at.x}
              y={at.y}
              shape="circle"
              r={r}
              role="provider"
              state={provider.state ?? "ready"}
              label={trustLabel(provider.label, provider.trust)}
            />
            {overlay === "volume" && topProviderIds.has(provider.id) ? (
              <text
                x={at.x + labelSide * (r + 8)}
                y={at.y - r - 4}
                textAnchor={labelSide === 1 ? "start" : "end"}
                className="font-mono"
                fontSize={7.5}
                style={{ fill: "var(--viz-muted)" }}
              >
                {formatSats(provider.volumeSat24h)} ·{" "}
                <tspan style={{ fill: "var(--viz-bitcoin)" }}>
                  {provider.feeBps} bps
                </tspan>
              </text>
            ) : null}
          </g>
        )
      })}

      {/* Market HUD. */}
      <g>
        <rect
          x={14}
          y={14}
          width={196}
          height={132}
          rx={8}
          style={{
            fill: "var(--viz-node-fill)",
            stroke: "var(--viz-boundary)",
          }}
          fillOpacity={0.85}
          strokeWidth={1}
        />
        <text
          x={26}
          y={34}
          className="font-mono uppercase"
          fontSize={7.5}
          letterSpacing={1}
          style={{ fill: "var(--viz-muted)" }}
        >
          {network.name}
        </text>
        {(
          [
            ["swaps 24h", network.stats.swaps24h.toLocaleString("en-US")],
            ["volume 24h", formatSats(network.stats.volumeSat24h)],
            ["operator fees", formatSats(network.stats.operatorFeeSat24h)],
            [
              "providers",
              `${network.providers.filter((p) => (p.state ?? "ready") === "ready").length}/${network.providers.length}`,
            ],
            [
              "relays",
              `${network.relays.filter((r) => (r.state ?? "ready") === "ready").length}/${network.relays.length}`,
            ],
            ["clients", network.clientCount.toLocaleString("en-US")],
          ] as const
        ).map(([key, value], index) => (
          <g key={key}>
            <text
              x={26}
              y={52 + index * 16}
              className="font-mono"
              fontSize={8}
              style={{ fill: "var(--viz-muted)" }}
            >
              {key}
            </text>
            <text
              x={198}
              y={52 + index * 16}
              textAnchor="end"
              className="font-mono"
              fontSize={8.5}
              style={{
                fill:
                  key === "operator fees"
                    ? "var(--viz-bitcoin)"
                    : "var(--viz-node-text)",
              }}
            >
              {value}
            </text>
          </g>
        ))}
      </g>
    </>
  )
}

/** Particles along a quadratic channel arc. */
function ChannelParticles({
  ax,
  ay,
  qx,
  qy,
  bx,
  by,
  count,
  seedKey,
  time,
}: {
  ax: number
  ay: number
  qx: number
  qy: number
  bx: number
  by: number
  count: number
  seedKey: string
  time: number
}) {
  const rand = seededRandom(hash32(seedKey))
  const particles = Array.from({ length: count }, () => ({
    phase: rand(),
    period: 3 + rand() * 2.5,
    reverse: rand() > 0.5,
  }))
  return (
    <>
      {particles.map((particle, index) => {
        const raw = time / particle.period + particle.phase
        let p = raw - Math.floor(raw)
        if (particle.reverse) p = 1 - p
        const inv = 1 - p
        const x = inv * inv * ax + 2 * inv * p * qx + p * p * bx
        const y = inv * inv * ay + 2 * inv * p * qy + p * p * by
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={1.5}
            style={{ fill: "var(--viz-channel)" }}
            opacity={0.85}
          />
        )
      })}
    </>
  )
}

export function ImmortalNetworkPanorama({
  network,
  overlay = "volume",
  className,
}: ImmortalNetworkPanoramaProps) {
  const readyProviders = network.providers.filter(
    (provider) => (provider.state ?? "ready") === "ready"
  ).length
  const readyRelays = network.relays.filter(
    (relay) => (relay.state ?? "ready") === "ready"
  ).length
  return (
    <div className={cn(className)}>
      <VizScene
        width={W}
        height={H}
        label={`Network panorama "${network.name}": ${network.relays.length} relays (${readyRelays} ready), ${network.providers.length} providers (${readyProviders} ready), ${network.clientCount} clients; ${network.stats.swaps24h.toLocaleString("en-US")} swaps and ${formatSats(network.stats.volumeSat24h)} volume in 24h, ${formatSats(network.stats.operatorFeeSat24h)} operator fees`}
      >
        <PanoramaBody network={network} overlay={overlay} />
      </VizScene>
      {/* Screen-reader mirror of the HUD and per-provider volume. */}
      <dl className="sr-only">
        <dt>Swaps in 24h</dt>
        <dd>{network.stats.swaps24h.toLocaleString("en-US")}</dd>
        <dt>Volume in 24h</dt>
        <dd>{formatSats(network.stats.volumeSat24h)}</dd>
        <dt>Operator fees in 24h</dt>
        <dd>{formatSats(network.stats.operatorFeeSat24h)}</dd>
        {network.relays.map((relay) => (
          <React.Fragment key={relay.id}>
            <dt>{trustLabel(relay.label, relay.trust)}</dt>
            <dd>
              relay · {relay.state ?? "ready"} ·{" "}
              {relay.trust === "discovered"
                ? "unpinned (not in the signed manifest)"
                : "pinned by the signed manifest"}
            </dd>
          </React.Fragment>
        ))}
        {network.providers.map((provider) => (
          <React.Fragment key={provider.id}>
            <dt>{trustLabel(provider.label, provider.trust)}</dt>
            <dd>
              {provider.state ?? "ready"} · {provider.swaps24h} swaps ·{" "}
              {formatSats(provider.volumeSat24h)} · fee {provider.feeBps} bps
              {provider.trust === "discovered"
                ? " · unpinned (not in the signed manifest)"
                : ""}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </div>
  )
}
