"use client"

import Image from "next/image"
import {
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  TriangleAlertIcon,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { BoltzAssetIcon } from "./asset-selector"
import { BoltzCopyBox } from "./copy-box"
import { BoltzOptimizedRoute } from "./optimized-route"
import type { BoltzAsset } from "./types"

type CopyTarget = "amount" | "address" | "uri"

export function BoltzPaymentRequest({
  asset,
  amount,
  address,
  paymentUri,
  expiresAt,
  routeSavings,
}: {
  asset: BoltzAsset
  amount: string
  address: string
  paymentUri: string
  expiresAt?: string
  routeSavings?: string
}) {
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [copied, setCopied] = useState<CopyTarget>()

  useEffect(() => {
    let active = true
    void QRCode.toDataURL(paymentUri, { width: 300, margin: 1 })
      .then((url) => {
        if (active) setQrDataUrl(url)
      })
      .catch(() => {
        if (active) setQrDataUrl("")
      })
    return () => {
      active = false
    }
  }, [paymentUri])

  async function copy(target: CopyTarget, value: string) {
    await navigator.clipboard.writeText(value)
    setCopied(target)
    window.setTimeout(() => setCopied(undefined), 1600)
  }

  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-labelledby="boltz-payment-title"
    >
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Send exactly</p>
        <h3
          id="boltz-payment-title"
          className="mt-1 text-xl font-semibold tracking-tight text-foreground"
        >
          {amount} {asset.ticker}
        </h3>
      </div>

      {routeSavings ? (
        <div className="mt-3">
          <BoltzOptimizedRoute
            saved={routeSavings}
            asset="sats"
            description="A direct chain route avoids an extra Lightning and Liquid hop."
          />
        </div>
      ) : null}

      <a
        href={paymentUri}
        className="relative mx-auto mt-4 block size-52 overflow-hidden rounded-xl bg-white p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt={`Payment QR code for ${asset.name}`}
            width={192}
            height={192}
            unoptimized
          />
        ) : (
          <div
            className="size-full animate-pulse rounded-lg bg-black/10 motion-reduce:animate-none"
            aria-label="Generating payment QR code"
          />
        )}
        <span className="absolute top-1/2 left-1/2 grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white bg-background">
          <BoltzAssetIcon asset={asset} className="size-7 border-0" />
        </span>
      </a>

      <div className="mt-4">
        <BoltzCopyBox
          label={`${asset.name} address`}
          value={address}
          groupSize={asset.ticker === "LBTC" ? 4 : 5}
        />
      </div>

      {expiresAt ? (
        <p className="mt-3 flex items-start gap-2 text-[0.6875rem] leading-4 text-muted-foreground">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0 text-destructive" />
          Do not pay after {expiresAt}. Late payments may require manual
          recovery.
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-3 gap-2" aria-live="polite">
        {(
          [
            ["amount", "Amount", amount],
            ["address", "Address", address],
            ["uri", "Payment URI", paymentUri],
          ] as const
        ).map(([target, label, value]) => (
          <Button
            key={target}
            variant="outline"
            size="sm"
            onClick={() => copy(target, value)}
          >
            {copied === target ? <CheckIcon /> : <CopyIcon />}
            {copied === target ? "Copied" : label}
          </Button>
        ))}
      </div>

      <a
        href={paymentUri}
        className={cn(buttonVariants({ variant: "secondary" }), "mt-3 w-full")}
      >
        Open in wallet <ExternalLinkIcon />
      </a>
    </section>
  )
}
