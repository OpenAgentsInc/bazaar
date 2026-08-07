"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

function groupedValue(value: string, groupSize: number) {
  return value.match(new RegExp(`.{1,${groupSize}}`, "g")) ?? [value]
}

export function BoltzCopyBox({
  label,
  value,
  groupSize = 4,
}: {
  label: string
  value: string
  groupSize?: number
}) {
  const [copied, setCopied] = useState(false)
  const groups = groupedValue(value, groupSize)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="group w-full rounded-xl border border-border bg-card p-3 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={`Copy ${label}`}
    >
      <span className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-foreground">
        {label}
        <span
          className="flex items-center gap-1 text-[0.6875rem] text-muted-foreground"
          aria-live="polite"
        >
          {copied ? (
            <CheckIcon className="size-3.5 text-primary" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied ? "Copied" : "Copy"}
        </span>
      </span>
      <span className="flex flex-wrap gap-x-1 gap-y-0.5 font-mono text-xs leading-5">
        {groups.map((group, index) => (
          <span
            key={`${group}-${index}`}
            className={cn(
              "text-muted-foreground",
              (index === 0 || index === groups.length - 1) &&
                "font-semibold text-foreground"
            )}
          >
            {group}
          </span>
        ))}
      </span>
    </button>
  )
}
