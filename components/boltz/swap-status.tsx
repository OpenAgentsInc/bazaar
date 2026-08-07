import {
  AlertTriangleIcon,
  CheckIcon,
  CircleIcon,
  LoaderCircleIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export type BoltzSwapStage = {
  label: string
  detail?: string
  state: "complete" | "current" | "pending" | "failed"
}

function StageIcon({ state }: { state: BoltzSwapStage["state"] }) {
  if (state === "complete") return <CheckIcon className="size-3" />
  if (state === "current")
    return (
      <LoaderCircleIcon className="size-3 animate-spin motion-reduce:animate-none" />
    )
  if (state === "failed") return <AlertTriangleIcon className="size-3" />
  return <CircleIcon className="size-2.5" />
}

export function BoltzSwapStatus({
  title,
  status,
  stages,
}: {
  title: string
  status: string
  stages: BoltzSwapStage[]
}) {
  return (
    <section
      className="rounded-xl border border-border bg-card p-4"
      aria-label="Swap progress"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <Badge variant="outline">{status}</Badge>
      </div>
      <ol className="space-y-0">
        {stages.map((stage, index) => (
          <li key={stage.label} className="grid grid-cols-[1.25rem_1fr] gap-2">
            <span className="flex flex-col items-center" aria-hidden="true">
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border border-border bg-secondary text-muted-foreground",
                  stage.state === "complete" &&
                    "border-primary bg-primary text-primary-foreground",
                  stage.state === "current" && "border-primary text-primary",
                  stage.state === "failed" &&
                    "border-destructive text-destructive"
                )}
              >
                <StageIcon state={stage.state} />
              </span>
              {index < stages.length - 1 ? (
                <span className="h-8 w-px bg-border" />
              ) : null}
            </span>
            <span className="pb-3">
              <span
                className={cn(
                  "block text-xs font-semibold text-muted-foreground",
                  stage.state !== "pending" && "text-foreground"
                )}
              >
                {stage.label}
              </span>
              {stage.detail ? (
                <span className="block text-[0.6875rem] text-muted-foreground">
                  {stage.detail}
                </span>
              ) : null}
              <span className="sr-only">Status: {stage.state}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
