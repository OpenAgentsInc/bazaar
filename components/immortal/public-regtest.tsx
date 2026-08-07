import type { ReactNode } from "react"
import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  CircleDashed,
  Clock3,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function RegtestBoundaryBanner({
  capabilityExpiresIn,
}: {
  capabilityExpiresIn?: string
}) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/8 px-3 py-2 text-xs"
    >
      <span className="flex items-center gap-2 font-semibold text-amber-700 dark:text-amber-300">
        <AlertTriangle aria-hidden="true" className="size-3.5" />
        PUBLIC · REGTEST · NO MAINNET VALUE
      </span>
      {capabilityExpiresIn ? (
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-3.5" />
          Session access expires in {capabilityExpiresIn}
        </span>
      ) : null}
    </div>
  )
}

export type ReadinessState = "ready" | "checking" | "blocked"

export interface ReadinessCheck {
  readonly label: string
  readonly detail: string
  readonly state: ReadinessState
}

const readinessIcon = {
  ready: CheckCircle2,
  checking: CircleDashed,
  blocked: XCircle,
} satisfies Record<ReadinessState, typeof CheckCircle2>

export function PublicRegtestReadiness({
  revision,
  checks,
}: {
  revision: string
  checks: readonly ReadinessCheck[]
}) {
  const blocked = checks.some((check) => check.state === "blocked")
  const checking = checks.some((check) => check.state === "checking")
  const state = blocked ? "Blocked" : checking ? "Checking" : "Ready"

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Public regtest readiness</CardTitle>
        <CardDescription>
          Public-safe service health. No credentials or custody material.
        </CardDescription>
        <CardAction>
          <Badge
            variant={
              blocked ? "destructive" : checking ? "outline" : "secondary"
            }
          >
            {state}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check) => {
          const Icon = readinessIcon[check.state]
          return (
            <div
              key={check.label}
              className="grid grid-cols-[auto_1fr] gap-x-2 rounded-xl border border-border/70 px-3 py-2.5"
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4",
                  check.state === "ready" &&
                    "text-emerald-600 dark:text-emerald-400",
                  check.state === "checking" &&
                    "animate-spin text-muted-foreground motion-reduce:animate-none",
                  check.state === "blocked" && "text-destructive"
                )}
              />
              <div>
                <p className="font-medium">{check.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {check.detail}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="justify-between border-t text-xs text-muted-foreground">
        <span>Signed configuration</span>
        <code className="font-mono">{revision}</code>
      </CardFooter>
    </Card>
  )
}

export type OperationalIssueCode =
  | "maintenance"
  | "capacity_exhausted"
  | "rate_limited"
  | "config_expired"
  | "incompatible_revision"
  | "relay_reconnecting"
  | "provider_unavailable"
  | "capability_expired"
  | "quote_expired"
  | "recovery_required"

const operationalCopy: Record<
  OperationalIssueCode,
  {
    title: string
    detail: string
    recoveryAvailable: boolean
    retryable: boolean
  }
> = {
  maintenance: {
    title: "New sessions are paused",
    detail:
      "Scheduled maintenance is in progress. Existing swaps can still be inspected and recovered.",
    recoveryAvailable: true,
    retryable: true,
  },
  capacity_exhausted: {
    title: "Demo capacity is currently full",
    detail:
      "No public regtest slots are available. This session has not created any effects.",
    recoveryAvailable: false,
    retryable: true,
  },
  rate_limited: {
    title: "Session limit reached",
    detail:
      "This browser has reached its public demo quota. Wait for the indicated retry window.",
    recoveryAvailable: false,
    retryable: true,
  },
  config_expired: {
    title: "Public configuration expired",
    detail:
      "The signed service manifest is no longer current. New funding actions are blocked.",
    recoveryAvailable: true,
    retryable: true,
  },
  incompatible_revision: {
    title: "Client update required",
    detail:
      "This application cannot verify the service revision. No session was started.",
    recoveryAvailable: false,
    retryable: false,
  },
  relay_reconnecting: {
    title: "Restoring relay connection",
    detail:
      "The direct WSS connection was interrupted. The last verified snapshot remains visible.",
    recoveryAvailable: true,
    retryable: true,
  },
  provider_unavailable: {
    title: "Provider unavailable",
    detail:
      "The selected provider did not respond before the deadline. No funding effect was authorized.",
    recoveryAvailable: false,
    retryable: true,
  },
  capability_expired: {
    title: "Session access expired",
    detail:
      "The short-lived capability can no longer create effects. Public recovery remains available.",
    recoveryAvailable: true,
    retryable: false,
  },
  quote_expired: {
    title: "Signed quote expired",
    detail:
      "The quoted terms are no longer actionable. Request fresh quotes before continuing.",
    recoveryAvailable: false,
    retryable: true,
  },
  recovery_required: {
    title: "Recovery action required",
    detail:
      "The swap stopped safely, but retained rail evidence needs to be checked before starting again.",
    recoveryAvailable: true,
    retryable: false,
  },
}

