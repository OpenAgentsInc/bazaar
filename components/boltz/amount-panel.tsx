"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { BoltzAssetSelector } from "./asset-selector"
import type { BoltzAsset } from "./types"

export function BoltzAmountPanel({
  side,
  asset,
  assets,
  value,
  onValueChange,
  onAssetChange,
  onMax,
  hint,
  loading = false,
  invalid = false,
  readOnly = false,
}: {
  side: "Send" | "Receive"
  asset: BoltzAsset
  assets?: BoltzAsset[]
  value: string
  onValueChange?: (value: string) => void
  onAssetChange: (asset: BoltzAsset) => void
  onMax?: () => void
  hint?: string
  loading?: boolean
  invalid?: boolean
  readOnly?: boolean
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border bg-secondary p-3",
        invalid && "border-destructive/60"
      )}
      aria-label={`${side} amount`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[0.6875rem] font-bold tracking-wide text-muted-foreground uppercase">
          {side}
        </span>
        {onMax ? (
          <button
            type="button"
            onClick={onMax}
            className="rounded-full border border-border bg-card px-2 py-0.5 text-[0.6875rem] font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            Max
          </button>
        ) : null}
      </div>
      <div className="flex items-end gap-3">
        <BoltzAssetSelector
          value={asset}
          assets={assets}
          onValueChange={onAssetChange}
          label={`Select ${side.toLowerCase()} asset`}
        />
        <div className="min-w-0 flex-1 text-right">
          {loading ? (
            <Skeleton className="ml-auto h-9 w-36 motion-reduce:animate-none" />
          ) : (
            <input
              value={value}
              onChange={(event) => onValueChange?.(event.target.value)}
              readOnly={readOnly}
              inputMode="decimal"
              aria-label={`${side} amount in ${asset.ticker}`}
              aria-invalid={invalid}
              placeholder="0"
              className="h-10 w-full bg-transparent text-right text-3xl leading-none tracking-tight text-foreground outline-none placeholder:text-muted-foreground/55 focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring"
            />
          )}
          <p
            className={cn(
              "mt-1 truncate text-xs text-muted-foreground",
              invalid && "text-destructive"
            )}
          >
            {hint ?? "Quote updates as the amount changes"}
          </p>
        </div>
      </div>
    </section>
  )
}
