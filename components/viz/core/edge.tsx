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
  /** Accessible name override; defaults to `label — state`. */
  title?: string
  /** Label position along the path (textPath startOffset), default "50%". */
  labelOffset?: string
  paddingFrom?: number
  paddingTo?: number
  /**
   * Intermediate waypoints between the two surface anchors (e.g. a gift-wrap
   * route passing a relay). The path becomes a polyline; the label follows it.
   */
  route?: ReadonlyArray<{ x: number; y: number }>
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
  title,
  labelOffset = "50%",
  paddingFrom = 2,
  paddingTo = 2,
  route,
  dimmed = false,
  className,
}: VizEdgeProps) {
  const { sceneId } = useVizScene()
  const pathId = React.useId()
  const textPathId = `${sceneId}-edge-${pathId.replace(/[^a-zA-Z0-9]/g, "")}`
  const style = EDGE_STYLE[klass]
  const markerUrl = useVizArrowMarkerUrl(style.tone)

  const headPaddingTo = head === "arc" ? paddingTo + 4 : paddingTo
  const geometry = React.useMemo(() => {
    if (!route || route.length === 0) {
      return edgeGeometry(from, to, paddingFrom, headPaddingTo)
    }
    // Polyline: surface-anchor the first and last segments, thread waypoints.
    const first = route[0]!
    const last = route[route.length - 1]!
    const start = edgeGeometry(
      from,
      { x: first.x, y: first.y, shape: "circle", r: 0 },
      paddingFrom,
      0
    )
    const end = edgeGeometry(
      { x: last.x, y: last.y, shape: "circle", r: 0 },
      to,
      0,
      headPaddingTo
    )
    const points = [
      { x: start.x0, y: start.y0 },
      ...route,
      { x: end.x1, y: end.y1 },
    ]
    const d = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ")
    const dInverted = [...points]
      .reverse()
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ")
    return {
      ...end,
      d,
      dInverted,
      x0: start.x0,
      y0: start.y0,
      ux: start.ux,
      uy: start.uy,
    }
  }, [from, to, route, paddingFrom, headPaddingTo])
  // Keep the label upright: flip the text path when the edge points left.
  const textD = geometry.x1 >= geometry.x0 - 1 ? geometry.d : geometry.dInverted

  const accessibleName =
    title ?? (label ? `${label}${state ? ` — ${state}` : ""}` : undefined)

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
            <textPath
              href={`#${textPathId}`}
              startOffset={labelOffset}
              textAnchor="middle"
            >
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
