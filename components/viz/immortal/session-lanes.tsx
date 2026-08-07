"use client"

// Two-lane session sequence — docs/network-visualization-spec.md §5.3.
// The protocol has no global state: requester and provider each publish an
// independent Status stream (per-author seq, previous chain). Lanes are
// ordered by per-author seq — never by created_at. Gaps render as visible
// holes and forks render side-by-side at the same seq, matching relay
// semantics (mkt_swp_status_view returns missing and duplicated sequences).

import * as React from "react"

import { useVizArrowMarkerUrl, VizScene } from "@/components/viz/core"
import { cn } from "@/lib/utils"

import { EVIDENCE_RUNGS, type EvidenceRung } from "./evidence-rungs"

export type { EvidenceRung } from "./evidence-rungs"

const RUNGS = EVIDENCE_RUNGS

export type SessionAuthor = "requester" | "provider"

export interface SessionStatusRecord {
  seq: number
  /** MKT-SWP swp_state, e.g. "hold_invoice_ready". */
  swpState: string
  /**
   * Evidence rung backing the claim. A provider Status alone never rises
   * above "measured" — only admitted verification raises a rung.
   */
  rung?: EvidenceRung
  /** Causal gate: this record requires the counterparty record at `seq`. */
  requiresCounterpartySeq?: number
}

export interface ImmortalSessionLanesProps {
  provider: readonly SessionStatusRecord[]
  requester: readonly SessionStatusRecord[]
  className?: string
}

const LANE_X: Record<SessionAuthor, number> = {
  provider: 175,
  requester: 545,
}
const NODE_W = 190
const NODE_H = 32
const ROW_H = 50
const HEADER_Y = 56
const FORK_OFFSET = 14

function rungOpacity(rung: EvidenceRung | undefined): number {
  if (!rung) return 0.04
  return 0.06 + RUNGS.indexOf(rung) * 0.08
}

interface LaneSlot {
  seq: number
  records: SessionStatusRecord[]
}

/** One slot per integer seq up to the lane maximum; empty slots are gaps. */
function laneSlots(records: readonly SessionStatusRecord[]): LaneSlot[] {
  const maxSeq = records.reduce((m, r) => Math.max(m, r.seq), -1)
  const slots: LaneSlot[] = []
  for (let seq = 0; seq <= maxSeq; seq += 1) {
    slots.push({ seq, records: records.filter((r) => r.seq === seq) })
  }
  return slots
}

function slotY(seq: number): number {
  return HEADER_Y + 24 + seq * ROW_H
}

function RecordNode({
  author,
  record,
  forkIndex,
  forkCount,
}: {
  author: SessionAuthor
  record: SessionStatusRecord
  forkIndex: number
  forkCount: number
}) {
  const x = LANE_X[author]
  const y =
    slotY(record.seq) + (forkCount > 1 ? (forkIndex === 0 ? -FORK_OFFSET : FORK_OFFSET) : 0)
  const fork = forkCount > 1
  return (
    <g>
      <title>
        {`${author} seq ${record.seq}: ${record.swpState}` +
          (record.rung ? ` — evidence ${record.rung}` : " — claim only") +
          (fork ? " (fork retained)" : "")}
      </title>
      <rect
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={6}
        style={{
          fill: "var(--viz-ok)",
          stroke: fork ? "var(--viz-warn)" : "var(--viz-node)",
        }}
        fillOpacity={rungOpacity(record.rung)}
        strokeWidth={1}
        strokeDasharray={fork ? "4 2" : undefined}
      />
      <text
        x={x - NODE_W / 2 + 8}
        y={y - 2}
        className="font-mono"
        fontSize={9}
        style={{ fill: "var(--viz-node-text)" }}
      >
        {record.swpState}
      </text>
      <text
        x={x - NODE_W / 2 + 8}
        y={y + 10}
        className="font-mono"
        fontSize={7}
        style={{ fill: "var(--viz-muted)" }}
      >
        {record.rung ?? "claim only"}
        {fork ? ` · fork ${forkIndex + 1}/${forkCount}` : ""}
      </text>
      {/* Seq label on the outer side, clear of incoming gate arrowheads. */}
      <text
        x={author === "provider" ? x - NODE_W / 2 - 8 : x + NODE_W / 2 + 8}
        y={y + 3}
        textAnchor={author === "provider" ? "end" : "start"}
        className="font-mono"
        fontSize={8}
        style={{ fill: "var(--viz-muted)" }}
      >
        {record.seq}
      </text>
    </g>
  )
}

function GapSlot({ author, seq }: { author: SessionAuthor; seq: number }) {
  const x = LANE_X[author]
  const y = slotY(seq)
  return (
    <g>
      <title>{`${author} seq ${seq} missing (swp_status_gap)`}</title>
      <rect
        x={x - NODE_W / 2}
        y={y - NODE_H / 2}
        width={NODE_W}
        height={NODE_H}
        rx={6}
        fill="none"
        style={{ stroke: "var(--viz-warn)" }}
        strokeWidth={1}
        strokeDasharray="2 3"
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        className="font-mono"
        fontSize={8}
        style={{ fill: "var(--viz-warn)" }}
      >
        seq {seq} missing
      </text>
    </g>
  )
}

