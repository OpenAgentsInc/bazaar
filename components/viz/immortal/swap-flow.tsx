"use client"

// Swap-flow replay — docs/network-visualization-spec.md §5.2. The topology
// scene plus a stepped record timeline: gift-wrapped records travel their
// relay routes as chips. Every step renders as a static frame; playback is
// the only animated behavior and it degrades to stepping under reduced
// motion. Motion carries protocol meaning only — no ambient animation.

import * as React from "react"
import { Pause, Play, SkipBack, SkipForward } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  useReducedMotionPreference,
  usePulse,
  pointAlongRoute,
  VizChip,
  type VizChipTone,
} from "@/components/viz/core"
import { cn } from "@/lib/utils"

import {
  ImmortalNetworkTopologyScene,
  TOPOLOGY_ANCHORS,
  type TopologyNodeId,
} from "./network-topology"

interface ChipSpec {
  kind: number
  label: string
  tone: VizChipTone
  /** Waypoint node ids; the chip travels center to center. */
  route: readonly TopologyNodeId[]
}

export interface SwapFlowStep {
  id: string
  title: string
  caption: string
  chips: readonly ChipSpec[]
  focus: readonly TopologyNodeId[]
}

// The public no-spend demo lifecycle over the reference topology. Quotes
// race back from both providers; provider-b wins on the fixture policy
// (highest output, then lowest fee, then provider key).
export const SWAP_FLOW_STEPS: readonly SwapFlowStep[] = [
  {
    id: "offerings",
    title: "Offerings discovered",
    caption:
      "Providers publish signed Offerings (kind 39601, public heads). The requester discovers routes on both relays.",
    chips: [
      {
        kind: 39601,
        label: "Offering",
        tone: "neutral",
        route: ["providerA", "relayA", "requester"],
      },
      {
        kind: 39601,
        label: "Offering",
        tone: "neutral",
        route: ["providerB", "relayB", "requester"],
      },
    ],
    focus: ["requester", "relayA", "relayB", "providerA", "providerB"],
  },
  {
    id: "rfq",
    title: "Encrypted RFQ delivered",
    caption:
      "The requester gift-wraps one RFQ (kind 39604) per provider. Relays store and forward; they cannot read the terms.",
    chips: [
      {
        kind: 39604,
        label: "RFQ",
        tone: "active",
        route: ["requester", "relayA", "providerA"],
      },
      {
        kind: 39604,
        label: "RFQ",
        tone: "active",
        route: ["requester", "relayB", "providerB"],
      },
    ],
    focus: ["requester", "relayA", "relayB", "providerA", "providerB"],
  },
  {
    id: "quotes",
    title: "Signed quotes race back",
    caption:
      "Both providers answer with firm signed Quotes (kind 39605). Selection is client-side policy: highest output, then lowest fee, then provider key.",
    chips: [
      {
        kind: 39605,
        label: "Quote",
        tone: "active",
        route: ["providerA", "relayA", "requester"],
      },
      {
        kind: 39605,
        label: "Quote",
        tone: "active",
        route: ["providerB", "relayB", "requester"],
      },
    ],
    focus: ["requester", "relayA", "relayB", "providerA", "providerB"],
  },
  {
    id: "order",
    title: "Order selects provider-b",
    caption:
      "The Order (kind 39606) accepts provider-b's Quote without changing its terms. Provider-a's reservation is released.",
    chips: [
      {
        kind: 39606,
        label: "Order",
        tone: "active",
        route: ["requester", "relayB", "providerB"],
      },
    ],
    focus: ["requester", "relayB", "providerB"],
  },
  {
    id: "contracts",
    title: "Contracts commit the same scripts",
    caption:
      "Both parties sign Swap Contracts (kind 39610) binding identical rail scripts, amounts, and timelocks.",
    chips: [
      {
        kind: 39610,
        label: "Contract",
        tone: "ok",
        route: ["requester", "relayB", "providerB"],
      },
      {
        kind: 39610,
        label: "Contract",
        tone: "ok",
        route: ["providerB", "relayB", "requester"],
      },
    ],
    focus: ["requester", "relayB", "providerB"],
  },
  {
    id: "status",
    title: "Status stream",
    caption:
      "Provider-b publishes sequenced Status records (kind 39607). Claims are observations, not authority — the requester verifies against its own rail evidence.",
    chips: [
      {
        kind: 39607,
        label: "Status",
        tone: "warn",
        route: ["providerB", "relayB", "requester"],
      },
    ],
    focus: ["requester", "relayB", "providerB", "clnB", "bitcoindB"],
  },
  {
    id: "close",
    title: "Zero-loss close",
    caption:
      "The terminal Close (kind 39609) carries balanced loss accounting: reservation released, 0 sats moved.",
    chips: [
      {
        kind: 39609,
        label: "Close",
        tone: "ok",
        route: ["providerB", "relayB", "requester"],
      },
    ],
    focus: ["requester", "relayB", "providerB"],
  },
]

