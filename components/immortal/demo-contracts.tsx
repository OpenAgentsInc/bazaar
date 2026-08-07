import {
  Ban,
  Check,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Network,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function ImmortalNoSpendManifest() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network aria-hidden="true" className="size-4 text-primary" />
          Two-provider no-spend demo
        </CardTitle>
        <CardDescription>
          A public-safe manifest drives deterministic quote selection without
          exposing a spend surface.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">0 rail effects</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <ProviderPolicy
          name="provider-a"
          pubkey="9ec5…7a21"
          quoteLifetime="10 minutes"
          completionDiscount="None"
        />
        <ProviderPolicy
          name="provider-b"
          pubkey="0fb2…e814"
          quoteLifetime="7 minutes"
          completionDiscount="2 minutes"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <DemoClaim label="Distinct identities" />
          <DemoClaim label="Soft reservations" />
          <DemoClaim label="Atomic manifest" />
          <DemoClaim label="Restart-safe identity" />
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <KeyRound aria-hidden="true" className="size-4 text-emerald-500" />
        The manifest contains no private key, wallet credential, or node
        credential.
      </CardFooter>
    </Card>
  )
}

export function ImmortalFundedAdapterBoundary() {
  const refusals = [
    "mainnet",
    "non-loopback bind",
    "unapproved origin",
    "unknown method",
    "amount over 1,000,000 sats",
    "changed idempotency digest",
  ] as const

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WalletCards aria-hidden="true" className="size-4 text-primary" />
          Funded browser adapter
        </CardTitle>
        <CardDescription>
          An explicitly unsafe local-regtest bridge for the two host-owned
          wallet effects.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">127.0.0.1 only</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-border">
          <ContractRow label="Origin" value="http://127.0.0.1:3000" />
          <ContractRow label="Session" value="GET /v1/session" />
          <ContractRow label="Effects" value="POST /v1/effects" />
          <ContractRow label="Methods" value="fund BTC · pay LN" />
          <ContractRow label="Timeout bound" value="900 seconds" />
        </div>
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold">
            <Ban aria-hidden="true" className="size-3.5 text-destructive" />
            Hard refusals
          </p>
          <div className="flex flex-wrap gap-1.5">
            {refusals.map((refusal) => (
              <Badge
                key={refusal}
                variant="outline"
                className="text-[0.625rem]"
              >
                {refusal}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <LockKeyhole aria-hidden="true" className="size-4 text-emerald-500" />
        The adapter executes authorized effects; it never becomes a production
        wallet API.
      </CardFooter>
    </Card>
  )
}

export function ImmortalIdempotencyReceipt({
  sessionId,
  orderId,
  effectId,
  digest,
  replayed,
}: {
  sessionId: string
  orderId: string
  effectId: string
  digest: string
  replayed: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ReceiptText aria-hidden="true" className="size-4 text-primary" />
          Effect receipt binding
        </CardTitle>
        <CardDescription>
          Exact replays return the prior receipt; changed replays fail before a
          wallet action.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">
            {replayed ? "Exact replay" : "Admitted"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <ReceiptRow label="Session" value={sessionId} />
        <ReceiptRow label="Order" value={orderId} />
        <ReceiptRow label="Effect" value={effectId} />
        <ReceiptRow label="Digest" value={digest} />
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 text-emerald-500" />
        Bound to the SDK-issued FundingAuthorizationRequest.
      </CardFooter>
    </Card>
  )
}

function ProviderPolicy({
  name,
  pubkey,
  quoteLifetime,
  completionDiscount,
}: {
  name: string
  pubkey: string
  quoteLifetime: string
  completionDiscount: string
}) {
  return (
    <section className="rounded-xl border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Fingerprint aria-hidden="true" className="size-4 text-primary" />
          {name}
        </p>
        <code className="font-mono text-[0.6875rem] text-muted-foreground">
          {pubkey}
        </code>
      </div>
      <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Firm Quote · {quoteLifetime}</span>
        <span className="sm:text-right">
          Completion discount · {completionDiscount}
        </span>
      </div>
    </section>
  )
}

function DemoClaim({ label }: { label: string }) {
  return (
    <span className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs">
      <Check aria-hidden="true" className="size-3.5 text-emerald-500" />
      {label}
    </span>
  )
}

function ContractRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-3 border-b border-border px-3 py-2.5 text-xs last:border-b-0">
      <span className="text-muted-foreground">{label}</span>
      <code className="truncate text-right font-mono">{value}</code>
    </div>
  )
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <code className="truncate text-right font-mono">{value}</code>
    </div>
  )
}
