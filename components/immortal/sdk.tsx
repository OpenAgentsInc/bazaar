import {
  AlertTriangle,
  Box,
  CheckCircle2,
  CircleDashed,
  Cpu,
  Database,
  FileKey2,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Radio,
  ShieldCheck,
  WalletCards,
  XCircle,
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
import { cn } from "@/lib/utils"

export type ImmortalEngineState = "loading" | "ready" | "incompatible"

export function ImmortalEngineStatus({
  state,
  detail,
}: {
  state: ImmortalEngineState
  detail: string
}) {
  const Icon =
    state === "ready"
      ? CheckCircle2
      : state === "incompatible"
        ? XCircle
        : CircleDashed
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <Icon
        aria-hidden="true"
        className={cn(
          "mt-0.5 size-5 shrink-0",
          state === "ready" && "text-emerald-500",
          state === "incompatible" && "text-destructive",
          state === "loading" &&
            "animate-spin text-primary motion-reduce:animate-none"
        )}
      />
      <div>
        <p className="text-sm font-semibold">
          {state === "ready"
            ? "Requester engine ready"
            : state === "loading"
              ? "Loading requester engine"
              : "Requester engine incompatible"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

export function ImmortalSdkMetadata({
  sourceRevision,
  requesterApiSha256,
  wasmSha256,
  operations = 16,
}: {
  sourceRevision: string
  requesterApiSha256: string
  wasmSha256: string
  operations?: number
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cpu aria-hidden="true" className="size-4 text-primary" />
          Immortal browser SDK
        </CardTitle>
        <CardDescription>
          Pinned WASM requester engine behind a bounded TypeScript ABI.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">ABI v1</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <SdkRow
          label="Schema"
          value="openagents.immortal.mkt-swp.browser-abi.v1"
        />
        <SdkRow label="Source revision" value={sourceRevision} mono />
        <SdkRow label="Requester API" value={requesterApiSha256} mono />
        <SdkRow label="WASM digest" value={wasmSha256} mono />
        <SdkRow label="Request bound" value="2 MiB" />
        <SdkRow label="Response bound" value="8 MiB" />
      </CardContent>
      <CardFooter className="justify-between border-t text-xs text-muted-foreground">
        <span>{operations} typed operations</span>
        <span>0 WASM imports · host-owned custody</span>
      </CardFooter>
    </Card>
  )
}

export const IMMORTAL_SDK_OPERATIONS = [
  ["metadata", "Runtime identity and ABI bounds"],
  ["validate_offering", "Public provider Offering validation"],
  ["validate_delivery", "Exact private delivery provenance"],
  ["verify_signed", "Signed Nostr record verification"],
  ["requester_rfq", "Requester RFQ signing request"],
  ["requester_order", "Selected Quote Order request"],
  ["requester_contract_draft", "Unsigned exact contract draft"],
  ["requester_contract", "Requester contract signing request"],
  ["requester_cancel", "Causal cancellation request"],
  ["requester_close", "Terminal requester Close"],
  ["exit_package_inspect", "Keyless recovery package inspection"],
  ["session_create", "Create from signed record prefix"],
  ["session_ingest", "Advance a durable session"],
  ["session_restore", "Restore and revalidate snapshot"],
  ["prepare_funding_request", "Exact host effect request"],
  ["verify_before_fund", "Authorize only the prepared effect"],
] as const

export function ImmortalSdkOperations() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Browser ABI operations</CardTitle>
        <CardDescription>
          The host invokes typed JSON operations; raw WASM pointers never cross
          the boundary.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">{IMMORTAL_SDK_OPERATIONS.length}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border">
          {IMMORTAL_SDK_OPERATIONS.map(([operation, description]) => (
            <div
              key={operation}
              className="grid gap-1 border-b border-border px-3 py-2.5 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4"
            >
              <code className="font-mono text-xs text-primary">
                {operation}
              </code>
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

const hostAuthorities = [
  ["Entropy", KeyRound],
  ["Nostr signing", Fingerprint],
  ["Gift wrapping", FileKey2],
  ["Relay transport", Radio],
  ["Snapshot storage", Database],
  ["Wallet actions", WalletCards],
  ["Rail observation", ShieldCheck],
] as const

export function ImmortalHostAuthorityBoundary() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Host authority boundary</CardTitle>
        <CardDescription>
          The engine verifies intent. The embedding application retains every
          secret and external effect.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <section
            className="rounded-xl border border-border p-3"
            aria-label="Engine authority"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Box aria-hidden="true" className="size-4 text-primary" />
              Engine-owned authority
            </div>
            <p className="mt-2 text-2xl font-semibold">None</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No wallet, signing key, relay socket, or rail credential enters
              WASM.
            </p>
          </section>
          <section
            className="rounded-xl border border-border p-3"
            aria-label="Host authority"
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LockKeyhole
                aria-hidden="true"
                className="size-4 text-emerald-500"
              />
              Host-owned capabilities
            </div>
            <ul className="mt-2 space-y-1.5">
              {hostAuthorities.map(([label, Icon]) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-xs text-muted-foreground"
                >
                  <Icon aria-hidden="true" className="size-3.5" />
                  {label}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </CardContent>
    </Card>
  )
}

export function ImmortalSdkError({
  code,
  detail,
}: {
  code: string
  detail: string
}) {
  return (
    <div
      role="alert"
      className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3"
    >
      <AlertTriangle
        aria-hidden="true"
        className="mt-0.5 size-5 shrink-0 text-destructive"
      />
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-destructive">
            SDK request refused
          </p>
          <Badge variant="destructive" className="font-mono text-[0.625rem]">
            {code}
          </Badge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

function SdkRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "min-w-0 truncate text-right font-medium",
          mono && "font-mono"
        )}
      >
        {value}
      </span>
    </div>
  )
}