const STEP_DURATION_MS = 1700

function ChipLayer({
  step,
  playing,
  onArrived,
}: {
  step: SwapFlowStep
  playing: boolean
  onArrived: () => void
}) {
  const reduced = useReducedMotionPreference()
  const progress = usePulse({
    durationMs: STEP_DURATION_MS,
    playing,
    staticProgress: 1,
    onComplete: onArrived,
  })
  // Paused or reduced-motion → show the arrived frame for this step.
  const shown = playing && !reduced ? progress : 1
  return (
    <>
      {step.chips.map((chip, index) => {
        const points = chip.route.map((id) => ({
          x: TOPOLOGY_ANCHORS[id].x,
          y: TOPOLOGY_ANCHORS[id].y,
        }))
        const at = pointAlongRoute(points, shown)
        return (
          <VizChip
            key={`${step.id}-${index}`}
            x={at.x}
            // Stagger stacked chips so parallel records never fully overlap.
            y={at.y - 16 - index * 19}
            kind={chip.kind}
            label={chip.label}
            tone={chip.tone}
          />
        )
      })}
    </>
  )
}

export interface ImmortalSwapFlowProps {
  /** Starting step index (clamped). */
  initialStep?: number
  className?: string
}

export function ImmortalSwapFlow({
  initialStep = 0,
  className,
}: ImmortalSwapFlowProps) {
  const reduced = useReducedMotionPreference()
  const clampedInitial = Math.min(
    Math.max(initialStep, 0),
    SWAP_FLOW_STEPS.length - 1
  )
  const [stepIndex, setStepIndex] = React.useState(clampedInitial)
  const [playing, setPlaying] = React.useState(false)
  const step = SWAP_FLOW_STEPS[stepIndex]!
  const last = stepIndex === SWAP_FLOW_STEPS.length - 1

  const goTo = (index: number) => {
    setPlaying(false)
    setStepIndex(Math.min(Math.max(index, 0), SWAP_FLOW_STEPS.length - 1))
  }

  const onArrived = React.useCallback(() => {
    setStepIndex((current) => {
      if (current >= SWAP_FLOW_STEPS.length - 1) {
        setPlaying(false)
        return current
      }
      return current + 1
    })
  }, [])

  const onPlayPause = () => {
    if (playing) {
      setPlaying(false)
      return
    }
    if (reduced) {
      // Reduced motion: play degrades to stepping one frame forward.
      setStepIndex((current) =>
        Math.min(current + 1, SWAP_FLOW_STEPS.length - 1)
      )
      return
    }
    if (last) setStepIndex(0)
    setPlaying(true)
  }

  return (
    <div className={cn("space-y-3", className)}>
      <ImmortalNetworkTopologyScene focus={step.focus}>
        <ChipLayer
          key={stepIndex}
          step={step}
          playing={playing}
          onArrived={onArrived}
        />
      </ImmortalNetworkTopologyScene>

      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Previous step"
            disabled={stepIndex === 0}
            onClick={() => goTo(stepIndex - 1)}
          >
            <SkipBack aria-hidden="true" className="size-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label={playing ? "Pause replay" : "Play replay"}
            onClick={onPlayPause}
          >
            {playing ? (
              <Pause aria-hidden="true" className="size-3.5" />
            ) : (
              <Play aria-hidden="true" className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            aria-label="Next step"
            disabled={last}
            onClick={() => goTo(stepIndex + 1)}
          >
            <SkipForward aria-hidden="true" className="size-3.5" />
          </Button>
          <p className="ml-1 font-mono text-xs text-muted-foreground">
            {stepIndex + 1}/{SWAP_FLOW_STEPS.length}
          </p>
          <p className="ml-2 truncate text-sm font-medium">{step.title}</p>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{step.caption}</p>
        {/* Record-chain scrubber. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SWAP_FLOW_STEPS.map((candidate, index) => (
            <button
              key={candidate.id}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Go to step ${index + 1}: ${candidate.title}`}
              aria-current={index === stepIndex ? "step" : undefined}
              className="rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Badge
                variant={index === stepIndex ? "secondary" : "outline"}
                className="font-mono text-[0.625rem]"
              >
                {candidate.chips[0]!.kind} {candidate.chips[0]!.label}
              </Badge>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
