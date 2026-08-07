"use client"

// <VizProgressRail> — a compact drawn stage rail: the terminal-grade
// replacement for numbered-circle checklists. Completed span fills, the
// current stage carries a perimeter-even dashed ring, and error/closed
// states re-stroke in danger with a distinct dash (never color alone).

import * as React from "react"

import { cn } from "@/lib/utils"

import { evenDash } from "./geometry"
import { VizScene } from "./scene"

export interface VizProgressRailStage {
  id: string
  label: string
}

export interface VizProgressRailProps {
  stages: readonly VizProgressRailStage[]
  /** Current in-progress stage id (ring). */
  activeId?: string | null
  /**
   * Explicitly completed stage ids. When omitted, every stage before the
   * active one counts as complete.
   */
  completedIds?: readonly string[]
  /** Terminal failure/closure: the active stage strokes danger. */
  error?: boolean
  /** "all" labels every stage; "active" shows only the current label. */
  showLabels?: "all" | "active"
  label: string
  className?: string
}

const W = 360
const X0 = 18
const X1 = W - 18
const DOT_R = 4

export function VizProgressRail({
  stages,
  activeId = null,
  completedIds,
  error = false,
  showLabels = "all",
  label,
  className,
}: VizProgressRailProps) {
  const activeIndex = activeId
    ? stages.findIndex((stage) => stage.id === activeId)
    : -1
  const isComplete = (index: number): boolean => {
    if (completedIds) return completedIds.includes(stages[index]!.id)
    return activeIndex >= 0 && index < activeIndex
  }
  const lastComplete = stages.reduce(
    (last, _stage, index) => (isComplete(index) ? index : last),
    -1
  )
  const reached = Math.max(lastComplete, activeIndex)

  const railY = 14
  const height = showLabels === "all" ? 40 : 34
  const step = stages.length > 1 ? (X1 - X0) / (stages.length - 1) : 0
  const x = (index: number) => X0 + index * step

  const activeStage = activeIndex >= 0 ? stages[activeIndex] : null

  return (
    <VizScene
      width={W}
      height={height}
      label={label}
      className={cn(className)}
    >
      <line
        x1={X0}
        y1={railY}
        x2={X1}
        y2={railY}
        style={{ stroke: "var(--viz-boundary)" }}
        strokeWidth={1}
      />
      {reached > 0 ? (
        <line
          x1={X0}
          y1={railY}
          x2={x(reached)}
          y2={railY}
          style={{ stroke: error ? "var(--viz-danger)" : "var(--viz-socket)" }}
          strokeWidth={1.5}
          strokeDasharray={error ? "4 3" : undefined}
        />
      ) : null}
      {stages.map((stage, index) => {
        const complete = isComplete(index)
        const active = index === activeIndex
        const stroke =
          active && error
            ? "var(--viz-danger)"
            : complete || active
              ? "var(--viz-socket)"
              : "var(--viz-muted)"
        return (
          <g key={stage.id}>
            <title>
              {`${stage.label}: ${
                complete
                  ? "complete"
                  : active
                    ? error
                      ? "failed"
                      : "in progress"
                    : "pending"
              }`}
            </title>
            <circle
              cx={x(index)}
              cy={railY}
              r={DOT_R}
              style={{
                fill: complete ? stroke : "var(--viz-node-fill)",
                stroke,
              }}
              strokeWidth={1}
              strokeDasharray={active && error ? "2 2" : undefined}
            />
            {active ? (
              <circle
                cx={x(index)}
                cy={railY}
                r={DOT_R + 3.5}
                fill="none"
                style={{ stroke }}
                strokeWidth={1}
                strokeDasharray={evenDash(2 * Math.PI * (DOT_R + 3.5), 3, 3)}
              />
            ) : null}
            {showLabels === "all" ? (
              <text
                x={x(index)}
                y={railY + 18}
                textAnchor="middle"
                className="font-mono"
                fontSize={7}
                style={{
                  fill:
                    complete || active
                      ? "var(--viz-node-text)"
                      : "var(--viz-muted)",
                }}
              >
                {stage.label}
              </text>
            ) : null}
          </g>
        )
      })}
      {showLabels === "active" && activeStage ? (
        <text
          x={(X0 + X1) / 2}
          y={railY + 16}
          textAnchor="middle"
          className="font-mono"
          fontSize={7.5}
          style={{
            fill: error ? "var(--viz-danger)" : "var(--viz-node-text)",
          }}
        >
          {activeStage.label}
        </text>
      ) : null}
    </VizScene>
  )
}
