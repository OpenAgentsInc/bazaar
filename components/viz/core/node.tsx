"use client"

// <VizNode> — zero-size anchor at (x, y) with centered content, shape-aware
// stroke, redundant (non-color) state encoding, an enlarged invisible hit
// target, and a perimeter-even dashed focus/hover ring.
// Patterns from unit: node anchor/centering, touch area, Selection ring.

import * as React from "react"

import { cn } from "@/lib/utils"

import { evenDash, perimeter, type VizAnchor, type VizShape } from "./geometry"

export type VizNodeRole =
  | "requester"
  | "relay"
  | "provider"
  | "rail"
  | "service"
  | "neutral"

export type VizNodeState = "ready" | "starting" | "degraded" | "offline"

const ROLE_STROKE: Record<VizNodeRole, string> = {
  requester: "var(--viz-socket)",
  relay: "var(--viz-giftwrap)",
  provider: "var(--viz-bitcoin)",
  rail: "var(--viz-channel)",
  service: "var(--viz-muted)",
  neutral: "var(--viz-node)",
}

// State is never color-only: each state pairs a color change with a dash
// pattern and a mono glyph suffix on the label.
const STATE_GLYPH: Record<VizNodeState, string> = {
  ready: "",
  starting: " …",
  degraded: " !",
  offline: " ×",
}

const STATE_DASH: Record<VizNodeState, string | undefined> = {
  ready: undefined,
  starting: "2 2.5",
  degraded: "5 2",
  offline: "1.5 3",
}

export interface VizNodeProps {
  x: number
  y: number
  shape: VizShape
  /** Circle radius. */
  r?: number
  /** Rect size. */
  width?: number
  height?: number
  role?: VizNodeRole
  state?: VizNodeState
  label?: string
  sublabel?: string
  /** Place the label under (default) or inside the shape. */
  labelPlacement?: "below" | "inside"
  selected?: boolean
  dimmed?: boolean
  interactive?: boolean
  onSelect?: () => void
  /** Extra SVG children rendered in node-local coordinates (0,0 = center). */
  children?: React.ReactNode
  className?: string
}

export function vizNodeAnchor(props: VizNodeProps): VizAnchor {
  const { x, y, shape, r, width, height } = props
  return { x, y, shape, r, width, height }
}

const RING_PADDING = 5
const HIT_PADDING = 10

export function VizNode(props: VizNodeProps) {
  const {
    x,
    y,
    shape,
    r = 0,
    width = 0,
    height = 0,
    role = "neutral",
    state = "ready",
    label,
    sublabel,
    labelPlacement = "below",
    selected = false,
    dimmed = false,
    interactive = false,
    onSelect,
    children,
    className,
  } = props

  const stroke =
    state === "degraded"
      ? "var(--viz-warn)"
      : state === "offline"
        ? "var(--viz-danger)"
        : ROLE_STROKE[role]

  const halfW = shape === "circle" ? r : width / 2
  const halfH = shape === "circle" ? r : height / 2

  const ringAnchor: VizAnchor = {
    x: 0,
    y: 0,
    shape,
    r: r + RING_PADDING,
    width: width + RING_PADDING * 2,
    height: height + RING_PADDING * 2,
  }
  const ringDash = evenDash(perimeter(ringAnchor), 3, 3)

  const accessibleName = label
    ? `${label}${state !== "ready" ? ` (${state})` : ""}`
    : undefined

  const labelY =
    labelPlacement === "inside" ? (sublabel ? -1 : 3) : halfH + 13

  return (
    <g
      transform={`translate(${x} ${y})`}
      className={cn("group", className)}
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? "button" : undefined}
      aria-label={interactive ? accessibleName : undefined}
      onClick={interactive ? onSelect : undefined}
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onSelect?.()
              }
            }
          : undefined
      }
      opacity={dimmed ? 0.35 : 1}
      style={{ outline: "none", transition: "opacity 0.2s linear" }}
    >
      {!interactive && accessibleName ? <title>{accessibleName}</title> : null}
      {/* Enlarged invisible hit target (unit's touch-area pattern). */}
      {shape === "circle" ? (
        <circle r={r + HIT_PADDING} fill="transparent" stroke="none" />
      ) : (
        <rect
          x={-halfW - HIT_PADDING}
          y={-halfH - HIT_PADDING}
          width={width + HIT_PADDING * 2}
          height={height + HIT_PADDING * 2}
          fill="transparent"
          stroke="none"
        />
      )}
      {/* Main shape. */}
      {shape === "circle" ? (
        <circle
          r={r}
          style={{ fill: "var(--viz-node-fill)", stroke }}
          strokeWidth={1.25}
          strokeDasharray={STATE_DASH[state]}
          opacity={state === "offline" ? 0.55 : 1}
        />
      ) : (
        <rect
          x={-halfW}
          y={-halfH}
          width={width}
          height={height}
          rx={6}
          style={{ fill: "var(--viz-node-fill)", stroke }}
          strokeWidth={1.25}
          strokeDasharray={STATE_DASH[state]}
          opacity={state === "offline" ? 0.55 : 1}
        />
      )}
      {/* Perimeter-even dashed ring: visible on hover/focus/selected. */}
      {shape === "circle" ? (
        <circle
          r={r + RING_PADDING}
          fill="none"
          style={{ stroke }}
          strokeWidth={1}
          strokeDasharray={ringDash}
          className={cn(
            "pointer-events-none transition-opacity motion-reduce:transition-none",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-70 group-focus-visible:opacity-100"
          )}
        />
      ) : (
        <rect
          x={-halfW - RING_PADDING}
          y={-halfH - RING_PADDING}
          width={width + RING_PADDING * 2}
          height={height + RING_PADDING * 2}
          rx={8}
          fill="none"
          style={{ stroke }}
          strokeWidth={1}
          strokeDasharray={ringDash}
          className={cn(
            "pointer-events-none transition-opacity motion-reduce:transition-none",
            selected
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-70 group-focus-visible:opacity-100"
          )}
        />
      )}
      {label ? (
        <text
          y={labelY}
          textAnchor="middle"
          className="font-mono"
          fontSize={10}
          style={{ fill: "var(--viz-node-text)" }}
        >
          {label}
          {STATE_GLYPH[state] ? (
            <tspan style={{ fill: stroke }}>{STATE_GLYPH[state]}</tspan>
          ) : null}
        </text>
      ) : null}
      {sublabel ? (
        <text
          y={labelPlacement === "inside" ? 10 : labelY + 11}
          textAnchor="middle"
          className="font-mono"
          fontSize={8}
          style={{ fill: "var(--viz-muted)" }}
        >
          {sublabel}
        </text>
      ) : null}
      {children}
    </g>
  )
}
