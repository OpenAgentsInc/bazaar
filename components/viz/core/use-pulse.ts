"use client"

// usePulse — rAF progress driver for motion that carries protocol meaning
// (record chips traveling edges). Under prefers-reduced-motion the hook
// reports the static progress instead of animating; compositions render the
// same frame the stepped controls would show.
//
// The target is re-read every frame (unit's animateSimulate thunk-target
// pattern), so a pulse can retarget mid-flight without restarting.

import * as React from "react"

import { useVizScene } from "./scene"

export interface UsePulseOptions {
  /** Milliseconds for a full 0 → 1 traversal. */
  durationMs: number
  playing: boolean
  loop?: boolean
  /** Progress reported when not animating (reduced motion / paused). */
  staticProgress?: number
  onComplete?: () => void
}

export function usePulse({
  durationMs,
  playing,
  loop = false,
  staticProgress = 1,
  onComplete,
}: UsePulseOptions): number {
  const { reducedMotion } = useVizScene()
  const [progress, setProgress] = React.useState(0)
  const onCompleteRef = React.useRef(onComplete)
  React.useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const animate = playing && !reducedMotion

  React.useEffect(() => {
    if (!animate) return
    let frame = 0
    let start: number | null = null
    const tick = (now: number) => {
      if (start === null) start = now
      const elapsed = now - start
      const p = elapsed / durationMs
      if (p >= 1) {
        if (loop) {
          start = now
          setProgress(0)
          frame = requestAnimationFrame(tick)
        } else {
          setProgress(1)
          onCompleteRef.current?.()
        }
        return
      }
      setProgress(p)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [animate, durationMs, loop])

  if (!animate) {
    return playing ? staticProgress : progress
  }
  return progress
}

/** Point at `progress` (0..1) along a straight segment. */
export function pointAlongSegment(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  progress: number
): { x: number; y: number } {
  const p = Math.min(Math.max(progress, 0), 1)
  return { x: x0 + (x1 - x0) * p, y: y0 + (y1 - y0) * p }
}

/**
 * Point at `progress` along a multi-segment route (e.g. requester → relay →
 * provider). Segment lengths weight the parameterization so speed is uniform.
 */
export function pointAlongRoute(
  points: ReadonlyArray<{ x: number; y: number }>,
  progress: number
): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 }
  const first = points[0]!
  if (points.length === 1) return { x: first.x, y: first.y }
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i]!
    const b = points[i + 1]!
    const l = Math.hypot(b.x - a.x, b.y - a.y)
    lengths.push(l)
    total += l
  }
  if (total === 0) return { x: first.x, y: first.y }
  let remaining = Math.min(Math.max(progress, 0), 1) * total
  for (let i = 0; i < lengths.length; i += 1) {
    const l = lengths[i]!
    if (remaining <= l || i === lengths.length - 1) {
      const a = points[i]!
      const b = points[i + 1]!
      const p = l === 0 ? 0 : remaining / l
      return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }
    }
    remaining -= l
  }
  const last = points[points.length - 1]!
  return { x: last.x, y: last.y }
}
