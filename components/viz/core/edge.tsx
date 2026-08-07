"use client"

// <VizEdge> — straight surface-anchored edge with unit's link-group anatomy:
// visible path(s) + invisible fat hit path + upright textPath label.
// Five edge classes, each distinct in BOTH shape (dash/double stroke) and
// color, so class identity survives grayscale.

import * as React from "react"

import { cn } from "@/lib/utils"

import { arcHead, edgeGeometry, type VizAnchor } from "./geometry"
import { useVizArrowMarkerUrl, type VizMarkerTone } from "./marker"
import { useVizScene } from "./scene"

export type VizEdgeClass =
  | "socket"
  | "giftwrap"
  | "channel"
  | "rpc"
  | "evidence"

interface EdgeStyle {
  stroke: string
  strokeWidth: number
  dash?: string
  linecap?: "round" | "butt"
  /** Render as two parallel strokes (Lightning channels). */
  double?: boolean
  tone: VizMarkerTone
}

const EDGE_STYLE: Record<VizEdgeClass, EdgeStyle> = {
  socket: { stroke: "var(--viz-socket)", strokeWidth: 1.5, tone: "socket" },
  giftwrap: {
    stroke: "var(--viz-giftwrap)",
    strokeWidth: 1.25,
    dash: "7 4",
    tone: "giftwrap",
  },
  channel: {
    stroke: "var(--viz-channel)",
    strokeWidth: 1.25,
    double: true,
    tone: "channel",
  },
  rpc: {
    stroke: "var(--viz-muted)",
    strokeWidth: 1,
    dash: "2 3",
    linecap: "round",
    tone: "rpc",
  },
  evidence: {
    stroke: "var(--viz-ok)",
    strokeWidth: 1,
    dash: "1 4",
    linecap: "round",
    tone: "evidence",
  },
}

export interface VizEdgeProps {
  from: VizAnchor
  to: VizAnchor
  klass: VizEdgeClass
  label?: string
  /** Secondary mono annotation rendered after the label (e.g. a state). */
  state?: string
  head?: "none" | "arrow" | "arc"
  paddingFrom?: number
  paddingTo?: number
  dimmed?: boolean
  className?: string
}

export function VizEdge({
  from,
  to,
  klass,
  label,
  state,
  head = "none",
  paddingFrom = 2,
  paddingTo = 2,
  dimmed = false,
  className,
}: VizEdgeProps) {
  const { sceneId } = useVizScene()
  const pathId = React.useId()
  const textPathId = `${sceneId}-edge-${pathId.replace(/[^a-zA-Z0-9]/g, "")}`
  const style = EDGE_STYLE[klass]
  const markerUrl = useVizArrowMarkerUrl(style.tone)

  const headPaddingTo = head === "arc" ? paddingTo + 4 : paddingTo
  const geometry = edgeGeometry(from, to, paddingFrom, headPaddingTo)
  // Keep the label upright: flip the text path when the edge points left.
  const textD = geometry.x1 >= geometry.x0 - 1 ? geometry.d : geometry.dInverted

  const accessibleName = label
    ? `${label}${state ? ` — ${state}` : ""}`
    : undefined

  const doubleOffset = 1.4
  const nx = -geometry.uy * doubleOffset
  const ny = geometry.ux * doubleOffset

  return (
    <g
      className={cn("group", className)}
      opacity={dimmed ? 0.25 : 1}
      style={{ transition: "opacity 0.2s linear" }}
    >
      {accessibleName ? <title>{accessibleName}</title> : null}
      {/* Invisible fat hit path. */}
      <path
        d={geometry.d}
        fill="none"
        stroke="transparent"
        strokeWidth={Math.max(20, style.strokeWidth + 18)}
      />
      {style.double ? (
        <>
          <path
            d={`M ${geometry.x0 + nx} ${geometry.y0 + ny} L ${geometry.x1 + nx} ${geometry.y1 + ny}`}
            fill="none"
            style={{ stroke: style.stroke }}
            strokeWidth={style.strokeWidth}
          />
          <path
            d={`M ${geometry.x0 - nx} ${geometry.y0 - ny} L ${geometry.x1 - nx} ${geometry.y1 - ny}`}
            fill="none"
            style={{ stroke: style.stroke }}
            strokeWidth={style.strokeWidth}
          />
        </>
      ) : (
        <path
          d={geometry.d}
          fill="none"
          style={{ stroke: style.stroke }}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.dash}
          strokeLinecap={style.linecap}
          markerEnd={head === "arrow" ? markerUrl : undefined}
        />
      )}
      {head === "arc" && to.shape === "circle" ? (
        <path
          d={arcHead(to, geometry.approachDeg)}
          fill="none"
          style={{ stroke: style.stroke }}
          strokeWidth={style.strokeWidth}
          strokeLinecap="round"
        />
      ) : null}
      {label ? (
        <>
          {/* Invisible geometry carrier for the textPath. */}
          <path id={textPathId} d={textD} fill="none" stroke="none" />
          <text
            className="font-mono"
            fontSize={8.5}
            dy={-4}
            style={{ fill: "var(--viz-muted)" }}
          >
            <textPath href={`#${textPathId}`} startOffset="50%" textAnchor="middle">
              {label}
              {state ? (
                <tspan style={{ fill: style.stroke }}>{` · ${state}`}</tspan>
              ) : null}
            </textPath>
          </text>
        </>
      ) : null}
    </g>
  )
}
