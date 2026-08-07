"use client"

import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  ScanLineIcon,
} from "lucide-react"
import { useId } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type BoltzDestinationStatus = "idle" | "validating" | "valid" | "invalid"
export type BoltzDestinationKind = "address" | "invoice" | "offer" | "lnurl"

const kindLabels: Record<BoltzDestinationKind, string> = {
  address: "On-chain address",
  invoice: "BOLT11 invoice",
  offer: "BOLT12 offer",
  lnurl: "Lightning address or LNURL",
}

export function BoltzDestinationInput({
  value,
  onValueChange,
  kind,
  status = "idle",
  error,
  placeholder = "Paste an address, invoice, offer, or LNURL",
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  kind?: BoltzDestinationKind
  status?: BoltzDestinationStatus
  error?: string
  placeholder?: string
  disabled?: boolean
}) {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const invalid = status === "invalid"
  const description = invalid
    ? error
    : kind
      ? `${kindLabels[kind]} detected`
      : "The destination type is detected from what you paste."

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-xs font-semibold text-foreground"
      >
        Destination
      </label>
      <div className="relative">
        <Input
          id={inputId}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          disabled={disabled}
          aria-invalid={invalid}
          aria-describedby={descriptionId}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          className="h-11 pe-10 font-mono text-xs"
        />
        <span
          className={cn(
            "absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground",
            status === "valid" && "text-primary",
            invalid && "text-destructive"
          )}
          aria-hidden="true"
        >
          {status === "validating" ? (
            <LoaderCircleIcon className="size-4 animate-spin motion-reduce:animate-none" />
          ) : status === "valid" ? (
            <CheckCircle2Icon className="size-4" />
          ) : invalid ? (
            <AlertCircleIcon className="size-4" />
          ) : (
            <ScanLineIcon className="size-4" />
          )}
        </span>
      </div>
      <p
        id={descriptionId}
        className={cn(
          "mt-1.5 text-[0.6875rem] text-muted-foreground",
          invalid && "text-destructive"
        )}
        aria-live="polite"
      >
        {status === "validating" ? "Validating destination…" : description}
      </p>
    </div>
  )
}
