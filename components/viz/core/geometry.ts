// Geometry helpers for the composable SVG viz layer.
// Surface anchoring and arc arrowheads adapt patterns from samuelmtimbo/unit
// (src/client/util/geometry); see docs/network-visualization-spec.md §3.

export type VizShape = "circle" | "rect"

export interface VizAnchor {
  x: number
  y: number
  shape: VizShape
  /** Circle radius. Required when shape is "circle". */
  r?: number
  /** Rect size. Required when shape is "rect". */
  width?: number
  height?: number
}

export interface VizEdgeGeometry {
  d: string
  dInverted: string
  x0: number
  y0: number
  x1: number
  y1: number
  /** Unit vector from `from` surface toward `to` surface. */
  ux: number
  uy: number
  length: number
  /** Approach angle at the target surface, in degrees. */
  approachDeg: number
}

/** Distance from an anchor's center to its surface along a unit vector. */
export function centerToSurfaceDistance(
  anchor: VizAnchor,
  ux: number,
  uy: number
): number {
  if (anchor.shape === "circle") {
    return anchor.r ?? 0
  }
  const hw = (anchor.width ?? 0) / 2
  const hh = (anchor.height ?? 0) / 2
  if (hw === 0 || hh === 0) return 0
  const sx = Math.abs(ux) > 1e-6 ? hw / Math.abs(ux) : Number.POSITIVE_INFINITY
  const sy = Math.abs(uy) > 1e-6 ? hh / Math.abs(uy) : Number.POSITIVE_INFINITY
  return Math.min(sx, sy)
}

/** Point on an anchor's surface along a unit vector, pushed out by `padding`. */
export function surfacePoint(
  anchor: VizAnchor,
  ux: number,
  uy: number,
  padding = 0
): { x: number; y: number } {
  const d = centerToSurfaceDistance(anchor, ux, uy) + padding
  return { x: anchor.x + ux * d, y: anchor.y + uy * d }
}

/**
 * Straight edge between two anchors, endpoints on the surfaces (never the
 * centers). `dInverted` is the same segment reversed, used to keep textPath
 * labels upright when an edge points left.
 */
export function edgeGeometry(
  from: VizAnchor,
  to: VizAnchor,
  paddingFrom = 0,
  paddingTo = 0
): VizEdgeGeometry {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const centerDistance = Math.max(Math.hypot(dx, dy), 1e-6)
  const ux = dx / centerDistance
  const uy = dy / centerDistance
  const p0 = surfacePoint(from, ux, uy, paddingFrom)
  const p1 = surfacePoint(to, -ux, -uy, paddingTo)
  const length = Math.hypot(p1.x - p0.x, p1.y - p0.y)
  const approachDeg = (Math.atan2(uy, ux) * 180) / Math.PI
  return {
    d: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
    dInverted: `M ${p1.x} ${p1.y} L ${p0.x} ${p0.y}`,
    x0: p0.x,
    y0: p0.y,
    x1: p1.x,
    y1: p1.y,
    ux,
    uy,
    length,
    approachDeg,
  }
}

export function polar(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number
): { x: number; y: number } {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

/** SVG arc path from startDeg to endDeg (clockwise, degrees). */
export function describeArc(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
): string {
  const start = polar(cx, cy, r, startDeg)
  const end = polar(cx, cy, r, endDeg)
  const sweep = endDeg - startDeg
  const largeArc = Math.abs(sweep) > 180 ? 1 : 0
  const sweepFlag = sweep >= 0 ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`
}

/**
 * Arc arrowhead hugging a circular target: a short arc concentric with the
 * target node, spanning ±spreadDeg around the approach direction.
 */
export function arcHead(
  target: VizAnchor,
  approachDeg: number,
  gap = 2.5,
  spreadDeg = 42
): string {
  const r = (target.r ?? 0) + gap
  const center = approachDeg + 180
  return describeArc(
    target.x,
    target.y,
    r,
    center - spreadDeg,
    center + spreadDeg
  )
}

export function perimeter(anchor: VizAnchor): number {
  if (anchor.shape === "circle") return 2 * Math.PI * (anchor.r ?? 0)
  return 2 * ((anchor.width ?? 0) + (anchor.height ?? 0))
}

/**
 * Dash pattern scaled so a whole number of dashes fits the perimeter and the
 * ring never ends mid-dash (unit's Selection ring trick).
 */
export function evenDash(
  perimeterLength: number,
  dash = 4,
  gap = 3
): string {
  const cycle = dash + gap
  const n = Math.max(Math.round(perimeterLength / cycle), 1)
  const unitLength = perimeterLength / n
  const dashLength = unitLength * (dash / cycle)
  return `${dashLength} ${unitLength - dashLength}`
}
