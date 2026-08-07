import { CircleHelpIcon, SparklesIcon } from "lucide-react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function BoltzOptimizedRoute({
  saved,
  asset,
  description,
}: {
  saved: string
  asset: string
  description: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs text-foreground">
      <SparklesIcon
        className="size-4 shrink-0 text-primary"
        aria-hidden="true"
      />
      <span className="flex-1">
        Optimized route saves <strong>{saved}</strong> {asset}
      </span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger
            aria-label="How this route is optimized"
            className="rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CircleHelpIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="top">{description}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
