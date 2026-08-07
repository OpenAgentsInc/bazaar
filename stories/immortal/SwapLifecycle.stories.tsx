import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { ArrowLeft, ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
import { useState } from "react"
import { expect, userEvent, within } from "storybook/test"

import {
  AmountField,
  FundedSwapContent,
  LifecyclePanel,
  QuoteSummary,
} from "@/components/swap-page"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import type { FundedRuntimeState } from "@/hooks/use-funded-regtest"
import type {
  FundedEffectReceipt,
  FundedJourney,
  FundedSessionManifest,
} from "@/lib/immortal/funded-session"
import {
  DEMO_LIFECYCLE_STAGES,
  type DemoLifecycleStage,
  type DemoLifecycleState,
} from "@/lib/immortal/lifecycle"
import type { QuoteState } from "@/lib/immortal/market"

import {
  ASSETS,
  FUNDED_SESSION,
  LIGHTNING_TO_BITCOIN,
  READY_FUNDED_RUNTIME,
  READY_QUOTES,
} from "../swap/fixtures"

const SESSION_ID = "demo-session-9f31"
const ignoreAssetChange = () => undefined

const requestingQuotes: QuoteState = {
  state: "requesting",
  logicalRequestId: "request-250000",
  requestKey: "ln-btc-250000",
  requestedProviderCount: 2,
  quotes: [],
  detail: "Encrypted RFQs sent to both eligible providers.",
}

const quotedPhases = [
  {
    id: "requesting_quotes",
    label: "Requesting signed Quotes",
    detail: "Encrypted RFQs are sent directly to both eligible providers.",
  },
  {
    id: "quote_selected",
    label: "Best Quote selected",
    detail:
      "Two signed Quotes verified. Provider B wins on exact output and total fee.",
  },
] as const

type QuotedPhase = (typeof quotedPhases)[number]["id"]
type LifecyclePhase = QuotedPhase | DemoLifecycleStage | "complete"

const journeyPhases: readonly LifecyclePhase[] = [
  ...quotedPhases.map((phase) => phase.id),
  ...DEMO_LIFECYCLE_STAGES.map((stage) => stage.id),
  "complete",
]

function Frame({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className={wide ? "mx-auto max-w-6xl" : "mx-auto max-w-[31rem]"}>
        {children}
      </div>
    </div>
  )
}

function NoSpendSwapScreen({ phase }: { phase: LifecyclePhase }) {
  const phaseIndex = journeyPhases.indexOf(phase)
  const quoted = phase === "requesting_quotes" || phase === "quote_selected"
  const complete = phase === "complete"
  const lifecycle = quoted ? null : lifecycleAt(phase)
  const quotes = phase === "requesting_quotes" ? requestingQuotes : READY_QUOTES
  const status = phaseStatus(phase)

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border bg-card py-0 shadow-none">
      <CardHeader className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 sm:px-[1.375rem]">
        <Badge variant="outline" className="w-fit font-mono text-[0.625rem]">
          DEMO · NO-SPEND
        </Badge>
        <CardTitle className="text-center text-[1.375rem] font-extrabold tracking-tight">
          {complete ? "Swap complete" : "Create Swap"}
        </CardTitle>
        <span className="justify-self-end font-mono text-[0.625rem] text-muted-foreground">
          {phaseIndex + 1}/{journeyPhases.length}
        </span>
      </CardHeader>
      <Progress
        value={((phaseIndex + 1) / journeyPhases.length) * 100}
        className="h-0.5 rounded-none"
      />
      <CardContent className="px-4 pb-[1.375rem] sm:px-[1.375rem]">
        <div className="relative space-y-3">
          <AmountField
            side="Send"
            amount="250000"
            ticker="LN"
            options={ASSETS}
            onAssetChange={ignoreAssetChange}
            hint="250,000 sats · signed input"
            readOnly
          />
          <AmountField
            side="Receive"
            amount="245000"
            ticker="BTC"
            options={ASSETS}
            onAssetChange={ignoreAssetChange}
            hint="Exact signed output"
            readOnly
          />
        </div>

        {lifecycle ? (
          <LifecyclePanel lifecycle={lifecycle} />
        ) : (
          <QuoteSummary quotes={quotes} direction={LIGHTNING_TO_BITCOIN} />
        )}

        <div
          role="status"
          aria-live="polite"
          className="mt-3 min-h-12 text-center"
        >
          <p className="text-sm font-medium">{status.label}</p>
          <p className="mt-1 text-xs text-muted-foreground">{status.detail}</p>
        </div>

        <Separator className="my-4 bg-foreground/10" />
        <Input
          value="bcrt1qstorybookdestination"
          readOnly
          aria-label="Bitcoin destination"
          className="h-[2.625rem] rounded-xl border-border bg-secondary text-center text-sm"
        />
        <Separator className="my-4 bg-foreground/10" />

        {complete ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3">
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-emerald-500"
              />
              <div>
                <p className="text-sm font-semibold">
                  Verified zero-loss Close
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reservation released · 0 sats moved · signed session retained
                  for audit.
                </p>
              </div>
            </div>
            <Button className="h-[2.625rem] w-full rounded-xl">
              Run another demo
            </Button>
          </div>
        ) : (
          <Button className="h-[2.625rem] w-full rounded-xl" disabled>
            {quoted ? "Create Swap" : "Swap in progress…"}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

function NoSpendLifecyclePlayer() {
  const [index, setIndex] = useState(0)
  const last = index === journeyPhases.length - 1

  return (
    <div className="space-y-3">
      <NoSpendSwapScreen phase={journeyPhases[index]} />
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          <ArrowLeft aria-hidden="true" />
          Previous status
        </Button>
        <Button
          type="button"
          onClick={() => setIndex((current) => (last ? 0 : current + 1))}
        >
          {last ? <RotateCcw aria-hidden="true" /> : null}
          {last ? "Restart journey" : "Advance status"}
          {!last ? <ArrowRight aria-hidden="true" /> : null}
        </Button>
      </div>
    </div>
  )
}

function FundedSwapScreen({ runtime }: { runtime: FundedRuntimeState }) {
  const stateLabel = {
    inactive: "Inactive",
    unavailable: "Unavailable",
    connecting: "Connecting",
    ready: "Review effect",
    authorizing: "Authorizing",
    watching: "Watching rails",
    complete: "Complete",
    error: "Stopped",
  }[runtime.state]

  return (
    <Card className="gap-0 overflow-hidden rounded-2xl border-border bg-card py-0 shadow-none">
      <CardHeader className="grid grid-cols-[1fr_auto_1fr] items-center px-4 py-4 sm:px-[1.375rem]">
        <Badge variant="outline" className="w-fit font-mono text-[0.625rem]">
          REGTEST · FUNDED
        </Badge>
        <CardTitle className="text-center text-[1.375rem] font-extrabold tracking-tight">
          {runtime.state === "complete" ? "Swap complete" : "Create Swap"}
        </CardTitle>
        <Badge
          variant={runtime.state === "complete" ? "secondary" : "outline"}
          className="justify-self-end"
        >
          {stateLabel}
        </Badge>
      </CardHeader>
      <CardContent className="px-4 pb-[1.375rem] sm:px-[1.375rem]">
        <FundedSwapContent runtime={runtime} onAuthorize={() => undefined} />
      </CardContent>
    </Card>
  )
}

function FundedLifecyclePlayer() {
  const [index, setIndex] = useState(0)
  const states = fundedRuntimeStates
  const last = index === states.length - 1
  return (
    <div className="space-y-3">
      <FundedSwapScreen runtime={states[index]} />
      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
          disabled={index === 0}
        >
          <ArrowLeft aria-hidden="true" />
          Previous status
        </Button>
        <Button
          type="button"
          onClick={() => setIndex((current) => (last ? 0 : current + 1))}
        >
          {last ? <RotateCcw aria-hidden="true" /> : null}
          {last ? "Restart journey" : "Advance status"}
          {!last ? <ArrowRight aria-hidden="true" /> : null}
        </Button>
      </div>
    </div>
  )
}

function lifecycleAt(
  phase: Exclude<LifecyclePhase, QuotedPhase>
): Exclude<DemoLifecycleState, { readonly state: "idle" }> {
  if (phase === "complete") {
    return {
      state: "complete",
      sessionId: SESSION_ID,
      providerRole: "provider-b",
      completedStages: DEMO_LIFECYCLE_STAGES.map((stage) => stage.id),
      detail: "Demo complete — reservation released, 0 sats moved.",
    }
  }
  const activeIndex = DEMO_LIFECYCLE_STAGES.findIndex(
    (stage) => stage.id === phase
  )
  return {
    state: "running",
    sessionId: SESSION_ID,
    providerRole: "provider-b",
    activeStage: phase,
    completedStages: DEMO_LIFECYCLE_STAGES.slice(0, activeIndex).map(
      (stage) => stage.id
    ),
    detail: phaseStatus(phase).detail,
  }
}

function phaseStatus(phase: LifecyclePhase): { label: string; detail: string } {
  if (phase === "complete") {
    return {
      label: "Swap complete",
      detail:
        "The requester verified the canonical Close and retained the exact signed record chain.",
    }
  }
  const quote = quotedPhases.find((item) => item.id === phase)
  if (quote) return quote
  const lifecycle = DEMO_LIFECYCLE_STAGES.find((item) => item.id === phase)
  return {
    label: lifecycle?.label ?? "Immortal session",
    detail: lifecycleDetail[phase as DemoLifecycleStage],
  }
}

const lifecycleDetail: Record<DemoLifecycleStage, string> = {
  providers_discovered:
    "Two live provider Offerings satisfy the selected Lightning-to-Bitcoin route.",
  encrypted_rfq_delivered:
    "The exact signed RFQ reached each provider through recipient-gated NIP-59 delivery.",
  signed_quote_selected:
    "Provider B's firm Quote won the deterministic output-and-fee policy.",
  reservation_recorded:
    "The selected provider's signed soft-capacity proof is retained with the session.",
  contracts_signed:
    "Requester and provider contracts commit the same amounts, scripts, and recovery terms.",
  verification_passed:
    "The Immortal engine found no ancestry gap, fork, invalid claim, or changed binding.",
  cancellation_effective:
    "Both parties accepted cancellation; the provider reservation is now released.",
  zero_loss_close_verified:
    "The canonical Close proves no external spend effect and complete loss accounting.",
}

const baseJourney = FUNDED_SESSION.journeys.submarine as FundedJourney
const receipt: FundedEffectReceipt = {
  schema: "openagents.immortal.browser-demo-effect-receipt.v1",
  request: baseJourney.pendingEffect!,
  externalIdentifier: "a".repeat(64),
  resultDigest: "b".repeat(64),
  state: "admitted",
  admittedAt: 2_000_000_100,
}

const admittedJourney: FundedJourney = {
  ...baseJourney,
  providerStatusClaim: { state: "transaction_mempool", verified: false },
  requesterVerification: {
    state: "effect_admitted",
    engine: "immortal-client",
    independentRailEvidence: [],
  },
  pendingEffect: null,
  effectReceipt: receipt,
}

const completedJourney: FundedJourney = {
  ...admittedJourney,
  providerStatusClaim: { state: "swap_completed", verified: false },
  requesterVerification: {
    state: "terminal_rail_evidence_verified",
    engine: "immortal-client",
    independentRailEvidence: [
      {
        rail: "bitcoin",
        lockupTxid: "c".repeat(64),
        claimTxid: "d".repeat(64),
      },
      { rail: "lightning", paymentHash: "e".repeat(64), state: "paid" },
    ],
  },
  presentation: { settledAllowed: true },
}

function withJourney(journey: FundedJourney): FundedSessionManifest {
  return {
    ...FUNDED_SESSION,
    journeys: { ...FUNDED_SESSION.journeys, submarine: journey },
  }
}

const fundedRuntimeStates: readonly FundedRuntimeState[] = [
  READY_FUNDED_RUNTIME,
  {
    state: "authorizing",
    detail: "Authorizing this exact engine-issued regtest effect…",
    session: FUNDED_SESSION,
  },
  {
    state: "watching",
    detail: "Effect admitted. Waiting for both local rail proofs…",
    session: withJourney(admittedJourney),
    receipt,
  },
  {
    state: "complete",
    detail: "Swap complete. Bitcoin and Lightning evidence verified locally.",
    session: withJourney(completedJourney),
  },
]

const meta = {
  title: "Immortal/Complete Swap Lifecycle",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const InteractiveNoSpendJourney: Story = {
  render: () => (
    <Frame>
      <NoSpendLifecyclePlayer />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Requesting signed Quotes")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Advance status" })
    )
    await expect(canvas.getByText("Best Quote selected")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Advance status" })
    )
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Providers discovered"
    )
  },
}

