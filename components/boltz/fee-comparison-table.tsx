import { ArrowRightIcon } from "lucide-react"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import { BoltzAssetIcon } from "./asset-selector"
import type { BoltzAsset } from "./types"

export type BoltzFeeOpportunity = {
  id: string
  from: BoltzAsset
  to: BoltzAsset
  optimizedFee: number
  regularFee: number
}

export function BoltzFeeComparisonTable({
  opportunities,
  onSelect,
}: {
  opportunities: BoltzFeeOpportunity[]
  onSelect?: (opportunity: BoltzFeeOpportunity) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Swap</TableHead>
            <TableHead className="text-right">Optimized</TableHead>
            <TableHead className="text-right">Regular</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opportunities.length ? (
            opportunities.map((opportunity) => {
              const savings = opportunity.regularFee - opportunity.optimizedFee
              return (
                <TableRow key={opportunity.id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onSelect?.(opportunity)}
                      className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Select ${opportunity.from.name} to ${opportunity.to.name}`}
                    >
                      <span className="flex -space-x-2">
                        <BoltzAssetIcon
                          asset={opportunity.from}
                          className="size-7"
                        />
                        <BoltzAssetIcon
                          asset={opportunity.to}
                          className="size-7"
                        />
                      </span>
                      <span className="flex items-center gap-1 text-xs font-semibold">
                        {opportunity.from.ticker}
                        <ArrowRightIcon className="size-3" />
                        {opportunity.to.ticker}
                      </span>
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        "font-mono text-xs font-semibold",
                        savings > 0 ? "text-primary" : "text-foreground"
                      )}
                    >
                      {opportunity.optimizedFee}%
                    </span>
                    {savings > 0 ? (
                      <span className="ml-1.5 text-[0.625rem] text-muted-foreground">
                        −{savings.toFixed(2)}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {opportunity.regularFee}%
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={3}
                className="h-24 text-center text-muted-foreground"
              >
                No lower-fee routes are currently available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
