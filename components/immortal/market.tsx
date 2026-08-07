import {
  ArrowRight,
  Bitcoin,
  Check,
  CircleDashed,
  Clock3,
  FileCheck2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  RotateCcw,
  ShieldCheck,
  TriangleAlert,
  Zap,
} from "lucide-react"

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
import { ImmortalRecordChainViz } from "@/components/viz/immortal/record-chain"
import { cn } from "@/lib/utils"

export type ImmortalMarketRecordState =
  "verified" | "current" | "pending" | "refused"

export interface ImmortalMarketRecord {
  readonly type:
    "RFQ" | "Quote" | "Order" | "Contract" | "Status" | "Cancel" | "Close"
  readonly kind: number
  readonly author: "requester" | "provider"
  readonly state: ImmortalMarketRecordState
  readonly detail: string
}

export function ImmortalMarketRecordChain({
  records,
}: {
  records: readonly ImmortalMarketRecord[]
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Signed market record chain</CardTitle>
        <CardDescription>
          Immutable NIP-MKT records advance only through valid authorship and
          causal ancestry.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 overflow-x-auto rounded-xl border border-border p-2">
          <ImmortalRecordChainViz records={records} />
        </div>
        <ol className="space-y-0">
          {records.map((record, index) => (
            <li
              key={`${record.type}-${record.kind}`}
              className="grid grid-cols-[auto_1fr] gap-3"
            >
              <div className="flex flex-col items-center">
                <RecordDot state={record.state} />
                {index < records.length - 1 ? (
                  <span className="h-full min-h-8 w-px bg-border" />
                ) : null}
              </div>
              <div className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{record.type}</p>
                  <Badge
                    variant="outline"
                    className="font-mono text-[0.625rem]"
                  >
                    kind {record.kind}
                  </Badge>
                  <span className="text-[0.6875rem] text-muted-foreground">
                    {record.author}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {record.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}

export function ImmortalOfferingCard({
  provider,
  input,
  output,
  minimum,
  maximum,
  feeBps,
  quoteLifetime,
}: {
  provider: string
  input: "LN" | "BTC" | "LBTC"
  output: "LN" | "BTC" | "LBTC"
  minimum: string
  maximum: string
  feeBps: string
  quoteLifetime: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="size-4 text-primary" />
          {provider}
        </CardTitle>
        <CardDescription>
          Engine-validated public Offering head.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">Active</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-secondary px-3 py-4">
          <AssetMark ticker={input} />
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-muted-foreground"
          />
          <AssetMark ticker={output} />
        </div>
        <MarketRow label="Limits" value={`${minimum}–${maximum} sats`} />
        <MarketRow label="Advertised fee" value={`${feeBps} bps`} />
        <MarketRow label="Firm Quote lifetime" value={quoteLifetime} />
        <MarketRow label="Reservation" value="Soft · signed proof" />
        <MarketRow
          label="Confirmation policy"
          value="RBF reject · reorg safe"
        />
      </CardContent>
    </Card>
  )
}

export type EffectState = "prepared" | "authorized" | "admitted" | "refused"

export function ImmortalEffectAuthorization({
  state,
  effectId,
  operation,
  network,
  amount,
  destination,
}: {
  state: EffectState
  effectId: string
  operation: string
  network: string
  amount: string
  destination: string
}) {
  const refused = state === "refused"
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LockKeyhole aria-hidden="true" className="size-4 text-primary" />
          Exact effect authorization
        </CardTitle>
        <CardDescription>
          The SDK prepares bytes; the host separately authorizes the exact
          matching request.
        </CardDescription>
        <CardAction>
          <Badge
            variant={
              refused
                ? "destructive"
                : state === "admitted"
                  ? "secondary"
                  : "outline"
            }
          >
            {state}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <MarketRow label="Effect ID" value={effectId} mono />
        <MarketRow label="Operation" value={operation} mono />
        <MarketRow label="Network" value={network} />
        <MarketRow label="Amount" value={amount} />
        <MarketRow label="Destination" value={destination} mono />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.6875rem]">
          <EffectStep label="Prepared" complete={state !== "refused"} />
          <EffectStep
            label="Host authorized"
            complete={["authorized", "admitted"].includes(state)}
          />
          <EffectStep
            label="Receipt admitted"
            complete={state === "admitted"}
          />
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <Button className="w-full" disabled={state !== "prepared"}>
          {refused ? "Effect refused" : "Authorize exact host effect"}
        </Button>
      </CardFooter>
    </Card>
  )
}

export interface ImmortalEvidenceItem {
  readonly source: "provider" | "requester" | "relay"
  readonly rail: "Bitcoin" | "Lightning" | "Contract"
  readonly claim: string
  readonly state: "observed" | "admitted" | "rejected"
  readonly reference: string
}

export function ImmortalEvidenceLedger({
  items,
}: {
  items: readonly ImmortalEvidenceItem[]
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Evidence admission ledger</CardTitle>
        <CardDescription>
          Observation, authorship, and settlement authority remain distinct.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border">
          {items.map((item) => (
            <div
              key={`${item.source}-${item.reference}`}
              className="grid gap-2 border-b border-border px-3 py-3 last:border-b-0 sm:grid-cols-[6rem_6rem_1fr_auto] sm:items-center"
            >
              <span className="text-xs font-medium capitalize">
                {item.source}
              </span>
              <Badge variant="outline">{item.rail}</Badge>
              <div>
                <p className="text-xs">{item.claim}</p>
                <p className="mt-0.5 truncate font-mono text-[0.625rem] text-muted-foreground">
                  {item.reference}
                </p>
              </div>
              <Badge
                variant={
                  item.state === "rejected"
                    ? "destructive"
                    : item.state === "admitted"
                      ? "secondary"
                      : "outline"
                }
              >
                {item.state}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 text-emerald-500" />
        Provider Status alone never establishes terminal settlement.
      </CardFooter>
    </Card>
  )
}

export function ImmortalReservation({
  provider,
  amount,
  expiresIn,
  state,
}: {
  provider: string
  amount: string
  expiresIn: string
  state: "soft" | "hard" | "released" | "expired"
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Provider reservation</p>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {provider}
          </p>
        </div>
        <Badge
          variant={
            state === "expired"
              ? "destructive"
              : state === "released"
                ? "outline"
                : "secondary"
          }
        >
          {state}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span>{amount} operator capacity</span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock3 aria-hidden="true" className="size-3.5" />
          {state === "released"
            ? "0 effects retained"
            : `Expires in ${expiresIn}`}
        </span>
      </div>
    </div>
  )
}

export function ImmortalRecoveryPlan({
  path,
  timelock,
  packageDigest,
  state,
}: {
  path: "cooperative" | "script_refund" | "script_claim" | "keyless_exit"
  timelock: string
  packageDigest: string
  state: "prepared" | "watching" | "actionable" | "complete"
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RotateCcw aria-hidden="true" className="size-4 text-primary" />
          Recovery plan
        </CardTitle>
        <CardDescription>
          Recovery remains explicit and independently verifiable after
          disconnect or noncooperation.
        </CardDescription>
        <CardAction>
          <Badge variant={state === "complete" ? "secondary" : "outline"}>
            {state}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <MarketRow label="Path" value={path.replaceAll("_", " ")} />
        <MarketRow label="Timelock" value={timelock} />
        <MarketRow label="Exit package" value={packageDigest} mono />
        <MarketRow label="Signing authority" value="Requester-held" />
        <div className="mt-3 flex gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          <KeyRound
            aria-hidden="true"
            className="size-4 shrink-0 text-emerald-500"
          />
          The relay stores no spend key, refund key, preimage, seed, or node
          credential.
        </div>
      </CardContent>
      <CardFooter className="border-t">
        <Button
          className="w-full"
          variant="outline"
          disabled={state !== "actionable"}
        >
          Inspect recovery transaction
        </Button>
      </CardFooter>
    </Card>
  )
}

export function ImmortalVerificationSummary({
  fundingAuthorized,
  statusGaps,
  statusForks,
  invalidClaims,
}: {
  fundingAuthorized: boolean
  statusGaps: number
  statusForks: number
  invalidClaims: number
}) {
  const clean = statusGaps === 0 && statusForks === 0 && invalidClaims === 0
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          {clean ? (
            <FileCheck2
              aria-hidden="true"
              className="size-4 text-emerald-500"
            />
          ) : (
            <TriangleAlert
              aria-hidden="true"
              className="size-4 text-destructive"
            />
          )}
          Engine verification
        </p>
        <Badge variant={clean ? "secondary" : "destructive"}>
          {clean ? "Clean" : "Refused"}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <VerificationMetric
          label="Funding authorized"
          value={fundingAuthorized ? "yes" : "no"}
          good={!fundingAuthorized}
        />
        <VerificationMetric
          label="Status gaps"
          value={String(statusGaps)}
          good={statusGaps === 0}
        />
        <VerificationMetric
          label="Status forks"
          value={String(statusForks)}
          good={statusForks === 0}
        />
        <VerificationMetric
          label="Invalid claims"
          value={String(invalidClaims)}
          good={invalidClaims === 0}
        />
      </div>
    </div>
  )
}

function RecordDot({ state }: { state: ImmortalMarketRecordState }) {
  if (state === "verified")
    return (
      <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-black">
        <Check className="size-3" />
      </span>
    )
  if (state === "current")
    return (
      <CircleDashed className="size-5 animate-spin text-primary motion-reduce:animate-none" />
    )
  if (state === "refused")
    return <TriangleAlert className="size-5 text-destructive" />
  return <span className="size-5 rounded-full border border-border" />
}

function AssetMark({ ticker }: { ticker: "LN" | "BTC" | "LBTC" }) {
  return (
    <span
      className={cn(
        "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold",
        ticker === "LN"
          ? "bg-asset-lightning text-asset-lightning-foreground"
          : ticker === "BTC"
            ? "bg-asset-bitcoin text-asset-bitcoin-foreground"
            : "bg-asset-liquid text-asset-liquid-foreground"
      )}
    >
      {ticker === "LN" ? (
        <Zap className="size-3.5" />
      ) : (
        <Bitcoin className="size-3.5" />
      )}
      {ticker}
    </span>
  )
}

function EffectStep({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-2",
        complete
          ? "border-emerald-500/30 bg-emerald-500/8"
          : "border-border text-muted-foreground"
      )}
    >
      <span className="mx-auto mb-1 grid size-4 place-items-center rounded-full border border-current">
        {complete ? <Check className="size-2.5" /> : null}
      </span>
      {label}
    </div>
  )
}

function MarketRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  )
}

function VerificationMetric({
  label,
  value,
  good,
}: {
  label: string
  value: string
  good: boolean
}) {
  return (
    <div className="rounded-lg bg-secondary p-2.5">
      <p
        className={cn(
          "font-mono text-sm font-semibold",
          good ? "text-emerald-500" : "text-destructive"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 text-[0.625rem] text-muted-foreground">{label}</p>
    </div>
  )
}
