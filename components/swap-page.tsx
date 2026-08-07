"use client"

import { useState } from "react"
import {
  ArrowDownIcon,
  BitcoinIcon,
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

const assets = {
  LN: {
    label: "Lightning",
    destination: "Lightning invoice or address",
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

type Asset = keyof typeof assets

function AssetIcon({ asset }: { asset: Asset }) {
  const { Icon, iconClassName } = assets[asset]

  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full ${iconClassName}`}
    >
      <Icon className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
    </span>
  )
}

function AssetPicker({
  value,
  onValueChange,
  label,
}: {
  value: Asset
  onValueChange: (value: Asset) => void
  label: string
}) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue && nextValue in assets) {
          onValueChange(nextValue as Asset)
        }
      }}
    >
      <SelectTrigger
        aria-label={label}
        className="absolute bottom-3 left-2 z-10 h-11 w-auto max-w-[10rem] rounded-full border-foreground/15 bg-card px-1.5 pr-3 text-foreground shadow-none hover:bg-accent focus-visible:border-primary focus-visible:ring-primary/25"
      >
        <AssetIcon asset={value} />
        <SelectValue className="font-semibold uppercase">
          {assets[value].label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        alignItemWithTrigger={false}
        className="min-w-52 rounded-xl bg-popover text-popover-foreground ring-foreground/15"
      >
        {(Object.keys(assets) as Asset[]).map((asset) => (
          <SelectItem key={asset} value={asset}>
            <AssetIcon asset={asset} />
            <span>{assets[asset].label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function AmountField({
  side,
  amount,
  asset,
  onAmountChange,
  onAssetChange,
  showMax = false,
}: {
  side: "Send" | "Receive"
  amount: string
  asset: Asset
  onAmountChange: (value: string) => void
  onAssetChange: (value: Asset) => void
  showMax?: boolean
}) {
  return (
    <div className="relative overflow-visible rounded-xl bg-input ring-1 ring-foreground/15 transition-shadow focus-within:ring-primary/60">
      <label
        htmlFor={`${side.toLowerCase()}-amount`}
        className="pointer-events-none absolute top-2.5 left-3.5 z-10 text-[0.6875rem] font-bold text-muted-foreground uppercase"
      >
        {side}
      </label>
      {showMax ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          disabled
          className="absolute top-2 right-2 z-10 h-5 rounded-full border border-foreground/10 px-2 text-[0.625rem] font-semibold text-muted-foreground uppercase hover:border-foreground/25 hover:bg-card hover:text-foreground"
        >
          Max
        </Button>
      ) : null}
      <AssetPicker
        value={asset}
        onValueChange={onAssetChange}
        label={`Select asset to ${side.toLowerCase()}`}
      />
      <Input
        id={`${side.toLowerCase()}-amount`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0"
        value={amount}
        onChange={(event) => onAmountChange(event.target.value)}
        className="h-24 rounded-xl border-0 bg-transparent pt-7 pr-3.5 pb-6 pl-44 text-right text-[2rem] leading-none font-normal tracking-tight text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0 md:text-[2rem]"
      />
      <span className="pointer-events-none absolute right-3.5 bottom-1.5 text-[0.6875rem] text-muted-foreground">
        $0.00
      </span>
    </div>
  )
}

export function SwapPage({ config }: { config: ImmortalConfigResult }) {
  const [sendAsset, setSendAsset] = useState<Asset>("LN")
  const [receiveAsset, setReceiveAsset] = useState<Asset>("BTC")
  const [sendAmount, setSendAmount] = useState("")
  const [receiveAmount, setReceiveAmount] = useState("")
  const [destination, setDestination] = useState("")
  const { status, provenance } = useImmortalRuntime(config)

  function changeSendAsset(nextAsset: Asset) {
    if (nextAsset === receiveAsset) {
      setReceiveAsset(sendAsset)
    }
    setSendAsset(nextAsset)
  }

  function changeReceiveAsset(nextAsset: Asset) {
    if (nextAsset === sendAsset) {
      setSendAsset(receiveAsset)
    }
    setReceiveAsset(nextAsset)
  }

  function reverseSwap() {
    setSendAsset(receiveAsset)
    setReceiveAsset(sendAsset)
    setSendAmount(receiveAmount)
    setReceiveAmount(sendAmount)
    setDestination("")
  }

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
        </CardHeader>

        <CardContent className="px-4 pt-2 pb-5 sm:px-5 sm:pb-5">
          <form onSubmit={(event) => event.preventDefault()}>
            <div className="relative space-y-3">
              <AmountField
                side="Send"
                amount={sendAmount}
                asset={sendAsset}
                onAmountChange={setSendAmount}
                onAssetChange={changeSendAsset}
                showMax
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Reverse swap direction"
                onClick={reverseSwap}
                className="absolute top-1/2 left-1/2 z-20 size-8 -translate-x-1/2 -translate-y-1/2 rounded-md border-foreground/15 bg-card text-muted-foreground shadow-[0_2px_6px_oklch(0_0_0/0.35)] hover:border-foreground/25 hover:bg-accent hover:text-foreground"
              >
                <ArrowDownIcon className="size-3.5" aria-hidden="true" />
              </Button>

              <AmountField
                side="Receive"
                amount={receiveAmount}
                asset={receiveAsset}
                onAmountChange={setReceiveAmount}
                onAssetChange={changeReceiveAsset}
              />
            </div>

            <Collapsible className="mt-4">
              <div className="flex items-start justify-between gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 pt-0.5 font-mono">
                  <span className="text-base text-foreground">₿</span>
                  <span className="text-primary">sats</span>
                </div>
                <CollapsibleTrigger className="group flex items-start gap-1 text-right outline-none hover:text-foreground focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring">
                  <span>
                    <span className="block">Network fee · —</span>
                    <span className="block">Provider fee (0.5%) · —</span>
                  </span>
                  <ChevronRightIcon className="mt-0.5 size-3.5 transition-transform duration-200 group-data-panel-open:rotate-90 motion-reduce:transition-none" />
                </CollapsibleTrigger>
              </div>
              <CollapsibleContent className="pt-2 text-right text-xs text-muted-foreground">
                Route and provider details appear after a quote is available.
              </CollapsibleContent>
            </Collapsible>

            <Separator className="my-4 bg-foreground/10" />

            <label htmlFor="destination" className="sr-only">
              {assets[receiveAsset].destination}
            </label>
            <Input
              id="destination"
              type="text"
              autoComplete="off"
              value={destination}
              onChange={(event) => setDestination(event.target.value)}
              placeholder={assets[receiveAsset].destination}
              className="h-12 rounded-xl border-foreground/15 bg-input text-center text-sm placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/25"
            />

            <Separator className="my-4 bg-foreground/10" />

            <Button
              type="submit"
              size="lg"
              disabled
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
  const danger = status.state === "incompatible" || status.state === "unavailable"
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
            live ? "bg-primary" : danger ? "bg-destructive" : "bg-muted-foreground"
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
