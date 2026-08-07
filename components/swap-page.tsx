"use client"

import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import {
  CheckIcon,
  ChevronRightIcon,
  CopyIcon,
  ShieldCheckIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useImmortalRuntime } from "@/hooks/use-immortal-runtime"
import {
  useFundedRegtest,
  type FundedRuntimeState,
} from "@/hooks/use-funded-regtest"
import type { FundedRegtestConfigResult } from "@/lib/immortal/funded-config"
import type {
  ImmortalConfigResult,
  ImmortalRuntimeStatus,
} from "@/lib/immortal/config"
import type {
  FundedJourney,
  FundedSessionManifest,
} from "@/lib/immortal/funded-session"
import {
  findDirection,
  formatAtomicAmount,
  type ImmortalMarketSnapshot,
  type MarketAsset,
  type MarketAssetTicker,
  type MarketDirection,
  type QuoteState,
  type ValidatedQuote,
} from "@/lib/immortal/market"
import {
  DEMO_LIFECYCLE_STAGES,
  type DemoLifecycleState,
} from "@/lib/immortal/lifecycle"

const assetUi = {
  LN: {
    label: "Lightning",
    symbol: "LN",
    destination: "Paste a Lightning invoice, BOLT12 or LNURL to receive funds",
    iconSrc: "/boltz/lightning-icon.svg",
  },
  BTC: {
    label: "Bitcoin",
    symbol: "BTC",
    destination: "Enter BTC address to receive funds",
    iconSrc: "/boltz/bitcoin-icon.svg",
  },
  LBTC: {
    label: "Liquid BTC",
    symbol: "LBTC",
    destination: "Enter LBTC address to receive funds",
    iconSrc: "/boltz/liquid-icon.svg",
  },
} as const

function AssetIcon({ ticker }: { ticker: MarketAssetTicker }) {
  const { iconSrc } = assetUi[ticker]

  return (
    <span className="flex size-[2.125rem] shrink-0 items-center justify-center">
      <Image
        src={iconSrc}
        alt=""
        width={34}
        height={34}
        className="size-[2.125rem]"
      />
    </span>
  )
}

function BoltzCogIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M14.59 9.535a3.053 3.053 0 0 1 1.127-4.164l-1.572-2.723a3.017 3.017 0 0 1-1.529.414A3.052 3.052 0 0 1 9.574 0H6.429a3.009 3.009 0 0 1-.406 1.535c-.839 1.454-2.706 1.948-4.17 1.106L.281 5.364a3 3 0 0 1 1.123 1.117 3.053 3.053 0 0 1-1.12 4.16l1.572 2.723c.448-.261.967-.41 1.522-.41A3.052 3.052 0 0 1 6.42 16h3.145a3.012 3.012 0 0 1 .406-1.519 3.053 3.053 0 0 1 4.163-1.11l1.572-2.723a3.008 3.008 0 0 1-1.116-1.113zM8 11.24a3.24 3.24 0 1 1 0-6.48 3.24 3.24 0 0 1 0 6.48z" />
    </svg>
  )
}

function BoltzArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M8 15.5 15.5 8H11V0H5v8H.5z" />
    </svg>
  )
}

