"use client"

// Swap state rail — docs/network-visualization-spec.md §5.4. The MKT-SWP
// state machine as a horizontal rail: happy path as the spine, the 0-conf
// bypass as an arc over it, and the refund/recovery ladder as a muted,
// always-drawn branch — "your money always has an exit" is structural, not
// a tooltip.

import * as React from "react"

import { evenDash, VizScene } from "@/components/viz/core"
import { cn } from "@/lib/utils"

export interface StateRailSpec {
  swapType: "submarine" | "reverse"
  spine: readonly string[]
  bypass?: {
    fromIndex: number
    toIndex: number
    via: string
    label: string
  }
  recovery: {
    /** Spine index the recovery branch forks from. */
    fromIndex: number
    states: readonly string[]
    label: string
  }
}

export const SUBMARINE_RAIL: StateRailSpec = {
  swapType: "submarine",
  spine: [
    "ordered",
    "accepted",
    "contract_bound",
    "lock_terms_ready",
    "verification_passed",
    "funding_required",
    "funding_broadcast",
    "funding_observed",
    "funding_final",
    "ln_payment_pending",
    "lightning_paid",
    "provider_claimed",
    "completed",
  ],
  bypass: {
    fromIndex: 7,
    toIndex: 9,
    via: "zero_conf_accepted",
    label: "0-conf bypass",
  },
  recovery: {
    fromIndex: 8,
    states: ["refund_prepared", "refund_pending", "refunded"],
    label: "refund ladder — always available once funded",
  },
}

export const REVERSE_RAIL: StateRailSpec = {
  swapType: "reverse",
  spine: [
    "ordered",
    "accepted",
    "contract_bound",
    "hold_invoice_ready",
    "invoice_verified",
    "ln_payment_pending",
    "ln_htlcs_held",
    "lock_terms_ready",
    "funding_broadcast",
    "funding_final",
    "requester_claimed",
    "lightning_paid",
    "completed",
  ],
  recovery: {
    fromIndex: 9,
    states: ["provider_refund_pending", "invoice_cancelled", "refunded"],
    label: "provider refund + invoice cancel — before requester claim",
  },
}

export interface ImmortalStateRailProps {
  rail: StateRailSpec
  /** Current state name (spine, bypass via, or recovery state). */
  currentState?: string
  className?: string
}

const W = 760
const SPINE_Y = 46
const RECOVERY_Y = 108
const X0 = 26
const X1 = W - 26
const DOT_R = 4.5

