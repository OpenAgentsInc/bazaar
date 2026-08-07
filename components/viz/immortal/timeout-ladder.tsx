"use client"

// Timeout ladder — docs/network-visualization-spec.md §5.5. Swap safety is a
// height inequality: H_fund + finality ≤ H_claim, and H_claim + broadcast +
// reorg margins < H_refund. This instrument draws the block-height axis with
// the current height, each boundary, and the safety margins as bracketed
// intervals — the "verify before fund" gauge. Reverse swaps add the hold
// invoice expiry on a second (Lightning CLTV) height domain.

import * as React from "react"

import { VizScene } from "@/components/viz/core"
import { cn } from "@/lib/utils"

export interface TimeoutLadderMarks {
  currentHeight: number
  hFund: number
  hClaim: number
  hRefund: number
}

export interface ImmortalTimeoutLadderProps extends TimeoutLadderMarks {
  /** Optional second domain: Lightning CLTV hold-invoice expiry. */
  holdExpiry?: { currentHeight: number; expiryHeight: number }
  className?: string
}

const W = 720
const X0 = 56
const X1 = W - 32
const AXIS_SPAN = X1 - X0

function AxisMark({
  x,
  y,
  label,
  value,
  tone,
}: {
  x: number
  y: number
  label: string
  value: number
  tone: "ok" | "warn" | "danger" | "muted"
}) {
  const stroke =
    tone === "ok"
      ? "var(--viz-ok)"
      : tone === "warn"
        ? "var(--viz-warn)"
        : tone === "danger"
          ? "var(--viz-danger)"
          : "var(--viz-muted)"
  return (
    <g>
      <line
        x1={x}
        y1={y - 12}
        x2={x}
        y2={y + 6}
        style={{ stroke }}
        strokeWidth={1.25}
      />
      <text
        x={x}
        y={y - 18}
        textAnchor="middle"
        className="font-mono"
        fontSize={8}
        style={{ fill: "var(--viz-node-text)" }}
      >
        {label}
      </text>
      <text
        x={x}
        y={y + 18}
        textAnchor="middle"
        className="font-mono"
        fontSize={7.5}
        style={{ fill: "var(--viz-muted)" }}
      >
        {value.toLocaleString("en-US")}
      </text>
    </g>
  )
}

function Bracket({
  xa,
  xb,
  y,
  label,
}: {
  xa: number
  xb: number
  y: number
  label: string
}) {
  return (
    <g>
      <path
        d={`M ${xa} ${y} v 5 H ${xb} v -5`}
        fill="none"
        style={{ stroke: "var(--viz-muted)" }}
        strokeWidth={0.75}
      />
      <text
        x={(xa + xb) / 2}
        y={y + 15}
        textAnchor="middle"
        className="font-mono"
        fontSize={7}
        style={{ fill: "var(--viz-muted)" }}
      >
        {label}
      </text>
    </g>
  )
}

export function ImmortalTimeoutLadder({
  currentHeight,
  hFund,
  hClaim,
  hRefund,
  holdExpiry,
  className,
}: ImmortalTimeoutLadderProps) {
  const height = holdExpiry ? 190 : 118
  const axisY = 56

  const min = Math.min(currentHeight, hFund) - 2
  const max = hRefund + 3
  const scale = (h: number) => X0 + ((h - min) / (max - min)) * AXIS_SPAN

  const safe = currentHeight < hFund

  return (
    <VizScene
      width={W}
      height={height}
      label={`Timeout ladder: current height ${currentHeight}, funding boundary ${hFund}, claim boundary ${hClaim}, refund boundary ${hRefund}${
        holdExpiry
          ? `; hold invoice expires at Lightning height ${holdExpiry.expiryHeight}`
          : ""
      }. Funding is ${safe ? "still" : "no longer"} inside the safe window.`}
      className={cn(className)}
    >
      {/* Chain-height axis. */}
      <text
        x={X0 - 44}
        y={axisY + 3}
        className="font-mono uppercase"
        fontSize={7}
        letterSpacing={0.6}
        style={{ fill: "var(--viz-muted)" }}
      >
        chain
      </text>
      <line
        x1={X0}
        y1={axisY}
        x2={X1}
        y2={axisY}
        style={{ stroke: "var(--viz-boundary)" }}
        strokeWidth={1}
      />
      {/* Safe funding window fill. */}
      <rect
        x={scale(min)}
        y={axisY - 3}
        width={Math.max(scale(hFund) - scale(min), 0)}
        height={6}
        style={{ fill: "var(--viz-ok)" }}
        fillOpacity={0.18}
      />
      <AxisMark x={scale(hFund)} y={axisY} label="H_fund" value={hFund} tone="ok" />
      <AxisMark x={scale(hClaim)} y={axisY} label="H_claim" value={hClaim} tone="warn" />
      <AxisMark
        x={scale(hRefund)}
        y={axisY}
        label="H_refund"
        value={hRefund}
        tone="danger"
      />
      {/* Current height cursor. */}
      <g>
        <title>{`current height ${currentHeight}`}</title>
        <path
          d={`M ${scale(currentHeight)} ${axisY - 9} l 4 -7 h -8 z`}
          style={{ fill: "var(--viz-socket)" }}
        />
        <text
          x={scale(currentHeight)}
          y={axisY - 20}
          textAnchor="middle"
          className="font-mono"
          fontSize={7.5}
          style={{ fill: "var(--viz-socket)" }}
        >
          now {currentHeight.toLocaleString("en-US")}
        </text>
      </g>
      <Bracket
        xa={scale(hFund)}
        xb={scale(hClaim)}
        y={axisY + 24}
        label="chain finality"
      />
      <Bracket
        xa={scale(hClaim)}
        xb={scale(hRefund)}
        y={axisY + 24}
        label="broadcast + reorg safety"
      />

      {holdExpiry ? (
        <g>
          {/* Lightning CLTV domain — separate axis, separate clock. */}
          <text
            x={X0 - 44}
            y={axisY + 76}
            className="font-mono uppercase"
            fontSize={7}
            letterSpacing={0.6}
            style={{ fill: "var(--viz-muted)" }}
          >
            cltv
          </text>
          <line
            x1={X0}
            y1={axisY + 73}
            x2={X1}
            y2={axisY + 73}
            style={{ stroke: "var(--viz-boundary)" }}
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          {(() => {
            // Separate domain, separate scale: CLTV heights never share the
            // chain axis parameterization.
            const min2 = holdExpiry.currentHeight - 2
            const max2 = holdExpiry.expiryHeight + 3
            const scale2 = (h: number) =>
              X0 + ((h - min2) / (max2 - min2)) * AXIS_SPAN
            return (
              <>
                <AxisMark
                  x={scale2(holdExpiry.currentHeight)}
                  y={axisY + 73}
                  label="now"
                  value={holdExpiry.currentHeight}
                  tone="muted"
                />
                <AxisMark
                  x={scale2(holdExpiry.expiryHeight)}
                  y={axisY + 73}
                  label="hold expiry"
                  value={holdExpiry.expiryHeight}
                  tone="danger"
                />
              </>
            )
          })()}
        </g>
      ) : null}
    </VizScene>
  )
}
