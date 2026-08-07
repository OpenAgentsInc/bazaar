"use client"

// Instance-namespaced SVG markers. Ids are scoped by scene so multiple
// diagrams can share one Storybook docs page without def collisions
// (unit's hashed marker-id pattern). One arrow marker is emitted per color
// tone because `context-stroke` is not yet safely portable.

import * as React from "react"

import { useVizScene } from "./scene"

export const VIZ_MARKER_TONES = [
  "socket",
  "giftwrap",
  "channel",
  "rpc",
  "evidence",
  "muted",
] as const

export type VizMarkerTone = (typeof VIZ_MARKER_TONES)[number]

const TONE_STROKE: Record<VizMarkerTone, string> = {
  socket: "var(--viz-socket)",
  giftwrap: "var(--viz-giftwrap)",
  channel: "var(--viz-channel)",
  rpc: "var(--viz-muted)",
  evidence: "var(--viz-ok)",
  muted: "var(--viz-muted)",
}

export function vizArrowMarkerId(sceneId: string, tone: VizMarkerTone): string {
  return `${sceneId}-arrow-${tone}`
}

/** Hook form for consumers that need a `url(#...)` reference. */
export function useVizArrowMarkerUrl(tone: VizMarkerTone): string {
  const { sceneId } = useVizScene()
  return `url(#${vizArrowMarkerId(sceneId, tone)})`
}

export function VizMarkerDefs() {
  const { sceneId } = useVizScene()
  return (
    <defs>
      {VIZ_MARKER_TONES.map((tone) => (
        <marker
          key={tone}
          id={vizArrowMarkerId(sceneId, tone)}
          markerWidth="9"
          markerHeight="8"
          refX="6.5"
          refY="3"
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M0.5,0 L6.5,3 L0.5,6"
            fill="none"
            style={{ stroke: TONE_STROKE[tone] }}
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      ))}
    </defs>
  )
}
