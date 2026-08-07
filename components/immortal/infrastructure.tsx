import {
  Bitcoin,
  Check,
  CheckCircle2,
  CircleDashed,
  Globe2,
  HardDrive,
  Radio,
  Server,
  ShieldCheck,
  TriangleAlert,
  WalletCards,
  Zap,
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

export type ImmortalServiceState = "ready" | "starting" | "degraded" | "offline"

export interface ImmortalService {
  readonly name: string
  readonly role: string
  readonly state: ImmortalServiceState
  readonly detail: string
}

export function ImmortalServiceReadiness({
  services,
}: {
  services: readonly ImmortalService[]
}) {
  const ready = services.every((service) => service.state === "ready")
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Service readiness</CardTitle>
        <CardDescription>
          Public-safe health only. RPC, database, node, and provider secrets
          remain private.
        </CardDescription>
        <CardAction>
          <Badge variant={ready ? "secondary" : "destructive"}>
            {ready ? "Ready" : "Not ready"}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-xl border border-border">
          {services.map((service) => (
            <ServiceRow key={service.name} service={service} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function ImmortalNetworkTopology() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 aria-hidden="true" className="size-4 text-primary" />
          Persistent public regtest topology
        </CardTitle>
        <CardDescription>
          Two providers, two relays, isolated databases, and requester-owned
          rail evidence.
        </CardDescription>
        <CardAction>
          <Badge variant="outline">REGTEST</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          <TopologyColumn
            title="Browser requester"
            icon={WalletCards}
            items={["TypeScript host", "Immortal WASM", "Requester CLN"]}
          />
          <div className="hidden flex-col items-center gap-1 text-[0.625rem] text-muted-foreground sm:flex">
            <Radio className="size-4 text-primary" />
            <span>HTTPS/WSS</span>
          </div>
          <div className="space-y-3">
            <TopologyColumn
              title="Relay fabric"
              icon={Radio}
              items={["relay-a + Postgres", "relay-b + Postgres"]}
            />
            <TopologyColumn
              title="Provider rails"
              icon={Server}
              items={[
                "provider-a · bitcoind + CLN",
                "provider-b · bitcoind + CLN",
              ]}
            />
          </div>
        </div>
        <div className="mt-3 rounded-xl border border-border p-3">
          <p className="text-xs font-medium">Lightning channel graph</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline">A ↔ requester</Badge>
            <Badge variant="outline">B ↔ requester</Badge>
            <Badge variant="outline">A ↔ B</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t text-xs text-muted-foreground">
        <TriangleAlert aria-hidden="true" className="size-4 text-amber-500" />
        Single-operator first milestone; relay operator independence remains a
        separate gate.
      </CardFooter>
    </Card>
  )
}

export function ImmortalCustodyBoundary() {
  const roles = [
    {
      name: "Relay",
      icon: Radio,
      holds: "Signed public events, recipient-gated wraps, observations",
      refuses: "Wallets, spend keys, preimages, node credentials",
    },
    {
      name: "Provider",
      icon: Server,
      holds: "Operator-owned liquidity and declared rail credentials",
      refuses: "Requester keys or unilateral user authority",
    },
    {
      name: "Client host",
      icon: WalletCards,
      holds: "Entropy, signing, storage, wallet actions, rail evidence",
      refuses: "Unverified provider claims as settlement truth",
    },
    {
      name: "WASM engine",
      icon: HardDrive,
      holds: "Pure validation state and exact prepared requests",
      refuses: "All secret and external-effect authority",
    },
  ] as const
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
          Custody boundary
        </CardTitle>
        <CardDescription>
          Roles are separate build products, not runtime labels inside one
          trusted service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {roles.map(({ name, icon: Icon, holds, refuses }) => (
          <section
            key={name}
            className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[7rem_1fr_1fr] sm:gap-4"
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Icon aria-hidden="true" className="size-4 text-primary" />
              {name}
            </p>
            <div>
              <p className="text-[0.625rem] font-semibold text-emerald-500">
                OWNS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{holds}</p>
            </div>
            <div>
              <p className="text-[0.625rem] font-semibold text-destructive">
                NEVER OWNS
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{refuses}</p>
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

export interface ImmortalAcceptanceCheck {
  readonly label: string
  readonly state: "passed" | "running" | "failed"
  readonly detail: string
}

export function ImmortalConformanceReceipt({
  revision,
  checks,
}: {
  revision: string
  checks: readonly ImmortalAcceptanceCheck[]
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Conformance receipt</CardTitle>
        <CardDescription>
          Locally executable proof, scoped to the named topology and revision.
        </CardDescription>
        <CardAction>
          <Badge
            variant={
              checks.every((check) => check.state === "passed")
                ? "secondary"
                : "outline"
            }
          >
            Public safe
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        {checks.map((check) => {
          const Icon =
            check.state === "passed"
              ? CheckCircle2
              : check.state === "failed"
                ? TriangleAlert
                : CircleDashed
          return (
            <div
              key={check.label}
              className="flex items-start gap-2.5 rounded-xl border border-border px-3 py-2.5"
            >
              <Icon
                aria-hidden="true"
                className={cn(
                  "mt-0.5 size-4 shrink-0",
                  check.state === "passed" && "text-emerald-500",
                  check.state === "failed" && "text-destructive",
                  check.state === "running" &&
                    "animate-spin text-primary motion-reduce:animate-none"
                )}
              />
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          )
        })}
      </CardContent>
      <CardFooter className="justify-between border-t text-xs text-muted-foreground">
        <span>Source revision</span>
        <code className="font-mono">{revision}</code>
      </CardFooter>
    </Card>
  )
}

export function ImmortalRailReadiness({
  chainHeight,
  chainTipMatches,
  lightningChannels,
}: {
  chainHeight: number
  chainTipMatches: boolean
  lightningChannels: number
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bitcoin className="size-4 text-asset-bitcoin" />
            Bitcoin rail
          </p>
          <Badge variant={chainTipMatches ? "secondary" : "destructive"}>
            {chainTipMatches ? "Synchronized" : "Tip mismatch"}
          </Badge>
        </div>
        <p className="mt-3 font-mono text-xl font-semibold">
          {chainHeight.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground">Shared regtest height</p>
      </div>
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Zap className="size-4 text-asset-lightning" />
            Lightning rail
          </p>
          <Badge variant={lightningChannels >= 3 ? "secondary" : "destructive"}>
            {lightningChannels >= 3 ? "Routable" : "Degraded"}
          </Badge>
        </div>
        <p className="mt-3 font-mono text-xl font-semibold">
          {lightningChannels}
        </p>
        <p className="text-xs text-muted-foreground">Ready channel edges</p>
      </div>
    </div>
  )
}

function ServiceRow({ service }: { service: ImmortalService }) {
  const Icon =
    service.state === "ready"
      ? CheckCircle2
      : service.state === "starting"
        ? CircleDashed
        : TriangleAlert
  return (
    <div className="grid gap-2 border-b border-border px-3 py-3 last:border-b-0 sm:grid-cols-[auto_9rem_1fr_auto] sm:items-center">
      <Icon
        aria-hidden="true"
        className={cn(
          "size-4",
          service.state === "ready" && "text-emerald-500",
          service.state === "starting" &&
            "animate-spin text-primary motion-reduce:animate-none",
          ["degraded", "offline"].includes(service.state) && "text-destructive"
        )}
      />
      <p className="text-sm font-medium">{service.name}</p>
      <p className="text-xs text-muted-foreground">{service.detail}</p>
      <Badge
        variant={
          service.state === "ready"
            ? "secondary"
            : service.state === "starting"
              ? "outline"
              : "destructive"
        }
      >
        {service.state}
      </Badge>
    </div>
  )
}

function TopologyColumn({
  title,
  icon: Icon,
  items,
}: {
  title: string
  icon: typeof Radio
  items: readonly string[]
}) {
  return (
    <section className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon aria-hidden="true" className="size-4 text-primary" />
        {title}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Check aria-hidden="true" className="size-3 text-emerald-500" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}
