import { ChevronRightIcon, EyeOffIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"

import { BoltzAssetIcon } from "./asset-selector"
import type { BoltzAsset } from "./types"

export type BoltzSwapHistoryItem = {
  id: string
  createdAt: string
  from: BoltzAsset
  to: BoltzAsset
  amount: string
  status: string
  private?: boolean
}

export function BoltzSwapHistory({
  items,
  onSelect,
}: {
  items: BoltzSwapHistoryItem[]
  onSelect?: (item: BoltzSwapHistoryItem) => void
}) {
  return (
    <section aria-labelledby="boltz-swap-history-title">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3
          id="boltz-swap-history-title"
          className="text-sm font-semibold text-foreground"
        >
          Recent swaps
        </h3>
        <span className="text-xs text-muted-foreground">
          {items.length} total
        </span>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect?.(item)}
            className="flex w-full items-center gap-3 p-3 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            <span className="flex -space-x-2">
              <BoltzAssetIcon asset={item.from} className="size-8" />
              <BoltzAssetIcon asset={item.to} className="size-8" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                {item.from.ticker} → {item.to.ticker}
                {item.private ? (
                  <EyeOffIcon
                    className="size-3 text-muted-foreground"
                    aria-label="Private swap"
                  />
                ) : null}
              </span>
              <span className="block truncate font-mono text-[0.6875rem] text-muted-foreground">
                {item.id} · {item.createdAt}
              </span>
            </span>
            <span className="text-right">
              <span className="block font-mono text-xs text-foreground">
                {item.amount}
              </span>
              <Badge variant="outline" className="mt-1">
                {item.status}
              </Badge>
            </span>
            <ChevronRightIcon className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </section>
  )
}