export function ImmortalStateRail({
  rail,
  currentState,
  className,
}: ImmortalStateRailProps) {
  const step = (X1 - X0) / (rail.spine.length - 1)
  const x = (index: number) => X0 + index * step

  const spineIndex = currentState ? rail.spine.indexOf(currentState) : -1
  const recoveryIndex = currentState
    ? rail.recovery.states.indexOf(currentState)
    : -1
  const onBypass = currentState === rail.bypass?.via
  const inRecovery = recoveryIndex >= 0

  const reachedSpine = inRecovery
    ? rail.recovery.fromIndex
    : onBypass && rail.bypass
      ? rail.bypass.fromIndex
      : spineIndex

  // Spread recovery states evenly between the fork point and the rail end.
  const recoveryStart = x(rail.recovery.fromIndex) + 60
  const recoveryX = (index: number) =>
    recoveryStart +
    ((index + 1) * (X1 - recoveryStart)) / rail.recovery.states.length

  return (
    <VizScene
      width={W}
      height={150}
      label={`${rail.swapType} swap state rail${
        currentState ? `, current state ${currentState}` : ""
      }; recovery branch: ${rail.recovery.label}`}
      className={cn(className)}
    >
      {/* Spine. */}
      <line
        x1={X0}
        y1={SPINE_Y}
        x2={X1}
        y2={SPINE_Y}
        style={{ stroke: "var(--viz-boundary)" }}
        strokeWidth={1}
      />
      {reachedSpine > 0 ? (
        <line
          x1={X0}
          y1={SPINE_Y}
          x2={x(reachedSpine)}
          y2={SPINE_Y}
          style={{ stroke: "var(--viz-socket)" }}
          strokeWidth={1.5}
        />
      ) : null}

      {rail.spine.map((name, index) => {
        const reached = reachedSpine >= 0 && index <= reachedSpine
        const current = !inRecovery && !onBypass && index === spineIndex
        const cx = x(index)
        return (
          <g key={name}>
            <title>{`${name}${current ? " (current)" : ""}`}</title>
            <circle
              cx={cx}
              cy={SPINE_Y}
              r={DOT_R}
              style={{
                fill: reached ? "var(--viz-socket)" : "var(--viz-node-fill)",
                stroke: reached ? "var(--viz-socket)" : "var(--viz-muted)",
              }}
              strokeWidth={1}
            />
            {current ? (
              <circle
                cx={cx}
                cy={SPINE_Y}
                r={DOT_R + 4}
                fill="none"
                style={{ stroke: "var(--viz-socket)" }}
                strokeWidth={1}
                strokeDasharray={evenDash(2 * Math.PI * (DOT_R + 4), 3, 3)}
              />
            ) : null}
            <text
              transform={`translate(${cx + 2} ${SPINE_Y - 12}) rotate(-38)`}
              className="font-mono"
              fontSize={7}
              style={{
                fill: current
                  ? "var(--viz-node-text)"
                  : reached
                    ? "var(--viz-node-text)"
                    : "var(--viz-muted)",
              }}
            >
              {name}
            </text>
          </g>
        )
      })}

      {/* 0-conf bypass arc over the spine. */}
      {rail.bypass ? (
        <g>
          <title>{`${rail.bypass.label}: ${rail.spine[rail.bypass.fromIndex]} → ${rail.bypass.via} → ${rail.spine[rail.bypass.toIndex]}`}</title>
          <path
            d={`M ${x(rail.bypass.fromIndex)} ${SPINE_Y + 6} C ${x(
              rail.bypass.fromIndex
            )} ${SPINE_Y + 30}, ${x(rail.bypass.toIndex)} ${SPINE_Y + 30}, ${x(
              rail.bypass.toIndex
            )} ${SPINE_Y + 6}`}
            fill="none"
            style={{
              stroke: onBypass ? "var(--viz-warn)" : "var(--viz-muted)",
            }}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <circle
            cx={(x(rail.bypass.fromIndex) + x(rail.bypass.toIndex)) / 2}
            cy={SPINE_Y + 24}
            r={3.5}
            style={{
              fill: onBypass ? "var(--viz-warn)" : "var(--viz-node-fill)",
              stroke: onBypass ? "var(--viz-warn)" : "var(--viz-muted)",
            }}
            strokeWidth={1}
          />
          <text
            x={(x(rail.bypass.fromIndex) + x(rail.bypass.toIndex)) / 2}
            y={SPINE_Y + 38}
            textAnchor="middle"
            className="font-mono"
            fontSize={6.5}
            style={{
              fill: onBypass ? "var(--viz-warn)" : "var(--viz-muted)",
            }}
          >
            {rail.bypass.label} · {rail.bypass.via}
          </text>
        </g>
      ) : null}

      {/* Recovery ladder — always drawn. */}
      <g>
        <title>{rail.recovery.label}</title>
        <path
          d={`M ${x(rail.recovery.fromIndex)} ${SPINE_Y + 6} C ${x(
            rail.recovery.fromIndex
          )} ${RECOVERY_Y}, ${x(rail.recovery.fromIndex) + 40} ${RECOVERY_Y}, ${
            x(rail.recovery.fromIndex) + 60
          } ${RECOVERY_Y}`}
          fill="none"
          style={{
            stroke: inRecovery ? "var(--viz-warn)" : "var(--viz-muted)",
          }}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={inRecovery ? 1 : 0.7}
        />
        <line
          x1={recoveryStart}
          y1={RECOVERY_Y}
          x2={recoveryX(rail.recovery.states.length - 1)}
          y2={RECOVERY_Y}
          style={{
            stroke: inRecovery ? "var(--viz-warn)" : "var(--viz-muted)",
          }}
          strokeWidth={1}
          strokeDasharray="4 3"
          opacity={inRecovery ? 1 : 0.7}
        />
        {rail.recovery.states.map((name, index) => {
          const cx = recoveryX(index)
          const current = inRecovery && index === recoveryIndex
          const reached = inRecovery && index <= recoveryIndex
          return (
            <g key={name}>
              <title>{`${name}${current ? " (current)" : ""}`}</title>
              <circle
                cx={cx}
                cy={RECOVERY_Y}
                r={3.5}
                style={{
                  fill: reached ? "var(--viz-warn)" : "var(--viz-node-fill)",
                  stroke: reached ? "var(--viz-warn)" : "var(--viz-muted)",
                }}
                strokeWidth={1}
              />
              {current ? (
                <circle
                  cx={cx}
                  cy={RECOVERY_Y}
                  r={7.5}
                  fill="none"
                  style={{ stroke: "var(--viz-warn)" }}
                  strokeWidth={1}
                  strokeDasharray={evenDash(2 * Math.PI * 7.5, 3, 3)}
                />
              ) : null}
              {/* Alternate label sides so adjacent names never collide. */}
              <text
                x={cx}
                y={index % 2 === 0 ? RECOVERY_Y + 14 : RECOVERY_Y - 10}
                textAnchor="middle"
                className="font-mono"
                fontSize={6.5}
                style={{
                  fill: reached ? "var(--viz-node-text)" : "var(--viz-muted)",
                }}
              >
                {name}
              </text>
            </g>
          )
        })}
        <text
          x={X1}
          y={RECOVERY_Y + 30}
          textAnchor="end"
          className="font-mono"
          fontSize={6.5}
          style={{ fill: "var(--viz-muted)" }}
        >
          {rail.recovery.label}
        </text>
      </g>
    </VizScene>
  )
}