function AssetPicker({
  ticker,
  options,
  onValueChange,
  label,
}: {
  ticker: MarketAssetTicker
  options: readonly MarketAsset[]
  onValueChange: (value: MarketAssetTicker) => void
  label: string
}) {
  const enabled = options.length > 0
  return (
    <Select
      value={ticker}
      disabled={!enabled}
      onValueChange={(nextValue) => {
        if (options.some((asset) => asset.ticker === nextValue)) {
          onValueChange(nextValue as MarketAssetTicker)
        }
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="absolute bottom-2.5 left-2.5 z-10 grid h-[2.625rem] w-auto max-w-[11rem] min-w-[6.75rem] grid-cols-[2.125rem_auto_1rem] items-center justify-normal gap-x-1.5 rounded-full border-border bg-card px-0 py-0 ps-1 pe-3 text-foreground shadow-none hover:bg-accent focus-visible:border-ring focus-visible:ring-ring/25 disabled:opacity-60"
      >
        <AssetIcon ticker={ticker} />
        <SelectValue className="text-left text-sm leading-none font-semibold uppercase">
          {assetUi[ticker].symbol}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-56 rounded-xl bg-popover text-popover-foreground ring-border"
      >
        {options.map((asset) => (
          <SelectItem key={asset.id} value={asset.ticker} className="min-h-10">
            <AssetIcon ticker={asset.ticker} />
            <span>{asset.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AmountField({
  side,
  amount,
  ticker,
  options,
  onAmountChange,
  onAssetChange,
  hint,
  invalid = false,
  readOnly = false,
}: {
  side: "Send" | "Receive"
  amount: string
  ticker: MarketAssetTicker
  options: readonly MarketAsset[]
  onAmountChange?: (value: string) => void
  onAssetChange: (value: MarketAssetTicker) => void
  hint: string
  invalid?: boolean
  readOnly?: boolean
}) {
  return (
    <div
      className={`relative h-[5.625rem] overflow-visible rounded-xl border bg-secondary transition-shadow ${
        invalid
          ? "border-destructive ring-1 ring-destructive/40"
          : "border-border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/40"
      }`}
    >
      <label
        htmlFor={`${side.toLowerCase()}-amount`}
        className="pointer-events-none absolute top-2.5 left-3.5 z-10 text-[0.6875rem] font-bold text-muted-foreground uppercase"
      >
        {side}
      </label>
      <AssetPicker
        ticker={ticker}
        options={options}
        onValueChange={onAssetChange}
        label={`Select asset to ${side.toLowerCase()}`}
      />
      <Input
        id={`${side.toLowerCase()}-amount`}
        type="text"
        inputMode={readOnly ? undefined : "numeric"}
        autoComplete="off"
        placeholder="0"
        value={amount}
        readOnly={readOnly}
        aria-invalid={invalid || undefined}
        onChange={(event) =>
          onAmountChange?.(normalizeAtomicInput(event.target.value))
        }
        className="h-full rounded-xl border-0 bg-transparent pt-8 pr-3 pb-4 pl-36 text-right text-[2.0625rem] leading-[1.2] font-normal tracking-tight text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 md:text-[2.0625rem]"
      />
      <span className="pointer-events-none absolute right-3 bottom-1 max-w-[15rem] truncate text-[0.6875rem] text-muted-foreground">
        {hint}
      </span>
    </div>
  )
}

type SwapMode = "no_spend" | "funded_regtest"

export function SwapPage({
  config,
  fundedConfig,
}: {
  config: ImmortalConfigResult
  fundedConfig: FundedRegtestConfigResult
}) {
  const [mode, setMode] = useState<SwapMode>("no_spend")
  const [sendTicker, setSendTicker] = useState<MarketAssetTicker>("LN")
  const [receiveTicker, setReceiveTicker] = useState<MarketAssetTicker>("BTC")
  const [sendAmount, setSendAmount] = useState("")
  const [destination, setDestination] = useState("")
  const {
    status,
    provenance,
    market,
    quotes,
    lifecycle,
    requestQuotes,
    resetQuotes,
    startDemo,
    retryDemo,
    runAnotherDemo,
  } = useImmortalRuntime(config, mode === "no_spend")
  const funded = useFundedRegtest(fundedConfig, mode === "funded_regtest")

  useEffect(() => {
    if (
      fundedConfig.state === "ready" &&
      window.localStorage.getItem("bazaar.swap-mode.v1") === "funded_regtest"
    ) {
      const frame = window.requestAnimationFrame(() =>
        setMode("funded_regtest")
      )
      return () => window.cancelAnimationFrame(frame)
    }
  }, [fundedConfig.state])

  function changeMode(nextMode: SwapMode) {
    setMode(nextMode)
    window.localStorage.setItem("bazaar.swap-mode.v1", nextMode)
  }

  const direction = directionByTicker(market, sendTicker, receiveTicker)
  const sendOptions = useMemo(
    () =>
      market.assets.filter((asset) =>
        market.directions.some(
          (candidate) => candidate.inputAsset.ticker === asset.ticker
        )
      ),
    [market]
  )
  const receiveOptions = useMemo(
    () =>
      uniqueAssets(
        market.directions
          .filter((candidate) => candidate.inputAsset.ticker === sendTicker)
          .map((candidate) => candidate.outputAsset)
      ),
    [market, sendTicker]
  )
  const amountState = validateAmount(sendAmount, direction)
  const selectedQuote = quotes.state === "ready" ? quotes.selected : null
  const receiveAmount = selectedQuote?.outputAmount ?? ""
  const destinationLabel = assetUi[receiveTicker].destination
  const reverseAvailable = Boolean(
    directionByTicker(market, receiveTicker, sendTicker)?.actionable
  )

  useEffect(() => {
    if (
      status.state !== "live" ||
      !direction?.actionable ||
      !amountState.valid
    ) {
      resetQuotes()
      return
    }
    const timer = setTimeout(() => {
      void requestQuotes({
        inputAssetId: direction.inputAsset.id,
        outputAssetId: direction.outputAsset.id,
        inputAmount: sendAmount,
      })
    }, 450)
    return () => clearTimeout(timer)
  }, [
    amountState.valid,
    direction,
    requestQuotes,
    resetQuotes,
    sendAmount,
    status.state,
  ])

  function changeSendAsset(nextTicker: MarketAssetTicker) {
    const outputs = market.directions.filter(
      (candidate) => candidate.inputAsset.ticker === nextTicker
    )
    setSendTicker(nextTicker)
    if (
      !outputs.some(
        (candidate) => candidate.outputAsset.ticker === receiveTicker
      )
    ) {
      setReceiveTicker(outputs[0]?.outputAsset.ticker ?? receiveTicker)
    }
    setSendAmount("")
    setDestination("")
    resetQuotes()
  }

  function changeReceiveAsset(nextTicker: MarketAssetTicker) {
    setReceiveTicker(nextTicker)
    setDestination("")
    resetQuotes()
  }

  function changeAmount(value: string) {
    setSendAmount(value)
    resetQuotes()
  }

  function reverseSwap() {
    if (!reverseAvailable) return
    setSendTicker(receiveTicker)
    setReceiveTicker(sendTicker)
    setSendAmount("")
    setDestination("")
    resetQuotes()
  }

  const quoteReady = Boolean(selectedQuote && amountState.valid)
  const canCreate = quoteReady && destination.trim().length > 0
  const sessionActive = lifecycle.state !== "idle"

  function submitDemo() {
    if (lifecycle.state === "complete") {
      runAnotherDemo()
      setSendAmount("")
      setDestination("")
      return
    }
    if (lifecycle.state === "error") {
      retryDemo()
      return
    }
    if (selectedQuote && canCreate) {
      void startDemo(selectedQuote.sessionId)
    }
  }

  return (
    <main className="dark flex h-svh items-center justify-center overflow-hidden overscroll-none bg-background px-0 text-foreground sm:px-6 sm:py-6">
      <Card className="relative max-h-svh w-full max-w-[31rem] gap-0 overflow-hidden rounded-none border-border bg-card py-0 shadow-none sm:max-h-[calc(100svh-3rem)] sm:rounded-2xl">
        <CardHeader className="grid grid-cols-[1fr_auto_1fr] items-center gap-0 px-4 py-4 sm:px-[1.375rem]">
          <span className="col-start-1 h-5 w-fit self-center justify-self-start rounded-[0.1875rem] border border-border px-1.5 font-mono text-[0.625rem] leading-[1.125rem] font-medium tracking-[0.08em] text-muted-foreground">
            {mode === "no_spend" ? "DEMO · NO-SPEND" : "REGTEST · FUNDED"}
          </span>
          <CardTitle
            role="heading"
            aria-level={1}
            className="col-start-2 text-center text-[1.375rem] leading-[1.2] font-extrabold tracking-tight"
          >
            Create Swap
          </CardTitle>
          <RuntimePopover
            mode={mode}
            onModeChange={changeMode}
            modeLocked={
              lifecycle.state === "running" ||
              funded.runtime.state === "authorizing"
            }
            fundedConfig={fundedConfig}
            fundedRuntime={funded.runtime}
            status={status}
            provenance={provenance}
          />
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[1.375rem] sm:px-[1.375rem]">
          {mode === "funded_regtest" ? (
            <FundedSwapContent
              runtime={funded.runtime}
              onAuthorize={() => void funded.authorize()}
            />
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                submitDemo()
              }}
            >
              <fieldset disabled={sessionActive} className="contents">
                <div className="relative space-y-3">
                  <AmountField
                    side="Send"
                    amount={sendAmount}
                    ticker={sendTicker}
                    options={sendOptions}
                    onAmountChange={changeAmount}
                    onAssetChange={changeSendAsset}
                    hint={directionHint(direction)}
                    invalid={sendAmount.length > 0 && !amountState.valid}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Reverse swap direction"
                    disabled={!reverseAvailable}
                    onClick={reverseSwap}
                    className="absolute top-1/2 left-1/2 z-20 size-8 -translate-x-1/2 -translate-y-1/2 rounded-md border-border bg-card text-muted-foreground shadow-[0_2px_6px_oklch(0_0_0/0.35)] hover:border-ring hover:bg-accent hover:text-foreground active:not-aria-[haspopup]:-translate-y-1/2 disabled:bg-card disabled:opacity-50 dark:bg-card dark:hover:bg-accent"
                  >
                    <BoltzArrowDownIcon className="size-3.5 opacity-65" />
                  </Button>

                  <AmountField
                    side="Receive"
                    amount={receiveAmount}
                    ticker={receiveTicker}
                    options={receiveOptions}
                    onAssetChange={changeReceiveAsset}
                    hint={
                      selectedQuote
                        ? "Exact signed output"
                        : "Waiting for signed Quotes"
                    }
                    readOnly
                  />
                </div>
              </fieldset>

              {lifecycle.state === "idle" ? (
                <QuoteSummary quotes={quotes} direction={direction} />
              ) : (
                <LifecyclePanel lifecycle={lifecycle} />
              )}

              <p
                role="status"
                aria-live="polite"
                className="mt-3 min-h-4 text-center text-xs text-muted-foreground"
              >
                {cardStatus(status, direction, amountState, quotes, lifecycle)}
              </p>

              <Separator className="my-4 bg-foreground/10" />

              <label htmlFor="destination" className="sr-only">
                {destinationLabel}
              </label>
              <Input
                id="destination"
                type="text"
                autoComplete="off"
                value={destination}
                disabled={sessionActive}
                onChange={(event) => setDestination(event.target.value)}
                placeholder={destinationLabel}
                className="h-[2.625rem] rounded-xl border-border bg-secondary text-center text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/25"
              />

              <Separator className="my-4 bg-foreground/10" />

              <Button
                type="submit"
                size="lg"
                disabled={
                  lifecycle.state === "running" ||
                  (lifecycle.state === "idle" && !canCreate)
                }
                data-demo-primary-action
                className="h-[2.625rem] w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/85 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
              >
                {primaryActionLabel(lifecycle)}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}

function FundedSwapContent({
  runtime,
  onAuthorize,
}: {
  runtime: FundedRuntimeState
  onAuthorize: () => void
}) {
  const session = fundedSession(runtime)
  const journey = session?.journeys[session.activeJourney]
  const effect = journey?.pendingEffect ?? journey?.effectReceipt?.request
  const sendTicker = journey?.name === "submarine" ? "BTC" : "LN"
  const receiveTicker = journey?.name === "submarine" ? "LN" : "BTC"
  const ready = runtime.state === "ready" && Boolean(effect)

  return (
    <section
      aria-label="Funded regtest swap"
      data-funded-state={runtime.state}
      data-funded-journey={session?.activeJourney}
    >
      <div className="relative space-y-3">
        <FundedAmountField
          side="Send"
          ticker={sendTicker}
          amount={effect ? String(effect.amountSat) : ""}
          hint={
            effect
              ? `${effect.amountSat.toLocaleString()} sats · exact effect`
              : "Waiting for Immortal"
          }
        />

        <span className="absolute top-1/2 left-1/2 z-20 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-md border border-border bg-card text-muted-foreground shadow-[0_2px_6px_oklch(0_0_0/0.35)]">
          <BoltzArrowDownIcon className="size-3.5 opacity-65" />
        </span>

        <FundedAmountField
          side="Receive"
          ticker={receiveTicker}
          amount=""
          hint="Determined by the signed Immortal contract"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <VerificationTile
          label="Provider Status"
          value={journey?.providerStatusClaim.state ?? "waiting"}
          verified={false}
          detail="Counterparty claim · unverified"
        />
        <VerificationTile
          label="Local rails"
          value={verificationLabel(journey)}
          verified={
            journey?.requesterVerification.state ===
            "terminal_rail_evidence_verified"
          }
          detail="Immortal requester verification"
        />
      </div>

      <p
        role="status"
        aria-live="polite"
        className={`mt-3 min-h-8 text-center text-xs ${
          runtime.state === "error"
            ? "text-destructive"
            : "text-muted-foreground"
        }`}
      >
        {runtime.detail}
      </p>

      {session ? <FundedEvidencePanel session={session} /> : null}

      <Separator className="my-4 bg-foreground/10" />

      <Button
        type="button"
        size="lg"
        disabled={!ready}
        onClick={onAuthorize}
        data-funded-primary-action
        className="h-[2.625rem] w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/85 disabled:bg-secondary disabled:text-muted-foreground disabled:opacity-100"
      >
        {fundedActionLabel(runtime, journey)}
      </Button>
      <p className="mt-2 text-center font-mono text-[0.625rem] tracking-wide text-muted-foreground uppercase">
        Disposable loopback Bitcoin regtest · local rails only
      </p>
    </section>
  )
}

function FundedAmountField({
  side,
  ticker,
  amount,
  hint,
}: {
  side: "Send" | "Receive"
  ticker: "LN" | "BTC"
  amount: string
  hint: string
}) {
  return (
    <div className="relative h-[5.625rem] rounded-xl border border-border bg-secondary">
      <span className="absolute top-2.5 left-3.5 text-[0.6875rem] font-bold text-muted-foreground uppercase">
        {side}
      </span>
      <span className="absolute bottom-2.5 left-2.5 flex h-[2.625rem] items-center gap-1.5 rounded-full border border-border bg-card ps-1 pe-3 font-semibold text-foreground uppercase">
        <AssetIcon ticker={ticker} />
        {ticker}
      </span>
      <span className="absolute top-7 right-3.5 text-[2rem] leading-none tracking-tight text-foreground">
        {amount || "0"}
      </span>
      <span className="absolute right-3.5 bottom-1.5 max-w-[15rem] truncate text-[0.6875rem] text-muted-foreground">
        {hint}
      </span>
    </div>
  )
}

function VerificationTile({
  label,
  value,
  detail,
  verified,
}: {
  label: string
  value: string
  detail: string
  verified: boolean
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary p-3">
      <div className="flex items-center gap-1.5 font-semibold text-foreground">
        <span
          className={`size-2 rounded-full ${verified ? "bg-primary" : "bg-muted-foreground"}`}
          aria-hidden="true"
        />
        {label}
      </div>
      <p className="mt-1 truncate font-mono text-[0.6875rem] text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-[0.625rem] text-muted-foreground">{detail}</p>
    </div>
  )
}

function FundedEvidencePanel({ session }: { session: FundedSessionManifest }) {
  return (
    <Collapsible className="mt-3 rounded-xl border border-border bg-secondary">
      <CollapsibleTrigger className="group flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Public-safe evidence
        <ChevronRightIcon className="size-3.5 transition-transform duration-200 group-data-panel-open:rotate-90 motion-reduce:transition-none" />
      </CollapsibleTrigger>
      <CollapsibleContent className="max-h-52 space-y-3 overflow-y-auto border-t border-foreground/10 px-3 py-3">
        <EvidenceValue label="Requester key" value={session.requesterPubkey} />
        {(["submarine", "reverse"] as const).map((name) => {
          const journey = session.journeys[name]
          if (!journey) return null
          const bitcoin =
            journey.requesterVerification.independentRailEvidence.find(
              (item) => item.rail === "bitcoin"
            )
          const lightning =
            journey.requesterVerification.independentRailEvidence.find(
              (item) => item.rail === "lightning"
            )
          return (
            <div
              key={name}
              className="space-y-1.5 border-t border-foreground/10 pt-3"
            >
              <p className="font-mono text-[0.625rem] tracking-wide text-primary uppercase">
                {name}
              </p>
              <EvidenceValue
                label="Provider key"
                value={journey.providerPubkey}
              />
              <EvidenceValue label="Session ID" value={journey.sessionId} />
              <EvidenceValue label="Order ID" value={journey.orderId} />
              {journey.effectReceipt ? (
                <>
                  <EvidenceValue
                    label="External ID"
                    value={journey.effectReceipt.externalIdentifier}
                  />
                  <EvidenceValue
                    label="Result digest"
                    value={journey.effectReceipt.resultDigest}
                  />
                </>
              ) : null}
              {bitcoin?.rail === "bitcoin" ? (
                <>
                  <EvidenceValue
                    label="Lockup txid"
                    value={bitcoin.lockupTxid}
                  />
                  <EvidenceValue label="Claim txid" value={bitcoin.claimTxid} />
                </>
              ) : null}
              {lightning?.rail === "lightning" ? (
                <EvidenceValue
                  label="Payment hash"
                  value={lightning.paymentHash}
                />
              ) : null}
            </div>
          )
        })}
      </CollapsibleContent>
    </Collapsible>
  )
}

function EvidenceValue({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[0.625rem] text-muted-foreground">
        {label}
      </span>
      <code
        className="min-w-0 flex-1 truncate text-[0.625rem] text-foreground"
        title={value}
      >
        {value}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(value).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1_500)
          })
        }}
        className="size-6 text-muted-foreground hover:text-foreground"
      >
        {copied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </Button>
    </div>
  )
}

function fundedSession(
  runtime: FundedRuntimeState
): FundedSessionManifest | null {
  return "session" in runtime ? runtime.session : null
}

function verificationLabel(journey: FundedJourney | undefined): string {
  if (!journey) return "waiting"
  return {
    effect_authorized: "effect authorized",
    effect_admitted: "effect admitted",
    terminal_rail_evidence_verified: "BTC + LN verified",
  }[journey.requesterVerification.state]
}

function fundedActionLabel(
  runtime: FundedRuntimeState,
  journey: FundedJourney | undefined
): string {
  if (runtime.state === "authorizing") return "Authorizing exact effect…"
  if (runtime.state === "watching") return "Verifying local rail evidence…"
  if (runtime.state === "complete") return "Both journeys verified"
  if (runtime.state === "error") return "Funded mode stopped"
  if (runtime.state !== "ready" || !journey?.pendingEffect) {
    return "Waiting for Immortal"
  }
  return journey.pendingEffect.method === "broadcast_bitcoin_funding"
    ? "Authorize Bitcoin funding broadcast"
    : "Authorize Lightning invoice payment"
}

function LifecyclePanel({
  lifecycle,
}: {
  lifecycle: Exclude<DemoLifecycleState, { readonly state: "idle" }>
}) {
  const activeStage =
    lifecycle.state === "running" || lifecycle.state === "error"
      ? lifecycle.activeStage
      : null
  return (
    <section
      aria-label="No-spend session lifecycle"
      data-lifecycle-state={lifecycle.state}
      data-lifecycle-stage={activeStage ?? "complete"}
      data-provider-role={lifecycle.providerRole ?? undefined}
      className="mt-4 rounded-xl border border-border bg-secondary p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-3 text-[0.6875rem] font-medium text-muted-foreground">
        <span className="font-mono tracking-wide uppercase">
          Immortal session
        </span>
        <span>
          {lifecycle.providerRole === "provider-a"
            ? "Provider A"
            : lifecycle.providerRole === "provider-b"
              ? "Provider B"
              : "Selected provider"}
        </span>
      </div>
      <ol className="max-h-32 space-y-1 overflow-y-auto overscroll-contain pr-1 text-xs">
        {DEMO_LIFECYCLE_STAGES.map((stage) => {
          const complete = lifecycle.completedStages.includes(stage.id)
          const active = stage.id === activeStage
          return (
            <li
              key={stage.id}
              data-lifecycle-milestone={stage.id}
              data-complete={complete || undefined}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
                active ? "bg-accent text-foreground" : "text-muted-foreground"
              }`}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                  complete
                    ? "border-primary bg-primary text-primary-foreground"
                    : active
                      ? "border-primary"
                      : "border-foreground/20"
                }`}
                aria-hidden="true"
              >
                {complete ? (
                  <CheckIcon className="size-2.5" strokeWidth={3} />
                ) : active ? (
                  <span className="size-1.5 animate-pulse rounded-full bg-primary motion-reduce:animate-none" />
                ) : null}
              </span>
              <span>{stage.label}</span>
            </li>
          )
        })}
      </ol>
      {lifecycle.state === "error" ? (
        <p className="mt-2 border-t border-foreground/10 pt-2 text-xs text-destructive">
          {lifecycle.detail}
        </p>
      ) : null}
    </section>
  )
}

function primaryActionLabel(lifecycle: DemoLifecycleState): string {
  return {
    idle: "Create Swap",
    running: "Running no-spend session…",
    error: "Retry session",
    complete: "Run another demo",
  }[lifecycle.state]
}

function QuoteSummary({
  quotes,
  direction,
}: {
  quotes: QuoteState
  direction: MarketDirection | null
}) {
  const rows =
    quotes.state === "requesting" || quotes.state === "ready"
      ? quotes.quotes
      : []
  const selected = quotes.state === "ready" ? quotes.selected : null
  const providerCount =
    quotes.state === "requesting" || quotes.state === "ready"
      ? quotes.requestedProviderCount
      : (direction?.providerCount ?? 0)

  return (
    <Collapsible className="mt-4">
      <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 pt-0.5 font-mono">
          <Image
            src="/boltz/sat.svg"
            alt=""
            width={15}
            height={11}
            className="h-[0.6875rem] w-[0.9375rem] scale-[1.65]"
          />
          <span className="text-primary">sats</span>
        </div>
        <CollapsibleTrigger className="group flex items-start gap-1 text-right outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
          <span>
            <span className="block">
              {providerCount} provider{providerCount === 1 ? "" : "s"}
              {quotes.state === "requesting" ? " · quoting" : ""}
            </span>
            <span className="block">
              {selected
                ? `Fees · ${formatAtomicAmount(selected.maximumTotalFee)} sats`
                : "Signed fees · —"}
            </span>
          </span>
          <ChevronRightIcon className="mt-0.5 size-3.5 transition-transform duration-200 group-data-panel-open:rotate-90 motion-reduce:transition-none" />
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="pt-3">
        {rows.length > 0 ? (
          <div className="divide-y divide-foreground/10 border-y border-foreground/10">
            {rows.map((quote) => (
              <QuoteRow
                key={quote.quoteId}
                quote={quote}
                selected={selected?.quoteId === quote.quoteId}
              />
            ))}
          </div>
        ) : (
          <p className="py-2 text-right text-xs text-muted-foreground">
            Valid provider Quotes appear here after an offered amount
            stabilizes.
          </p>
        )}
        <p className="pt-2 text-right text-[0.6875rem] text-muted-foreground">
          Policy: highest output, then lowest total fee, then provider key.
        </p>
      </CollapsibleContent>
    </Collapsible>
  )
}

function QuoteRow({
  quote,
  selected,
}: {
  quote: ValidatedQuote
  selected: boolean
}) {
  return (
    <div
      className="py-2.5 text-xs"
      data-quote-provider={quote.providerPubkey}
      data-selected={selected || undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 font-medium text-foreground">
          {selected ? (
            <CheckIcon className="size-3.5 text-primary" aria-hidden="true" />
          ) : null}
          <span>
            {quote.providerRole === "provider-a" ? "Provider A" : "Provider B"}
          </span>
          <span className="truncate font-mono text-[0.625rem] text-muted-foreground">
            {quote.providerPubkey.slice(0, 8)}
          </span>
        </div>
        <span className="font-mono text-foreground">
          {formatAtomicAmount(quote.outputAmount)} sats
        </span>
      </div>
      <div className="mt-1 flex flex-wrap justify-between gap-x-3 gap-y-1 text-[0.6875rem] text-muted-foreground">
        <span>
          {quote.quoteClass} · {quote.reservationClass} reservation
        </span>
        <span>fee {formatAtomicAmount(quote.maximumTotalFee)} sats</span>
        <span title={quote.reservationProof}>provider-signed capacity</span>
        <QuoteCountdown deadline={quote.effectiveAcceptanceDeadline} />
      </div>
    </div>
  )
}

function QuoteCountdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1_000))
  useEffect(() => {
    const timer = setInterval(
      () => setNow(Math.floor(Date.now() / 1_000)),
      1_000
    )
    return () => clearInterval(timer)
  }, [])
  const seconds = Math.max(0, deadline - now)
  return <span>expires in {seconds}s</span>
}

function RuntimePopover({
  mode,
  onModeChange,
  modeLocked,
  fundedConfig,
  fundedRuntime,
  status,
  provenance,
}: {
  mode: SwapMode
  onModeChange: (mode: SwapMode) => void
  modeLocked: boolean
  fundedConfig: FundedRegtestConfigResult
  fundedRuntime: FundedRuntimeState
  status: ImmortalRuntimeStatus
  provenance: ReturnType<typeof useImmortalRuntime>["provenance"]
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Swap settings"
        className="col-start-3 inline-flex size-9 items-center justify-center justify-self-end rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <BoltzCogIcon className="size-[1.3125rem]" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 rounded-xl bg-popover text-popover-foreground ring-border"
      >
        <PopoverHeader>
          <PopoverTitle>Swap settings</PopoverTitle>
          <PopoverDescription>
            Choose the local Immortal demonstration boundary explicitly.
          </PopoverDescription>
        </PopoverHeader>
        <label
          className="mb-1 block text-xs font-medium text-foreground"
          htmlFor="swap-mode"
        >
          Swap mode
        </label>
        <Select
          value={mode}
          disabled={modeLocked}
          onValueChange={(value) => {
            if (value === "no_spend" || value === "funded_regtest") {
              onModeChange(value)
            }
          }}
        >
          <SelectTrigger id="swap-mode" className="mb-2 w-full bg-secondary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no_spend">Demo · No-spend</SelectItem>
            <SelectItem
              value="funded_regtest"
              disabled={fundedConfig.state !== "ready"}
            >
              Regtest · Funded
            </SelectItem>
          </SelectContent>
        </Select>
        {mode === "no_spend" ? (
          <RuntimeDisclosure status={status} />
        ) : (
          <FundedRuntimeDisclosure runtime={fundedRuntime} />
        )}
        {fundedConfig.state === "unavailable" ? (
          <p className="mb-2 text-[0.6875rem] text-muted-foreground">
            Funded mode: {fundedConfig.detail}
          </p>
        ) : null}
        <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          {mode === "no_spend"
            ? "Verify route and recovery paths before funding"
            : "Only the displayed engine effect can be authorized"}
        </div>
        {mode === "no_spend" && provenance ? (
          <dl className="mt-2 space-y-1 rounded-lg border border-foreground/10 p-3 font-mono text-[0.625rem] text-muted-foreground">
            <div className="flex justify-between gap-3">
              <dt>ENGINE</dt>
              <dd title={provenance.engine.sourceRevision}>
                {provenance.engine.sourceRevision.slice(0, 8)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>RELAY</dt>
              <dd>{provenance.relay.directBrowserSocket ? "DIRECT" : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>AUTH</dt>
              <dd>{provenance.relay.nip42Authenticated ? "NIP-42" : "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>PROVIDERS</dt>
              <dd>{provenance.providers.length}</dd>
            </div>
          </dl>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function FundedRuntimeDisclosure({ runtime }: { runtime: FundedRuntimeState }) {
  const ready = runtime.state === "ready" || runtime.state === "complete"
  const danger = runtime.state === "error" || runtime.state === "unavailable"
  return (
    <div
      data-funded-runtime-state={runtime.state}
      role="status"
      aria-live="polite"
      className="mb-2 rounded-lg border border-border bg-secondary p-3 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span
          className={`size-2 rounded-full ${
            ready
              ? "bg-primary"
              : danger
                ? "bg-destructive"
                : "bg-muted-foreground"
          }`}
          aria-hidden="true"
        />
        Regtest bridge · {runtime.state}
      </div>
      <p className="mt-1 text-muted-foreground">{runtime.detail}</p>
    </div>
  )
}

function RuntimeDisclosure({ status }: { status: ImmortalRuntimeStatus }) {
  const label = {
    loading: "Engine loading",
    incompatible: "Engine incompatible",
    unavailable: "Demo unavailable",
    connecting: "Relay connecting",
    reconnecting: "Relay reconnecting",
    live: "Immortal live",
  }[status.state]
  const live = status.state === "live"
  const danger =
    status.state === "incompatible" || status.state === "unavailable"
  const detail = live ? runtimeDetail(status) : status.detail

  return (
    <div
      data-immortal-state={status.state}
      role="status"
      aria-live="polite"
      className="mb-2 rounded-lg border border-border bg-secondary p-3 text-xs"
    >
      <div className="flex items-center gap-2 font-semibold text-foreground">
        <span
          className={`size-2 rounded-full ${
            live
              ? "bg-primary"
              : danger
                ? "bg-destructive"
                : "bg-muted-foreground"
          }`}
          aria-hidden="true"
        />
        {label}
      </div>
      <p className="mt-1 text-muted-foreground">{detail}</p>
    </div>
  )
}

function runtimeDetail(status: ImmortalRuntimeStatus): string {
  if (status.state !== "live") return "Waiting for the local Immortal demo."
  return `${status.offeringCount} signed offerings · ${status.restoredSessionCount} restored sessions`
}

function directionByTicker(
  market: ImmortalMarketSnapshot,
  input: MarketAssetTicker,
  output: MarketAssetTicker
): MarketDirection | null {
  const inputAsset = market.assets.find((asset) => asset.ticker === input)
  const outputAsset = market.assets.find((asset) => asset.ticker === output)
  return inputAsset && outputAsset
    ? findDirection(market, inputAsset.id, outputAsset.id)
    : null
}

function uniqueAssets(assets: readonly MarketAsset[]): readonly MarketAsset[] {
  return [...new Map(assets.map((asset) => [asset.id, asset])).values()]
}

function directionHint(direction: MarketDirection | null): string {
  return direction
    ? `Min ${formatAtomicAmount(direction.minimum)} · Max ${formatAtomicAmount(direction.maximum)} sats`
    : "Direction unavailable"
}

function validateAmount(
  value: string,
  direction: MarketDirection | null
): { readonly valid: boolean; readonly detail: string } {
  if (!direction?.actionable) {
    return {
      valid: false,
      detail:
        direction?.unavailableReason ??
        "No active Offering supports this direction.",
    }
  }
  if (!/^(0|[1-9][0-9]*)$/.test(value)) {
    return { valid: false, detail: "Enter an amount in whole atomic units." }
  }
  const amount = BigInt(value)
  if (
    amount < BigInt(direction.minimum) ||
    amount > BigInt(direction.maximum)
  ) {
    return {
      valid: false,
      detail: `Current range is ${formatAtomicAmount(direction.minimum)}–${formatAtomicAmount(direction.maximum)} sats.`,
    }
  }
  return {
    valid: true,
    detail: "Amount is inside both providers' signed limits.",
  }
}

function cardStatus(
  status: ImmortalRuntimeStatus,
  direction: MarketDirection | null,
  amount: { readonly valid: boolean; readonly detail: string },
  quotes: QuoteState,
  lifecycle: DemoLifecycleState
): string {
  if (lifecycle.state !== "idle") return lifecycle.detail
  if (status.state !== "live") return status.detail
  if (!direction?.actionable) {
    return (
      direction?.unavailableReason ??
      "No active Offering supports this direction."
    )
  }
  if (!amount.valid) return amount.detail
  if (quotes.state === "ready") {
    return `${quotes.quotes.length} signed Quotes verified · best route selected`
  }
  return quotes.detail
}

function normalizeAtomicInput(value: string): string {
  const digits = value.replace(/\D/g, "")
  return digits.replace(/^0+(?=\d)/, "")
}
