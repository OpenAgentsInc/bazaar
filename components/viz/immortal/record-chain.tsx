"use client"

// Drawn market record chain — the causal spine of a session as kind-numbered
// chips on two author lanes (requester above, provider below), joined by
// causal arrows. Upgrades the row-list ImmortalMarketRecordChain; the list
// keeps the prose detail, this draws the authorship rhythm.

import * as React from "react"

import {
  useVizArrowMarkerUrl,
  VizChip,
  vizChipWidth,
  VizScene,
  type VizChipTone,
} from "@/components/viz/core"
import { cn } from "@/lib/utils"

export interface RecordChainEntry {
  readonly type: string
  readonly kind: number
  readonly author: "requester" | "provider"
  readonly state: "verified" | "current" | "pending" | "refused"
}

const STATE_TONE: Record<RecordChainEntry["state"], VizChipTone> = {
  verified: "ok",
  current: "active",
  pending: "neutral",
  refused: "warn",
}

const LANE_Y: Record<RecordChainEntry["author"], number> = {
  requester: 26,
  provider: 62,
}

const GAP = 26
const X_START = 78

export interface ImmortalRecordChainVizProps {
  records: readonly RecordChainEntry[]
  className?: string
}

function ChainArrow({
  x0,
  y0,
  x1,
  y1,
  refused,
}: {
  x0: number
  y0: number
  x1: number
  y1: number
  refused: boolean
}) {
  const markerUrl = useVizArrowMarkerUrl("muted")
  return (
    <path
      d={
        y0 === y1
          ? `M ${x0} ${y0} L ${x1} ${y1}`
          : `M ${x0} ${y0} C ${(x0 + x1) / 2} ${y0}, ${(x0 + x1) / 2} ${y1}, ${x1} ${y1}`
      }
      fill="none"
      style={{ stroke: refused ? "var(--viz-warn)" : "var(--viz-muted)" }}
      strokeWidth={1}
      strokeDasharray={refused ? "2 3" : undefined}
      markerEnd={markerUrl}
    />
  )
}

export function ImmortalRecordChainViz({
  records,
  className,
}: ImmortalRecordChainVizProps) {
  // Cumulative x layout from real chip widths.
  const widths = records.map((record) =>
    vizChipWidth(record.type, record.kind)
  )
  const centers: number[] = []
  let cursor = X_START
  records.forEach((_record, index) => {
    const width = widths[index]!
    centers.push(cursor + width / 2)
    cursor += width + GAP
  })
  const sceneWidth = Math.max(cursor - GAP + 16, 360)

  return (
    <VizScene
      width={sceneWidth}
      height={92}
      label={`Signed record chain: ${records
        .map(
          (record) =>
            `${record.author} ${record.type} (kind ${record.kind}, ${record.state})`
        )
        .join("; ")}`}
      className={cn(className)}
    >
      {(["requester", "provider"] as const).map((author) => (
        <g key={author}>
          <text
            x={10}
            y={LANE_Y[author] + 3}
            className="font-mono uppercase"
            fontSize={6.5}
            letterSpacing={0.6}
            style={{ fill: "var(--viz-muted)" }}
          >
            {author}
          </text>
          <line
            x1={X_START - 12}
            y1={LANE_Y[author]}
            x2={sceneWidth - 10}
            y2={LANE_Y[author]}
            style={{ stroke: "var(--viz-boundary)" }}
            strokeWidth={0.75}
            strokeDasharray="1 4"
          />
        </g>
      ))}
      {records.slice(0, -1).map((record, index) => {
        const next = records[index + 1]!
        return (
          <ChainArrow
            key={`arrow-${index}`}
            x0={centers[index]! + widths[index]! / 2 + 2}
            y0={LANE_Y[record.author]}
            x1={centers[index + 1]! - widths[index + 1]! / 2 - 4}
            y1={LANE_Y[next.author]}
            refused={next.state === "refused"}
          />
        )
      })}
      {records.map((record, index) => (
        <VizChip
          key={`${record.type}-${index}`}
          x={centers[index]!}
          y={LANE_Y[record.author]}
          kind={record.kind}
          label={record.type}
          tone={STATE_TONE[record.state]}
          dimmed={record.state === "pending"}
        />
      ))}
    </VizScene>
  )
}
