"use client"

// <VizChip> — a protocol record as a visible object (unit's datum concept):
// kind number + type in mono, rendered as a small centered capsule. Used
// docked at ports or traveling along gift-wrap edges during replays.

import * as React from "react"

export type VizChipTone = "neutral" | "active" | "ok" | "warn"

const TONE_STROKE: Record<VizChipTone, string> = {
  neutral: "var(--viz-muted)",
  active: "var(--viz-giftwrap)",
  ok: "var(--viz-ok)",
  warn: "var(--viz-warn)",
}

export interface VizChipProps {
  x: number
  y: number
  /** Nostr kind number (e.g. 39605). Rendered muted before the label. */
  kind?: number
  label: string
  tone?: VizChipTone
  dimmed?: boolean
}

const FONT_SIZE = 8.5
const CHAR_WIDTH = FONT_SIZE * 0.62 // Geist Mono approximation
const PAD_X = 6
const HEIGHT = 15

/** Approximate rendered width, for layout math in compositions. */
export function vizChipWidth(label: string, kind?: number): number {
  const text = kind === undefined ? label : `${kind} ${label}`
  return Math.ceil(text.length * CHAR_WIDTH) + PAD_X * 2
}

export function VizChip({
  x,
  y,
  kind,
  label,
  tone = "neutral",
  dimmed = false,
}: VizChipProps) {
  const width = vizChipWidth(label, kind)
  const stroke = TONE_STROKE[tone]
  return (
    <g
      transform={`translate(${x} ${y})`}
      opacity={dimmed ? 0.35 : 1}
      style={{ transition: "opacity 0.2s linear" }}
    >
      <title>{kind === undefined ? label : `kind ${kind} ${label}`}</title>
      <rect
        x={-width / 2}
        y={-HEIGHT / 2}
        width={width}
        height={HEIGHT}
        rx={HEIGHT / 2}
        style={{ fill: "var(--viz-node-fill)", stroke }}
        strokeWidth={1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="central"
        className="font-mono"
        fontSize={FONT_SIZE}
        style={{ fill: "var(--viz-node-text)" }}
      >
        {kind !== undefined ? (
          <tspan style={{ fill: "var(--viz-muted)" }}>{`${kind} `}</tspan>
        ) : null}
        {label}
      </text>
    </g>
  )
}
