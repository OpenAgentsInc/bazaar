"use client"

// <VizZone> — a labeled region (a provider's private rail zone), and
// <VizBoundary> — the custody boundary divider. The boundary is a first-class
// drawn element per the spec: coordination colors on one side, money colors
// on the other, and the line itself is labeled.

import * as React from "react"

export interface VizZoneProps {
  x: number
  y: number
  width: number
  height: number
  label: string
  /** Optional trailing annotation, rendered muted after the label. */
  detail?: string
  children?: React.ReactNode
}

export function VizZone({
  x,
  y,
  width,
  height,
  label,
  detail,
  children,
}: VizZoneProps) {
  return (
    <g>
      <title>{detail ? `${label} — ${detail}` : label}</title>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={10}
        style={{ fill: "var(--viz-node-fill)", stroke: "var(--viz-boundary)" }}
        fillOpacity={0.4}
        strokeWidth={1}
        strokeDasharray="3 3"
      />
      <text
        x={x + 10}
        y={y + 14}
        className="font-mono uppercase"
        fontSize={7.5}
        letterSpacing={0.8}
        style={{ fill: "var(--viz-muted)" }}
      >
        {label}
        {detail ? <tspan letterSpacing={0}>{` · ${detail}`}</tspan> : null}
      </text>
      {children}
    </g>
  )
}

export interface VizBoundaryProps {
  x: number
  y1: number
  y2: number
  /** Label for the coordination side (drawn left of the line). */
  labelLeft: string
  /** Label for the custody side (drawn right of the line). */
  labelRight: string
}

export function VizBoundary({
  x,
  y1,
  y2,
  labelLeft,
  labelRight,
}: VizBoundaryProps) {
  const labelY = y1 + 8
  return (
    <g>
      <title>{`Custody boundary: ${labelLeft} / ${labelRight}`}</title>
      <line
        x1={x}
        y1={y1}
        x2={x}
        y2={y2}
        style={{ stroke: "var(--viz-boundary)" }}
        strokeWidth={1}
        strokeDasharray="6 4"
      />
      <text
        x={x - 7}
        y={labelY}
        textAnchor="end"
        className="font-mono uppercase"
        fontSize={7.5}
        letterSpacing={0.8}
        style={{ fill: "var(--viz-muted)" }}
      >
        {labelLeft}
      </text>
      <text
        x={x + 7}
        y={labelY}
        className="font-mono uppercase"
        fontSize={7.5}
        letterSpacing={0.8}
        style={{ fill: "var(--viz-muted)" }}
      >
        {labelRight}
      </text>
    </g>
  )
}
