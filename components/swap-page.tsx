"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowDownIcon,
  BitcoinIcon,
  CheckIcon,
  ChevronRightIcon,
  DropletsIcon,
  Settings2Icon,
  ShieldCheckIcon,
  ZapIcon,
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
import type {
  ImmortalConfigResult,
  ImmortalRuntimeStatus,
} from "@/lib/immortal/config"
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

const assetUi = {
  LN: {
    label: "Lightning",
    destination: "Lightning invoice or Lightning address",
    Icon: ZapIcon,
    iconClassName: "bg-primary text-primary-foreground",
  },
  BTC: {
    label: "Bitcoin",
    destination: "Bitcoin address",
    Icon: BitcoinIcon,
    iconClassName: "bg-[oklch(0.7523_0.1663_62.59)] text-white",
  },
  LBTC: {
    label: "Liquid BTC",
    destination: "Liquid address",
    Icon: DropletsIcon,
    iconClassName: "bg-[oklch(0.638_0.122_222)] text-white",
  },
} as const

function AssetIcon({ ticker }: { ticker: MarketAssetTicker }) {
  const { Icon, iconClassName } = assetUi[ticker]

  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
    >
      <Icon className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
    </span>
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
        className="absolute bottom-3 left-2 z-10 h-11 w-auto max-w-[10rem] rounded-full border-foreground/15 bg-card px-1.5 pr-3 text-foreground shadow-none hover:bg-accent focus-visible:border-primary focus-visible:ring-primary/25 disabled:opacity-60"
      >
        <AssetIcon ticker={ticker} />
        <SelectValue className="font-semibold uppercase">
          {assetUi[ticker].label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-52 rounded-xl bg-popover text-popover-foreground ring-foreground/15"
      >
        {options.map((asset) => (
          <SelectItem key={asset.id} value={asset.ticker}>
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
      className={`relative overflow-visible rounded-xl bg-input ring-1 transition-shadow ${
        invalid
          ? "ring-destructive/70"
          : "ring-foreground/15 focus-within:ring-primary/60"
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
        className="h-24 rounded-xl border-0 bg-transparent pt-7 pr-3.5 pb-6 pl-44 text-right text-[2rem] leading-none font-normal tracking-tight text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 md:text-[2rem]"
      />
      <span className="pointer-events-none absolute right-3.5 bottom-1.5 max-w-[15rem] truncate text-[0.6875rem] text-muted-foreground">
        {hint}
      </span>
    </div>
  )
}

export function SwapPage({ config }: { config: ImmortalConfigResult }) {
  const [sendTicker, setSendTicker] = useState<MarketAssetTicker>("LN")
  const [receiveTicker, setReceiveTicker] = useState<MarketAssetTicker>("BTC")
  const [sendAmount, setSendAmount] = useState("")
  const [destination, setDestination] = useState("")
  const { status, provenance, market, quotes, requestQuotes, resetQuotes } =
    useImmortalRuntime(config)

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

  return (
    <main className="dark flex min-h-svh justify-center bg-background px-0 py-0 text-foreground sm:px-6 sm:py-16">
      <Card className="relative w-full max-w-[31rem] gap-0 self-start rounded-none bg-card py-0 shadow-none ring-foreground/15 sm:rounded-2xl">
        <CardHeader className="relative px-4 pt-5 pb-1 sm:px-5 sm:pt-5">
          <span className="absolute top-5 left-4 rounded border border-foreground/15 px-1.5 py-0.5 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground sm:left-5">
            REGTEST
          </span>
          <CardTitle
            role="heading"
            aria-level={1}
            className="text-center text-xl font-bold tracking-tight"
          >
            Create Swap
          </CardTitle>
          <RuntimePopover status={status} provenance={provenance} />
        </CardHeader>

        <CardContent className="px-4 pt-2 pb-5 sm:px-5 sm:pb-5">
          <form onSubmit={(event) => event.preventDefault()}>
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
                className="absolute top-1/2 left-1/2 z-20 size-8 -translate-x-1/2 -translate-y-1/2 rounded-md border-foreground/15 bg-card text-muted-foreground shadow-[0_2px_6px_oklch(0_0_0/0.35)] hover:border-foreground/25 hover:bg-accent hover:text-foreground disabled:bg-card disabled:opacity-50"
              >
                <ArrowDownIcon className="size-3.5" aria-hidden="true" />
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

            <QuoteSummary quotes={quotes} direction={direction} />

            <p
              role="status"
              aria-live="polite"
              className="mt-3 min-h-4 text-center text-xs text-muted-foreground"
            >
              {cardStatus(status, direction, amountState, quotes)}
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
              onChange={(event) => setDestination(event.target.value)}
              placeholder={`Enter ${destinationLabel.toLowerCase()} to receive funds`}
              className="h-12 rounded-xl border-foreground/15 bg-input text-center text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/25"
            />

            <Separator className="my-4 bg-foreground/10" />

            <Button
              type="submit"
              size="lg"
              disabled={!canCreate}
              className="h-11 w-full rounded-xl bg-primary font-bold text-primary-foreground hover:bg-primary/85 disabled:bg-[oklch(0.471_0.0177_251.32)] disabled:text-background disabled:opacity-100"
            >
              Create Swap
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
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
          <span className="text-base text-foreground">₿</span>
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
  status,
  provenance,
}: {
  status: ImmortalRuntimeStatus
  provenance: ReturnType<typeof useImmortalRuntime>["provenance"]
}) {
  return (
    <Popover>
      <PopoverTrigger
        aria-label="Swap settings"
        className="absolute top-4 right-4 inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <Settings2Icon className="size-5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 rounded-xl bg-popover text-popover-foreground ring-foreground/15"
      >
        <PopoverHeader>
          <PopoverTitle>Swap settings</PopoverTitle>
          <PopoverDescription>
            Immortal runs in this browser and connects straight to the
            configured relay.
          </PopoverDescription>
        </PopoverHeader>
        <RuntimeDisclosure status={status} />
        <div className="flex items-center gap-2 rounded-lg bg-input p-3 text-xs text-muted-foreground">
          <ShieldCheckIcon className="size-4 shrink-0 text-primary" />
          Verify route and recovery paths before funding
        </div>
        {provenance ? (
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
      className="mb-2 rounded-lg border border-foreground/10 bg-input p-3 text-xs"
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
  quotes: QuoteState
): string {
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
