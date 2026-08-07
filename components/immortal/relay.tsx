import {
  Check,
  CheckCircle2,
  CircleDashed,
  Database,
  FileKey2,
  Fingerprint,
  Globe2,
  LockKeyhole,
  Radio,
  RefreshCw,
  ShieldCheck,
  WifiOff,
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
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export type ImmortalRelayStage =
  "connecting" | "authenticating" | "snapshot" | "live" | "closed"

const relayStages: readonly {
  id: ImmortalRelayStage
  label: string
  detail: string
}[] = [
  { id: "connecting", label: "Connect", detail: "Open direct browser WSS" },
  {
    id: "authenticating",
    label: "Authenticate",
    detail: "Answer NIP-42 challenge",
  },
  { id: "snapshot", label: "Snapshot", detail: "Wait for both EOSE barriers" },
  { id: "live", label: "Live", detail: "Fold verified events incrementally" },
]

export function ImmortalRelayConnection({
  stage,
  relayUrl,
  reconnectAttempt,
}: {
  stage: ImmortalRelayStage
  relayUrl: string
  reconnectAttempt?: number
}) {
  const closed = stage === "closed"
  const activeIndex = relayStages.findIndex((item) => item.id === stage)
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {closed ? (
            <WifiOff aria-hidden="true" className="size-4 text-destructive" />
          ) : (
            <Radio aria-hidden="true" className="size-4 text-primary" />
          )}
          Direct relay session
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          {relayUrl}
        </CardDescription>
        <CardAction>
          <Badge
            variant={
              closed
                ? "destructive"
                : stage === "live"
                  ? "secondary"
                  : "outline"
            }
          >
            {reconnectAttempt ? `Reconnect ${reconnectAttempt}` : stage}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {relayStages.map((item, index) => {
            const complete =
              !closed && (stage === "live" || index < activeIndex)
            const active = !closed && index === activeIndex
            return (
              <li
                key={item.id}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-2.5"
              >
                <span
                  className={cn(
                    "mt-0.5 grid size-5 place-items-center rounded-full border text-[0.625rem]",
                    complete && "border-emerald-500 bg-emerald-500 text-black",
                    active && "border-primary text-primary",
                    !complete &&
                      !active &&
                      "border-border text-muted-foreground"
                  )}
                >
                  {complete ? (
                    <Check aria-hidden="true" className="size-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                {active ? (
                  <CircleDashed
                    aria-hidden="true"
                    className="mt-1 size-3.5 animate-spin text-primary motion-reduce:animate-none"
                  />
                ) : null}
              </li>
            )
          })}
        </ol>
        {closed ? (
          <p className="mt-3 rounded-lg bg-destructive/8 px-3 py-2 text-xs text-destructive">
            Last completed snapshot retained. New events are not current.
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function ImmortalRelayIdentity({
  version,
  relayPubkey,
  contractSha256,
  extensions,
}: {
  version: string
  relayPubkey: string
  contractSha256: string
  extensions: readonly string[]
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Fingerprint aria-hidden="true" className="size-4 text-primary" />
          Relay identity
        </CardTitle>
        <CardDescription>
          NIP-11 is checked before the browser opens its socket.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">Pinned</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <RelayRow label="Software" value="github.com/OpenAgentsInc/immortal" />
        <RelayRow label="Version" value={version} />
        <RelayRow label="Relay pubkey" value={relayPubkey} mono />
        <RelayRow label="Contract digest" value={contractSha256} mono />
        <RelayRow label="Required NIPs" value="01 · 11 · 42 · 59" />
      </CardContent>
      <CardFooter className="flex-wrap gap-1.5 border-t">
        {extensions.map((extension) => (
          <Badge
            key={extension}
            variant="outline"
            className="font-mono text-[0.625rem]"
          >
            {extension}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  )
}

export function ImmortalSnapshotBarrier({
  publicEvents,
  privateEvents,
  publicEose,
  privateEose,
}: {
  publicEvents: number
  privateEvents: number
  publicEose: boolean
  privateEose: boolean
}) {
  const complete = publicEose && privateEose
  const progress = (Number(publicEose) + Number(privateEose)) * 50
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>EOSE snapshot barrier</CardTitle>
        <CardDescription>
          Events remain provisional until both bounded subscriptions reach
          end-of-stored-events.
        </CardDescription>
        <CardAction>
          <Badge variant={complete ? "secondary" : "outline"}>
            {complete ? "Canonical" : "Provisional"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
        <SnapshotLane
          icon={Globe2}
          label="Public discovery heads"
          count={publicEvents}
          complete={publicEose}
        />
        <SnapshotLane
          icon={LockKeyhole}
          label="Recipient gift wraps"
          count={privateEvents}
          complete={privateEose}
        />
        <Progress value={progress} aria-label="Snapshot completion" />
      </CardContent>
      <CardFooter className="border-t text-xs text-muted-foreground">
        {complete
          ? "Live delivery can now fold over this snapshot."
          : "The previous completed snapshot remains visible during reconnect."}
      </CardFooter>
    </Card>
  )
}

export function ImmortalPrivateDelivery({
  record,
  recipient,
  copies,
  state,
}: {
  record: string
  recipient: string
  copies: number
  state: "wrapped" | "delivered" | "verified"
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileKey2 aria-hidden="true" className="size-4 text-primary" />
          NIP-59 private delivery
        </CardTitle>
        <CardDescription>
          Counterparty and recovery copies retain the same exact signed rumor.
        </CardDescription>
        <CardAction>
          <Badge variant={state === "verified" ? "secondary" : "outline"}>
            {state}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <RelayRow label="Signed record" value={record} mono />
        <RelayRow label="Recipient" value={recipient} mono />
        <RelayRow label="Gift-wrap copies" value={String(copies)} />
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[0.6875rem]">
          <DeliveryStep label="Rumor signed" complete />
          <DeliveryStep label="Wrap opened" complete={state !== "wrapped"} />
          <DeliveryStep
            label="Provenance verified"
            complete={state === "verified"}
          />
        </div>
      </CardContent>
    </Card>
  )
}

export function ImmortalSessionPersistence({
  sessions,
  signedRecords,
  deliveries,
  effects,
  restored,
}: {
  sessions: number
  signedRecords: number
  deliveries: number
  effects: number
  restored: boolean
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database aria-hidden="true" className="size-4 text-primary" />
          Durable browser session
        </CardTitle>
        <CardDescription>
          IndexedDB stores validated public bytes, delivery provenance, and
          engine snapshots.
        </CardDescription>
        <CardAction>
          <Badge variant={restored ? "secondary" : "outline"}>
            {restored ? "Restored" : "Current"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Sessions" value={sessions} />
        <Metric label="Signed records" value={signedRecords} />
        <Metric label="Deliveries" value={deliveries} />
        <Metric label="Effects" value={effects} />
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="size-4 text-emerald-500" />
        Restore reruns record, delivery, contract, and effect validation.
      </CardFooter>
    </Card>
  )
}

export function ImmortalReconnectNotice({
  attempt,
  retryIn,
}: {
  attempt: number
  retryIn: string
}) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-xl border border-border bg-card px-4 py-3"
    >
      <RefreshCw
        aria-hidden="true"
        className="mt-0.5 size-4 animate-spin text-primary motion-reduce:animate-none"
      />
      <div>
        <p className="text-sm font-semibold">
          Reconnecting to relay · attempt {attempt}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Retry in {retryIn}. The last EOSE-complete snapshot remains visible
          but stale.
        </p>
      </div>
    </div>
  )
}

function SnapshotLane({
  icon: Icon,
  label,
  count,
  complete,
}: {
  icon: typeof Globe2
  label: string
  count: number
  complete: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm">
        <Icon aria-hidden="true" className="size-4" />
        {label}
      </span>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        {count} events{" "}
        {complete ? (
          <CheckCircle2
            aria-label="EOSE received"
            className="size-4 text-emerald-500"
          />
        ) : (
          <CircleDashed
            aria-label="Waiting for EOSE"
            className="size-4 animate-spin motion-reduce:animate-none"
          />
        )}
      </span>
    </div>
  )
}

function DeliveryStep({
  label,
  complete,
}: {
  label: string
  complete: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-2 py-2",
        complete
          ? "border-emerald-500/30 bg-emerald-500/8"
          : "border-border text-muted-foreground"
      )}
    >
      <div className="mx-auto mb-1 grid size-4 place-items-center rounded-full border border-current">
        {complete ? <Check className="size-2.5" /> : null}
      </div>
      {label}
    </div>
  )
}

function RelayRow({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-xs">
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-secondary p-3 text-center">
      <p className="font-mono text-lg font-semibold">{value}</p>
      <p className="mt-0.5 text-[0.6875rem] text-muted-foreground">{label}</p>
    </div>
  )
}
