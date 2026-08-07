"use client"

import { Skeleton } from "@/components/ui/skeleton"

export function BoltzSwapLimits({
  maximum,
  label,
  loading = false,
  disabled = false,
  onSelectMaximum,
}: {
  maximum: string
  label?: string
  loading?: boolean
  disabled?: boolean
  onSelectMaximum: (maximum: string) => void
}) {
  if (!loading && !maximum) return null

  return (
    <button
      type="button"
      aria-busy={loading}
      aria-label={label ?? `Use maximum amount ${maximum}`}
      disabled={loading || disabled || !maximum}
      onClick={() => onSelectMaximum(maximum)}
      className="inline-flex h-6 min-w-12 items-center justify-center rounded-full border border-border bg-card px-2 text-[0.6875rem] font-semibold text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {loading ? (
        <Skeleton className="h-2 w-7 motion-reduce:animate-none" />
      ) : (
        (label ?? "Max")
      )}
    </button>
  )
}
