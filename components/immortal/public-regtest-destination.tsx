"use client"

import { Badge } from "@/components/ui/badge"
import {
  BoltzDestinationInput,
  type BoltzDestinationKind,
  type BoltzDestinationStatus,
} from "@/components/boltz/destination-input"

export type RegtestDestinationError =
  | "wrong_network"
  | "malformed"
  | "expired"
  | "unsupported"
  | "zero_amount"
  | "over_limit"
  | "amount_mismatch"

const errorCopy: Record<RegtestDestinationError, string> = {
  wrong_network: "Use a bcrt1 regtest address or a regtest BOLT11 invoice.",
  malformed: "This destination could not be parsed.",
  expired: "This regtest invoice has expired.",
  unsupported: "This destination type is not available in the public demo.",
  zero_amount: "Enter an amount greater than zero.",
  over_limit: "This amount exceeds the current public demo limit.",
  amount_mismatch: "The invoice amount does not match the requested amount.",
}

export function PublicRegtestDestination({
  value,
  onValueChange,
  kind,
  status = "idle",
  error,
  disabled = false,
}: {
  value: string
  onValueChange: (value: string) => void
  kind?: BoltzDestinationKind
  status?: BoltzDestinationStatus
  error?: RegtestDestinationError
  disabled?: boolean
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Regtest destination</p>
        <Badge variant="outline">Public demo only</Badge>
      </div>
      <BoltzDestinationInput
        value={value}
        onValueChange={onValueChange}
        kind={kind}
        status={error ? "invalid" : status}
        error={error ? errorCopy[error] : undefined}
        placeholder="bcrt1 address or regtest BOLT11 invoice"
        disabled={disabled}
      />
      <div className="flex flex-wrap gap-1.5" aria-label="Destination support">
        <Badge variant="secondary">bcrt1 address</Badge>
        <Badge variant="secondary">BOLT11</Badge>
        <Badge variant="outline">BOLT12 unavailable</Badge>
        <Badge variant="outline">LNURL unavailable</Badge>
        <Badge variant="outline">Liquid unavailable</Badge>
      </div>
    </div>
  )
}
