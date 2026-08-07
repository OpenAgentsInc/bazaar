"use client"

// Evidence-rung meter — docs/network-visualization-spec.md §5.6. The six
// ordered rungs (pledged → reserved → measured → verified → paid → settled)
// as a stepped fill, with reservation proof-class strength (10–100) as a
// secondary bar. Only an admitted verifier raises a rung; a provider Status
// claim alone cannot.

import * as React from "react"

import { VizScene } from "@/components/viz/core"
import { cn } from "@/lib/utils"

export type EvidenceRung =
  | "pledged"
  | "reserved"
  | "measured"
  | "verified"
  | "paid"
  | "settled"

export const EVIDENCE_RUNGS: readonly EvidenceRung[] = [
  "pledged",
  "reserved",
  "measured",
  "verified",
  "paid",
  "settled",
]

export interface ImmortalEvidenceRungsProps {
  rung: EvidenceRung
  /** Reservation proof-class strength, 10–100 (e.g. utxo_control = 60). */
  proofStrength?: number
  proofClass?: string
  className?: string
}

const W = 360
const SEG_W = 52
const SEG_H = 16
const SEG_GAP = 4
const X0 = 12

export function ImmortalEvidenceRungs({
  rung,
  proofStrength,
  proofClass,
  className,
}: ImmortalEvidenceRungsProps) {
  const reached = EVIDENCE_RUNGS.indexOf(rung)
  const hasStrength = proofStrength !== undefined
  const height = hasStrength ? 96 : 62

  return (
    <VizScene
      width={W}
      height={height}
      label={`Evidence rung ${rung} (${reached + 1} of ${EVIDENCE_RUNGS.length})${
        hasStrength
          ? `; reservation proof ${proofClass ?? ""} strength ${proofStrength} of 100`
          : ""
      }`}
      className={cn(className)}
    >
      {EVIDENCE_RUNGS.map((name, index) => {
        const x = X0 + index * (SEG_W + SEG_GAP)
        const achieved = index <= reached
        return (
          <g key={name}>
            <rect
              x={x}
              y={14}
              width={SEG_W}
              height={SEG_H}
              rx={3}
              style={{
                fill: achieved ? "var(--viz-ok)" : "var(--viz-node-fill)",
                stroke: achieved ? "var(--viz-ok)" : "var(--viz-boundary)",
              }}
              fillOpacity={achieved ? 0.14 + index * 0.1 : 0.4}
              strokeWidth={1}
            />
            {/* Non-color redundancy: achieved rungs carry a filled tick. */}
            {achieved ? (
              <circle
                cx={x + 7}
                cy={14 + SEG_H / 2}
                r={2}
                style={{ fill: "var(--viz-ok)" }}
              />
            ) : null}
            <text
              x={x + SEG_W / 2}
              y={42}
              textAnchor="middle"
              className="font-mono"
              fontSize={7}
              style={{
                fill:
                  index === reached
                    ? "var(--viz-node-text)"
                    : "var(--viz-muted)",
              }}
            >
              {name}
            </text>
          </g>
        )
      })}
      {hasStrength ? (
        <g>
          <text
            x={X0}
            y={64}
            className="font-mono"
            fontSize={7}
            style={{ fill: "var(--viz-muted)" }}
          >
            reservation proof{proofClass ? ` · ${proofClass}` : ""}
          </text>
          <rect
            x={X0}
            y={70}
            width={SEG_W * 6 + SEG_GAP * 5}
            height={6}
            rx={3}
            style={{ fill: "var(--viz-node-fill)", stroke: "var(--viz-boundary)" }}
            strokeWidth={1}
          />
          <rect
            x={X0}
            y={70}
            width={
              ((SEG_W * 6 + SEG_GAP * 5) *
                Math.min(Math.max(proofStrength, 0), 100)) /
              100
            }
            height={6}
            rx={3}
            style={{ fill: "var(--viz-socket)" }}
            fillOpacity={0.8}
          />
          <text
            x={X0 + SEG_W * 6 + SEG_GAP * 5}
            y={64}
            textAnchor="end"
            className="font-mono"
            fontSize={7}
            style={{ fill: "var(--viz-node-text)" }}
          >
            {proofStrength}/100
          </text>
        </g>
      ) : null}
    </VizScene>
  )
}