function GateArrow({
  fromAuthor,
  fromSeq,
  toAuthor,
  toSeq,
  highlighted,
}: {
  fromAuthor: SessionAuthor
  fromSeq: number
  toAuthor: SessionAuthor
  toSeq: number
  highlighted: boolean
}) {
  const markerUrl = useVizArrowMarkerUrl(highlighted ? "socket" : "muted")
  const x0 =
    LANE_X[fromAuthor] + (fromAuthor === "provider" ? NODE_W / 2 : -NODE_W / 2)
  const x1 =
    LANE_X[toAuthor] + (toAuthor === "provider" ? NODE_W / 2 + 6 : -NODE_W / 2 - 6)
  const y0 = slotY(fromSeq)
  const y1 = slotY(toSeq)
  const mx = (x0 + x1) / 2
  return (
    <g>
      <title>
        {`${toAuthor} seq ${toSeq} requires ${fromAuthor} seq ${fromSeq}`}
      </title>
      <path
        d={`M ${x0} ${y0} C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`}
        fill="none"
        style={{
          stroke: highlighted ? "var(--viz-socket)" : "var(--viz-muted)",
        }}
        strokeWidth={highlighted ? 1.5 : 1}
        strokeDasharray="5 3"
        markerEnd={markerUrl}
        opacity={highlighted ? 1 : 0.7}
      />
    </g>
  )
}

export function ImmortalSessionLanes({
  provider,
  requester,
  className,
}: ImmortalSessionLanesProps) {
  const providerSlots = laneSlots(provider)
  const requesterSlots = laneSlots(requester)
  const maxSeq = Math.max(providerSlots.length, requesterSlots.length) - 1
  const height = slotY(maxSeq) + ROW_H

  const gates = [
    ...requester
      .filter((r) => r.requiresCounterpartySeq !== undefined)
      .map((r) => ({
        fromAuthor: "provider" as const,
        fromSeq: r.requiresCounterpartySeq!,
        toAuthor: "requester" as const,
        toSeq: r.seq,
      })),
    ...provider
      .filter((r) => r.requiresCounterpartySeq !== undefined)
      .map((r) => ({
        fromAuthor: "requester" as const,
        fromSeq: r.requiresCounterpartySeq!,
        toAuthor: "provider" as const,
        toSeq: r.seq,
      })),
  ]

  const [highlightedGate, setHighlightedGate] = React.useState<number | null>(
    null
  )

  return (
    <div className={cn("space-y-2", className)}>
      <VizScene
        width={720}
        height={height}
        label="Session sequence: independent requester and provider Status streams with cross-participant causal gates"
      >
        {/* Lane headers and spines. */}
        {(["provider", "requester"] as const).map((author) => (
          <g key={author}>
            <text
              x={LANE_X[author]}
              y={HEADER_Y - 26}
              textAnchor="middle"
              className="font-mono uppercase"
              fontSize={8.5}
              letterSpacing={0.8}
              style={{ fill: "var(--viz-node-text)" }}
            >
              {author} status stream
            </text>
            <text
              x={LANE_X[author]}
              y={HEADER_Y - 13}
              textAnchor="middle"
              className="font-mono"
              fontSize={7.5}
              style={{ fill: "var(--viz-muted)" }}
            >
              kind 39607 · ordered by per-author seq, never created_at
            </text>
            <line
              x1={LANE_X[author]}
              y1={HEADER_Y}
              x2={LANE_X[author]}
              y2={height - 18}
              style={{ stroke: "var(--viz-boundary)" }}
              strokeWidth={1}
              strokeDasharray="1 4"
            />
          </g>
        ))}

        {gates.map((gate, index) => (
          <g
            key={`gate-${index}`}
            onPointerEnter={() => setHighlightedGate(index)}
            onPointerLeave={() =>
              setHighlightedGate((current) =>
                current === index ? null : current
              )
            }
          >
            <GateArrow {...gate} highlighted={highlightedGate === index} />
          </g>
        ))}

        {providerSlots.map((slot) =>
          slot.records.length === 0 ? (
            <GapSlot key={`p-${slot.seq}`} author="provider" seq={slot.seq} />
          ) : (
            slot.records.map((record, forkIndex) => (
              <RecordNode
                key={`p-${slot.seq}-${forkIndex}`}
                author="provider"
                record={record}
                forkIndex={forkIndex}
                forkCount={slot.records.length}
              />
            ))
          )
        )}
        {requesterSlots.map((slot) =>
          slot.records.length === 0 ? (
            <GapSlot key={`r-${slot.seq}`} author="requester" seq={slot.seq} />
          ) : (
            slot.records.map((record, forkIndex) => (
              <RecordNode
                key={`r-${slot.seq}-${forkIndex}`}
                author="requester"
                record={record}
                forkIndex={forkIndex}
                forkCount={slot.records.length}
              />
            ))
          )
        )}
      </VizScene>

      {/* Screen-reader mirror. */}
      <table className="sr-only">
        <caption>
          Requester and provider Status streams with causal gates
        </caption>
        <tbody>
          {(["provider", "requester"] as const).map((author) => {
            const slots = author === "provider" ? providerSlots : requesterSlots
            return slots.map((slot) => (
              <tr key={`${author}-${slot.seq}`}>
                <th scope="row">
                  {author} seq {slot.seq}
                </th>
                <td>
                  {slot.records.length === 0
                    ? "missing (gap)"
                    : slot.records
                        .map(
                          (r) =>
                            `${r.swpState} (${r.rung ?? "claim only"}${
                              r.requiresCounterpartySeq !== undefined
                                ? `, requires counterparty seq ${r.requiresCounterpartySeq}`
                                : ""
                            })`
                        )
                        .join(" / ")}
                </td>
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}
