"use client"

import { ChevronRightIcon } from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export type BoltzFeeItem = {
  label: string
  value: string
  detail?: string
}

export function BoltzFeeBreakdown({
  total,
  items,
  denomination = "sats",
}: {
  total: string
  items: BoltzFeeItem[]
  denomination?: string
}) {
  return (
    <Collapsible className="rounded-xl border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">
        <span>
          <span className="block text-xs font-semibold text-foreground">
            Fees
          </span>
          <span className="block text-[0.6875rem] text-muted-foreground">
            Network and service costs
          </span>
        </span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          {total} {denomination}
          <ChevronRightIcon className="size-3.5 transition-transform group-data-panel-open:rotate-90 motion-reduce:transition-none" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border px-3 py-2">
        <dl className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.label}
              className="flex items-start justify-between gap-4 py-2 text-xs"
            >
              <dt>
                <span className="block text-foreground">{item.label}</span>
                {item.detail ? (
                  <span className="block text-[0.6875rem] text-muted-foreground">
                    {item.detail}
                  </span>
                ) : null}
              </dt>
              <dd className="shrink-0 font-mono text-foreground">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}