export const QuoteSelection: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="quote_selected" />
    </Frame>
  ),
}

export const ProvidersDiscovered: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="providers_discovered" />
    </Frame>
  ),
}
export const EncryptedRfqDelivered: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="encrypted_rfq_delivered" />
    </Frame>
  ),
}
export const SignedQuoteSelected: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="signed_quote_selected" />
    </Frame>
  ),
}
export const ReservationRecorded: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="reservation_recorded" />
    </Frame>
  ),
}
export const ContractsSigned: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="contracts_signed" />
    </Frame>
  ),
}
export const VerificationPassed: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="verification_passed" />
    </Frame>
  ),
}
export const CancellationEffective: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="cancellation_effective" />
    </Frame>
  ),
}
export const ZeroLossCloseVerified: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="zero_loss_close_verified" />
    </Frame>
  ),
}
export const NoSpendComplete: Story = {
  render: () => (
    <Frame>
      <NoSpendSwapScreen phase="complete" />
    </Frame>
  ),
}

export const InteractiveFundedJourney: Story = {
  render: () => (
    <Frame>
      <FundedLifecyclePlayer />
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Review effect")).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Advance status" })
    )
    await expect(
      canvas.getByText("Authorizing", { selector: "span" })
    ).toBeVisible()
    await userEvent.click(
      canvas.getByRole("button", { name: "Advance status" })
    )
    await expect(canvas.getByText("Watching rails")).toBeVisible()
  },
}

export const FundedReviewEffect: Story = {
  render: () => (
    <Frame>
      <FundedSwapScreen runtime={fundedRuntimeStates[0]} />
    </Frame>
  ),
}
export const FundedAuthorizing: Story = {
  render: () => (
    <Frame>
      <FundedSwapScreen runtime={fundedRuntimeStates[1]} />
    </Frame>
  ),
}
export const FundedWatchingRails: Story = {
  render: () => (
    <Frame>
      <FundedSwapScreen runtime={fundedRuntimeStates[2]} />
    </Frame>
  ),
}
export const FundedComplete: Story = {
  render: () => (
    <Frame>
      <FundedSwapScreen runtime={fundedRuntimeStates[3]} />
    </Frame>
  ),
}

export const EntireLifecycleContactSheet: Story = {
  render: () => (
    <Frame wide>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        {journeyPhases.map((phase) => (
          <NoSpendSwapScreen key={phase} phase={phase} />
        ))}
        {fundedRuntimeStates.map((runtime) => (
          <FundedSwapScreen key={runtime.state} runtime={runtime} />
        ))}
      </div>
    </Frame>
  ),
}
