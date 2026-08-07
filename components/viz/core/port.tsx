"use client"

// <VizPort> — a typed connection point on a node's rim at a fixed angle
// (unit's pin concept). Direction is encoded by fill: inputs hollow,
// outputs filled. Color follows the edge class the port speaks.

import * as React from "react"

import { polar, type VizAnchor } from "./geometry"

import type { VizEdgeClass } from "./edge"

const CLASS_STROKE: Record<VizEdgeClass, string> = {
  socket: "var(--viz-socket)",
  giftwrap: "var(--viz-giftwrap)",
  channel: "var(--viz-channel)",
  rpc: "var(--viz-muted)",
  evidence: "var(--viz-ok)",
}

export interface VizPortProps {
  /** The node the port sits on (circle rim or rect border). */
  node: VizAnchor
  /** Rim angle in degrees; 0 = east, 90 = south (SVG y-down). */
  angleDeg: number
  klass: VizEdgeClass
  direction?: "input" | "output"
  size?: number
  label?: string
}

/** World position of a port, for anchoring edges to it. */
export function vizPortAnchor(
  node: VizAnchor,
  angleDeg: number,
  size = 3
): VizAnchor {
  const { x, y } = portPosition(node, angleDeg)
  return { x, y, shape: "circle", r: size }
}

function portPosition(
  node: VizAnchor,
  angleDeg: number
): { x: number; y: number } {
  if (node.shape === "circle") {
    return polar(node.x, node.y, node.r ?? 0, angleDeg)
  }
  const a = (angleDeg * Math.PI) / 180
  const ux = Math.cos(a)
  const uy = Math.sin(a)
  const hw = (node.width ?? 0) / 2
  const hh = (node.height ?? 0) / 2
  const sx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Number.POSITIVE_INFINITY
  const sy = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Number.POSITIVE_INFINITY
  const d = Math.min(sx, sy)
  return { x: node.x + ux * d, y: node.y + uy * d }
}

export function VizPort({
  node,
  angleDeg,
  klass,
  direction = "output",
  size = 3,
  label,
}: VizPortProps) {
  const { x, y } = portPosition(node, angleDeg)
  const stroke = CLASS_STROKE[klass]
  return (
    <g>
      {label ? <title>{label}</title> : null}
      <circle
        cx={x}
        cy={y}
        r={size}
        style={{
          stroke,
          fill: direction === "output" ? stroke : "var(--viz-node-fill)",
        }}
        strokeWidth={1}
      />
    </g>
  )
}
