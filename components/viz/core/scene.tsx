"use client"

// <VizScene> — root of every visualization. Owns the fixed viewBox, the
// theme bridge (--viz-* role variables bound to design tokens), the
// reduced-motion context, and instance-scoped SVG defs ids.
// See docs/network-visualization-spec.md §4.2 and §6.

import * as React from "react"

import { cn } from "@/lib/utils"

import { VizMarkerDefs } from "./marker"

export interface VizSceneContextValue {
  sceneId: string
  reducedMotion: boolean
}

const VizSceneContext = React.createContext<VizSceneContextValue | null>(null)

export function useVizScene(): VizSceneContextValue {
  const context = React.useContext(VizSceneContext)
  if (context === null) {
    throw new Error("Viz primitives must render inside <VizScene>")
  }
  return context
}

// Two-level indirection (unit's _refresh_theme pattern): primitives consume
// --viz-<role>; the scene binds each role to an overridable --color-viz-<role>
// with the design-token default as fallback. Ancestors may re-skin any role
// by setting --color-viz-<role>; no hex lives in this layer.
const VIZ_ROLE_BINDINGS: Record<string, string> = {
  "--viz-node": "var(--color-viz-node, var(--border))",
  "--viz-node-fill": "var(--color-viz-node-fill, var(--card))",
  "--viz-node-text": "var(--color-viz-node-text, var(--foreground))",
  "--viz-muted": "var(--color-viz-muted, var(--muted-foreground))",
  "--viz-socket": "var(--color-viz-socket, var(--primary))",
  "--viz-giftwrap": "var(--color-viz-giftwrap, var(--chart-3))",
  "--viz-channel": "var(--color-viz-channel, var(--asset-lightning))",
  "--viz-bitcoin": "var(--color-viz-bitcoin, var(--asset-bitcoin))",
  "--viz-liquid": "var(--color-viz-liquid, var(--asset-liquid))",
  "--viz-ok": "var(--color-viz-ok, var(--oa-color-attention-done))",
  "--viz-warn": "var(--color-viz-warn, var(--oa-color-syntax-number))",
  "--viz-danger": "var(--color-viz-danger, var(--destructive))",
  "--viz-boundary": "var(--color-viz-boundary, var(--border))",
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY)
  query.addEventListener("change", onChange)
  return () => query.removeEventListener("change", onChange)
}

function useReducedMotion(): boolean {
  return React.useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false
  )
}

export interface VizSceneProps {
  /** Authored coordinate space; the scene scales responsively inside it. */
  width: number
  height: number
  /** Text alternative for the whole scene. */
  label: string
  /**
   * "img" for static scenes (single accessible name); "group" when children
   * are individually focusable.
   */
  role?: "img" | "group"
  className?: string
  children: React.ReactNode
}

export function VizScene({
  width,
  height,
  label,
  role = "img",
  className,
  children,
}: VizSceneProps) {
  const reactId = React.useId()
  const sceneId = React.useMemo(
    () => `viz-${reactId.replace(/[^a-zA-Z0-9]/g, "")}`,
    [reactId]
  )
  const reducedMotion = useReducedMotion()
  const context = React.useMemo(
    () => ({ sceneId, reducedMotion }),
    [sceneId, reducedMotion]
  )

  return (
    <VizSceneContext.Provider value={context}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role={role}
        aria-label={label}
        className={cn("block h-auto w-full select-none", className)}
        style={VIZ_ROLE_BINDINGS as React.CSSProperties}
      >
        <VizMarkerDefs />
        {children}
      </svg>
    </VizSceneContext.Provider>
  )
}
