"use client"

import Image from "next/image"
import { CheckIcon, ChevronDownIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { boltzAssets, type BoltzAsset } from "./types"

export function BoltzAssetIcon({
  asset,
  className,
}: {
  asset: BoltzAsset
  className?: string
}) {
  return (
    <span
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full border border-border bg-background",
        className
      )}
    >
      <Image src={asset.iconSrc} alt="" width={20} height={20} />
    </span>
  )
}

export function BoltzAssetSelector({
  value,
  onValueChange,
  assets = boltzAssets,
  label = "Select asset",
}: {
  value: BoltzAsset
  onValueChange: (asset: BoltzAsset) => void
  assets?: BoltzAsset[]
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const filteredAssets = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return assets
    return assets.filter((asset) =>
      `${asset.ticker} ${asset.name} ${asset.network}`
        .toLowerCase()
        .includes(normalized)
    )
  }, [assets, query])

  function selectAsset(asset: BoltzAsset) {
    if (asset.disabled) return
    onValueChange(asset)
    setOpen(false)
    setQuery("")
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            className="h-10 rounded-full bg-card ps-1 pe-2.5"
            aria-label={`${label}: ${value.name}`}
          />
        }
      >
        <BoltzAssetIcon asset={value} className="size-7" />
        <span className="font-semibold">{value.ticker}</span>
        <ChevronDownIcon className="size-3.5 text-muted-foreground" />
      </DialogTrigger>
      <DialogContent className="gap-4 sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Choose the settlement rail and network for this side of the swap.
          </DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search assets and networks"
            className="h-10 ps-9"
            aria-label="Search assets and networks"
          />
        </div>
        <div
          className="grid gap-2 sm:grid-cols-2"
          role="listbox"
          aria-label={label}
        >
          {filteredAssets.map((asset) => {
            const selected = asset.ticker === value.ticker
            return (
              <button
                key={asset.ticker}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={asset.disabled}
                onClick={() => selectAsset(asset)}
                className={cn(
                  "flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors outline-none hover:bg-muted focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-45",
                  selected && "border-primary/50 bg-primary/5"
                )}
              >
                <BoltzAssetIcon asset={asset} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-foreground">
                    {asset.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {asset.ticker} · {asset.network}
                  </span>
                </span>
                {selected ? (
                  <CheckIcon
                    className="size-4 text-primary"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            )
          })}
          {filteredAssets.length === 0 ? (
            <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
              No matching assets.
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