export function PublicRegtestOperationalNotice({
  code,
  retryIn,
  onAction,
}: {
  code: OperationalIssueCode
  retryIn?: string
  onAction?: () => void
}) {
  const copy = operationalCopy[code]
  const reconnecting = code === "relay_reconnecting"
  return (
    <Alert variant={reconnecting ? "default" : "destructive"}>
      {reconnecting ? (
        <RefreshCw
          aria-hidden="true"
          className="animate-spin motion-reduce:animate-none"
        />
      ) : (
        <AlertTriangle aria-hidden="true" />
      )}
      <AlertTitle>{copy.title}</AlertTitle>
      <AlertDescription>
        {copy.detail}
        {retryIn ? ` Retry in ${retryIn}.` : ""}
      </AlertDescription>
      <div className="col-start-2 mt-2 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="font-mono text-[0.625rem]">
          {code}
        </Badge>
        {copy.recoveryAvailable ? (
          <Badge variant="secondary">Recovery retained</Badge>
        ) : null}
        {onAction ? (
          <Button size="xs" variant="outline" onClick={onAction}>
            {copy.retryable ? "Check again" : "View recovery"}
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}

export type CommitmentState = "current" | "invalidated" | "expired"

export function QuoteCommitment({
  provider,
  input,
  output,
  fee,
  destination,
  state,
}: {
  provider: string
  input: string
  output: string
  fee: string
  destination: string
  state: CommitmentState
}) {
  const actionable = state === "current"
  return (
    <Card size="sm" aria-label="Signed quote commitment">
      <CardHeader>
        <CardTitle>Signed quote commitment</CardTitle>
        <CardDescription>
          Exact terms authorized for the selected provider.
        </CardDescription>
        <CardAction>
          <Badge variant={actionable ? "secondary" : "destructive"}>
            {actionable
              ? "Current"
              : state === "expired"
                ? "Expired"
                : "Invalidated"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <DataRow label="Provider" value={provider} />
        <DataRow label="Exact input" value={input} />
        <DataRow label="Exact output" value={output} />
        <DataRow label="Fee ceiling" value={fee} />
        <DataRow label="Destination" value={destination} mono />
        {!actionable ? (
          <p className="rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
            Funding disabled. Destination or amount changes require a fresh
            signed quote.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export interface ProviderReservation {
  readonly name: string
  readonly publicKey: string
  readonly quote: string
  readonly state: "selected" | "released" | "timed_out"
}

export function ProviderSelectionLedger({
  providers,
}: {
  providers: readonly ProviderReservation[]
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Provider reservations</CardTitle>
        <CardDescription>
          One selected route; every other reservation ends with zero effects.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {providers.map((provider) => (
          <div
            key={provider.publicKey}
            className="rounded-xl border border-border px-3 py-2.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium">{provider.name}</p>
                <p className="truncate font-mono text-[0.6875rem] text-muted-foreground">
                  {provider.publicKey}
                </p>
              </div>
              <Badge
                variant={
                  provider.state === "selected" ? "secondary" : "outline"
                }
              >
                {provider.state === "selected"
                  ? "Selected"
                  : provider.state === "released"
                    ? "Released"
                    : "Timed out"}
              </Badge>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{provider.quote}</span>
              <span>
                {provider.state === "selected" ? "Terms retained" : "0 effects"}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export interface VerificationCheck {
  readonly label: string
  readonly detail: string
  readonly state: "verified" | "pending" | "failed"
}

export function VerifyBeforeFund({
  checks,
}: {
  checks: readonly VerificationCheck[]
}) {
  const fundable =
    checks.length > 0 && checks.every((check) => check.state === "verified")
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Verify before fund</CardTitle>
        <CardDescription>
          Browser-verified commitments, not provider claims.
        </CardDescription>
        <CardAction>
          <Badge variant={fundable ? "secondary" : "outline"}>
            {fundable ? "Verified" : "Funding locked"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li key={check.label} className="flex gap-2.5">
              <VerificationIcon state={check.state} />
              <div>
                <p className="font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="border-t">
        <Button className="w-full" disabled={!fundable}>
          <LockKeyhole aria-hidden="true" data-icon="inline-start" />
          Authorize exact regtest effect
        </Button>
      </CardFooter>
    </Card>
  )
}

function VerificationIcon({ state }: { state: VerificationCheck["state"] }) {
  if (state === "verified")
    return (
      <Check
        aria-hidden="true"
        className="mt-0.5 size-4 text-emerald-600 dark:text-emerald-400"
      />
    )
  if (state === "failed")
    return <Ban aria-hidden="true" className="mt-0.5 size-4 text-destructive" />
  return (
    <CircleDashed
      aria-hidden="true"
      className="mt-0.5 size-4 text-muted-foreground"
    />
  )
}

export interface RailEvidence {
  readonly rail: "Bitcoin" | "Lightning"
  readonly requesterState: "verified" | "pending" | "rejected"
  readonly requesterDetail: string
  readonly providerClaim: string
}

export function RailEvidenceGate({
  evidence,
}: {
  evidence: readonly RailEvidence[]
}) {
  const terminal = evidence.every((item) => item.requesterState === "verified")
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Terminal evidence gate</CardTitle>
        <CardDescription>
          Provider status is shown separately from requester-admitted rail
          evidence.
        </CardDescription>
        <CardAction>
          <Badge variant={terminal ? "secondary" : "outline"}>
            {terminal ? "Terminal" : "Not terminal"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        {evidence.map((item) => (
          <section
            key={item.rail}
            aria-label={`${item.rail} evidence`}
            className="rounded-xl border border-border px-3 py-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-2 font-medium">
                {item.rail === "Bitcoin" ? (
                  <ShieldCheck aria-hidden="true" className="size-4" />
                ) : (
                  <Radio aria-hidden="true" className="size-4" />
                )}
                {item.rail}
              </p>
              <Badge
                variant={
                  item.requesterState === "verified"
                    ? "secondary"
                    : item.requesterState === "rejected"
                      ? "destructive"
                      : "outline"
                }
              >
                Requester {item.requesterState}
              </Badge>
            </div>
            <p className="mt-2 text-xs">{item.requesterDetail}</p>
            <p className="mt-2 border-t border-border pt-2 text-xs text-muted-foreground">
              Provider claim · {item.providerClaim} · unverified
            </p>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

export function PublicAcceptanceReceipt({
  revision,
  duration,
  providers,
  outcome,
  onNewDemo,
}: {
  revision: string
  duration: string
  providers: readonly string[]
  outcome: "completed" | "recovered" | "safely_terminated"
  onNewDemo?: () => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Public acceptance receipt</CardTitle>
        <CardDescription>
          Versioned, public-safe evidence for this isolated demo session.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">{outcome.replaceAll("_", " ")}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <DataRow label="Schema" value="bazaar.public-regtest-receipt.v1" mono />
        <DataRow label="Revision" value={revision} mono />
        <DataRow label="Duration" value={duration} />
        <DataRow label="Providers" value={providers.join(" · ")} mono />
        <p className="pt-1 text-xs text-muted-foreground">
          Contains stage, duration, revision, and terminal outcome only. No
          capability, invoice preimage, key, or custody material.
        </p>
      </CardContent>
      {onNewDemo ? (
        <CardFooter className="border-t">
          <Button className="w-full" variant="outline" onClick={onNewDemo}>
            Start a new isolated demo
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  )
}

function DataRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 text-right font-medium",
          mono && "truncate font-mono"
        )}
      >
        {value}
      </span>
    </div>
  )
}
