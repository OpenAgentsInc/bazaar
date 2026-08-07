import type { ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Bitcoin,
  CheckCircle2,
  ChevronDown,
  CircleDashed,
  Clock3,
  Copy,
  Download,
  FileKey2,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  Network,
  QrCode,
  Radio,
  Search,
  Settings2,
  ShieldCheck,
  TriangleAlert,
  Upload,
  WalletCards,
  XCircle,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import {
  boltzReferenceComponents,
  boltzReferenceCounts,
  boltzReferenceScreens,
  boltzReferenceStatuses,
  type BoltzReferenceEntry,
  type BoltzReferenceKind,
} from "./reference-catalog"

const kindLabel: Record<BoltzReferenceKind, string> = {
  foundation: "Primitive",
  input: "Input",
  swap: "Swap",
  payment: "Payment",
  wallet: "Wallet",
  recovery: "Recovery",
  shell: "Shell",
  setting: "Setting",
  status: "Status",
  screen: "Screen",
}

const componentGroups: readonly {
  title: string
  kinds: readonly BoltzReferenceKind[]
}[] = [
  { title: "Foundations", kinds: ["foundation"] },
  { title: "Inputs and selection", kinds: ["input"] },
  { title: "Swap and quote surfaces", kinds: ["swap"] },
  { title: "Payments and bridges", kinds: ["payment"] },
  { title: "Wallet connections", kinds: ["wallet"] },
  { title: "Backup and recovery", kinds: ["recovery"] },
  { title: "Application shell", kinds: ["shell"] },
  { title: "Settings", kinds: ["setting"] },
]

export function BoltzReferenceCatalog() {
  return (
    <div className="h-svh overflow-y-auto bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Zap aria-hidden="true" className="size-4" />
                Boltz Web App coverage
              </div>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                Complete component and screen inventory
              </h1>
              <p className="mt-2 max-w-[68ch] text-sm text-muted-foreground">
                Every upstream UI module is mapped to a Bazaar-native
                representation. Network effects remain mocked; interaction
                boundaries and states stay explicit.
              </p>
            </div>
            <Link
              href="/"
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              Back to swap
            </Link>
          </div>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <Count label="Components" value={boltzReferenceCounts.components} />
            <Count label="Statuses" value={boltzReferenceCounts.statuses} />
            <Count label="Screens" value={boltzReferenceCounts.screens} />
            <Count label="Total surfaces" value={boltzReferenceCounts.total} />
          </dl>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-12 px-5 py-10 sm:px-8">
        <section aria-labelledby="components-heading">
          <SectionHeading
            id="components-heading"
            title="Components"
            description="Reusable controls, transaction surfaces, recovery tools, and application chrome."
          />
          <div className="mt-6 space-y-8">
            {componentGroups.map((group) => {
              const items = boltzReferenceComponents.filter((entry) =>
                group.kinds.includes(entry.kind)
              )
              return (
                <ReferenceGroup
                  key={group.title}
                  title={group.title}
                  entries={items}
                />
              )
            })}
          </div>
        </section>

        <section aria-labelledby="statuses-heading">
          <SectionHeading
            id="statuses-heading"
            title="Lifecycle statuses"
            description="Every distinct upstream status is visible as a standalone, testable state."
          />
          <ReferenceGrid className="mt-6">
            {boltzReferenceStatuses.map((entry) => (
              <BoltzReferenceCard key={entry.path} entry={entry} />
            ))}
          </ReferenceGrid>
        </section>

        <section aria-labelledby="screens-heading">
          <SectionHeading
            id="screens-heading"
            title="Complete screens"
            description="Responsive compositions for all application, product, legal, error, and recovery routes."
          />
          <div className="mt-6 grid gap-5 xl:grid-cols-2">
            {boltzReferenceScreens.map((entry) => (
              <BoltzScreenPreview key={entry.path} entry={entry} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-mono font-semibold">{value}</dd>
    </div>
  )
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string
  title: string
  description: string
}) {
  return (
    <div>
      <h2 id={id} className="text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-1 max-w-[68ch] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

function ReferenceGroup({
  title,
  entries,
}: {
  title: string
  entries: readonly BoltzReferenceEntry[]
}) {
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {title} · {entries.length}
      </h3>
      <ReferenceGrid>
        {entries.map((entry) => (
          <BoltzReferenceCard key={entry.path} entry={entry} />
        ))}
      </ReferenceGrid>
    </div>
  )
}

function ReferenceGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border bg-card",
        className
      )}
    >
      {children}
    </div>
  )
}

export function BoltzReferenceCard({ entry }: { entry: BoltzReferenceEntry }) {
  return (
    <article
      data-boltz-reference={entry.name}
      className="grid gap-4 border-b border-border p-4 [content-visibility:auto] last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(13rem,0.8fr)] sm:items-center"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold">{entry.name}</h3>
            <p className="mt-0.5 truncate font-mono text-[0.625rem] text-muted-foreground">
              {entry.path}
            </p>
          </div>
          <Badge variant="outline">{kindLabel[entry.kind]}</Badge>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{entry.summary}</p>
      </div>
      <div>
        <ReferenceSample kind={entry.kind} name={entry.name} />
      </div>
    </article>
  )
}

function ReferenceSample({
  kind,
  name,
}: {
  kind: BoltzReferenceKind
  name: string
}) {
  if (kind === "foundation") return <FoundationSample name={name} />
  if (kind === "input") return <InputSample name={name} />
  if (kind === "swap") return <SwapSample name={name} />
  if (kind === "payment") return <PaymentSample name={name} />
  if (kind === "wallet") return <WalletSample name={name} />
  if (kind === "recovery") return <RecoverySample name={name} />
  if (kind === "setting") return <SettingSample name={name} />
  if (kind === "status") return <StatusSample name={name} />
  return <ShellSample name={name} />
}

function FoundationSample({ name }: { name: string }) {
  if (name === "Chart")
    return (
      <div
        role="img"
        className="flex h-20 items-end gap-1 rounded-lg bg-secondary p-3"
        aria-label="Fee chart"
      >
        <span className="h-1/3 flex-1 bg-primary/30" />
        <span className="h-3/5 flex-1 bg-primary/50" />
        <span className="h-2/5 flex-1 bg-primary/40" />
        <span className="h-4/5 flex-1 bg-primary" />
        <span className="h-2/3 flex-1 bg-primary/70" />
      </div>
    )
  if (name === "QrCode")
    return (
      <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
        <QrCode className="size-12" />
        <span className="text-xs text-muted-foreground">
          Scannable payment request
        </span>
      </div>
    )
  if (name === "Accordion")
    return (
      <details className="rounded-lg border border-border px-3 py-2">
        <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-medium">
          Fee details <ChevronDown className="size-3.5" />
        </summary>
        <p className="pt-2 text-xs text-muted-foreground">
          Provider 0.4% · Network 320 sats
        </p>
      </details>
    )
  if (name.includes("BlockExplorer") || name === "ExternalLink")
    return (
      <a
        href="#"
        className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs font-medium"
      >
        Open transaction <ArrowUpRight className="size-3.5" />
      </a>
    )
  if (name.includes("Copy"))
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs">bcrt1q8h…g7kh</code>
        <Copy className="size-3.5" />
      </div>
    )
  return (
    <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
      <span className="flex items-center gap-2">
        <Bitcoin className="size-4 text-asset-bitcoin" />
        Bitcoin
      </span>
      <Badge variant="secondary">BTC</Badge>
    </div>
  )
}

function InputSample({ name }: { name: string }) {
  if (name.includes("RescueFile"))
    return (
      <label className="flex min-h-20 items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground">
        <Upload className="size-4" />
        Choose recovery file
      </label>
    )
  if (name === "QrScan")
    return (
      <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-border">
        <QrCode className="size-8 text-muted-foreground" />
        <span className="ml-2 text-xs">Camera preview</span>
      </div>
    )
  if (name === "NetworkSelect" || name === "AssetSelect")
    return (
      <button
        type="button"
        className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary px-3 py-2 text-xs"
      >
        <span className="flex items-center gap-2">
          <Network className="size-4" />
          {name === "NetworkSelect" ? "Bitcoin Regtest" : "Lightning"}
        </span>
        <ChevronDown className="size-3.5" />
      </button>
    )
  if (name === "HardwareDerivationPaths")
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
          <span className="flex items-center gap-2">
            <KeyRound className="size-4" />
            m/84&apos;/1&apos;/0&apos;/0/0
          </span>
          <Badge variant="secondary">Selected</Badge>
        </div>
        <Button size="xs" variant="outline" className="w-full">
          Verify on device
        </Button>
      </div>
    )
  return (
    <div>
      <p className="mb-1 text-[0.6875rem] font-medium">
        {name.replace("Input", "") || "Value"}
      </p>
      <Input
        aria-label={name.replace("Input", "") || "Value"}
        readOnly
        value={
          name === "InvoiceInput"
            ? "lnbcrt2500n1p…"
            : name === "MnemonicInput"
              ? "abandon … about"
              : "250,000"
        }
        className="h-9 font-mono text-xs"
      />
    </div>
  )
}

function SwapSample({ name }: { name: string }) {
  if (name === "SwapList" || name === "SwapListLogs")
    return (
      <div className="space-y-1.5">
        <DataLine label="LN → BTC" value="250,000 sats" />
        <DataLine
          label="swap_91d2…8a4f"
          value={name === "SwapListLogs" ? "3 events" : "Claimable"}
        />
      </div>
    )
  if (
    name.includes("Fee") ||
    name === "FiatAmount" ||
    name === "OptimizedRoute"
  )
    return (
      <div className="space-y-1.5">
        <DataLine label="You receive" value="249,360 sats" />
        <DataLine label="Fee ceiling" value="640 sats" />
        <p className="text-right text-[0.6875rem] text-emerald-500">
          Optimized route saves 1,420 sats
        </p>
      </div>
    )
  if (name === "SwapHeader" || name === "SwapIcons" || name === "Reverse")
    return (
      <div className="flex items-center justify-center gap-3 rounded-lg bg-secondary px-3 py-3">
        <span className="grid size-8 place-items-center rounded-full bg-asset-lightning text-asset-lightning-foreground">
          <Zap className="size-4" />
        </span>
        <ArrowLeftRight className="size-4 text-muted-foreground" />
        <span className="grid size-8 place-items-center rounded-full bg-asset-bitcoin text-asset-bitcoin-foreground">
          <Bitcoin className="size-4" />
        </span>
      </div>
    )
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <CircleDashed className="size-4 text-primary" />
        <span>Verifying signed route</span>
      </div>
      <Progress value={65} />
      <Button
        size="xs"
        className="w-full"
        disabled={name === "SwapExecutionWorker"}
      >
        Create swap
      </Button>
    </div>
  )
}

function PaymentSample({ name }: { name: string }) {
  const waiting = name === "WaitForBridge" || name === "RefundEta"
  return (
    <div className="space-y-2 rounded-lg bg-secondary p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2">
          {waiting ? (
            <Clock3 className="size-4" />
          ) : (
            <LockKeyhole className="size-4" />
          )}
          {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
        </span>
        <Badge variant={waiting ? "outline" : "secondary"}>
          {waiting ? "~4 min" : "Exact effect"}
        </Badge>
      </div>
      <DataLine label="Network" value="Regtest" />
      <Button
        size="xs"
        variant={name.includes("Refund") ? "destructive" : "default"}
        className="w-full"
      >
        {name.includes("Refund")
          ? "Prepare refund"
          : name.includes("Approve")
            ? "Approve token"
            : "Continue"}
      </Button>
    </div>
  )
}

function WalletSample({ name }: { name: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
        <span className="flex items-center gap-2">
          <WalletCards className="size-4" />
          {name === "WeblnButton" ? "Browser Lightning" : "External wallet"}
        </span>
        <span className="size-2 rounded-full bg-emerald-500" />
      </div>
      <Button size="xs" variant="outline" className="w-full">
        Connect wallet
      </Button>
    </div>
  )
}

function RecoverySample({ name }: { name: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-lg bg-secondary p-3 text-xs">
        <FileKey2 className="size-5" />
        <div>
          <p className="font-medium">
            {name.includes("Verify")
              ? "Verify recovery backup"
              : "Save recovery backup"}
          </p>
          <p className="text-muted-foreground">Keys stay with this browser.</p>
        </div>
      </div>
      <Button size="xs" variant="outline" className="w-full">
        <Download className="size-3.5" />
        Download encrypted backup
      </Button>
    </div>
  )
}

function ShellSample({ name }: { name: string }) {
  const warning = name.includes("Warning") || name === "InsufficientBalance"
  if (name === "Nav" || name === "Footer")
    return (
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
        <strong>BAZAAR</strong>
        <span className="flex gap-3 text-muted-foreground">
          <span>Swap</span>
          <span>History</span>
          <span>Rescue</span>
        </span>
      </div>
    )
  return (
    <div
      className={cn(
        "flex gap-2 rounded-lg px-3 py-2 text-xs",
        warning
          ? "bg-destructive/10 text-destructive"
          : "bg-primary/10 text-primary"
      )}
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-medium">
          {warning
            ? "Action required"
            : name === "ProBanner"
              ? "Boltz Pro available"
              : "Status update"}
        </p>
        <p className="mt-0.5 opacity-80">
          {warning
            ? "Review the amount and network before continuing."
            : "The latest application state is available."}
        </p>
      </div>
    </div>
  )
}

function SettingSample({ name }: { name: string }) {
  if (name === "Separator") return <div className="h-px bg-border" />
  if (name === "Logs")
    return (
      <pre className="max-h-20 overflow-hidden rounded-lg bg-secondary p-2 font-mono text-[0.625rem] text-muted-foreground">
        10:42:08 quote.received{"\n"}10:42:09 route.verified{"\n"}10:42:11
        effect.ready
      </pre>
    )
  if (name === "SettingsCog" || name === "SettingsMenu")
    return (
      <Button size="xs" variant="outline" className="w-full">
        <Settings2 className="size-3.5" />
        Open settings
      </Button>
    )
  if (name === "Slippage")
    return (
      <div>
        <div className="mb-2 flex justify-between text-xs">
          <span>Maximum slippage</span>
          <span>0.5%</span>
        </div>
        <Progress value={25} />
      </div>
    )
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary px-3 py-2 text-xs">
      <span>{name.replace(/([a-z])([A-Z])/g, "$1 $2")}</span>
      <Switch defaultChecked={name !== "GasTopUp"} aria-label={name} />
    </div>
  )
}

function StatusSample({ name }: { name: string }) {
  const failed = /Rejected|Expired|Failed|Blocked/.test(name)
  const complete = /Claimed|Confirmed|Refunded/.test(name)
  const Icon = failed
    ? XCircle
    : complete
      ? CheckCircle2
      : name === "Broadcasting"
        ? Radio
        : CircleDashed
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary p-3">
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          failed
            ? "text-destructive"
            : complete
              ? "text-emerald-500"
              : "text-primary"
        )}
      />
      <div>
        <p className="text-xs font-semibold">
          {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {failed
            ? "The operation stopped safely. Recovery remains available."
            : complete
              ? "Requester-admitted evidence satisfies this state."
              : "Waiting for the next verified lifecycle event."}
        </p>
      </div>
    </div>
  )
}

function DataLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

export function BoltzScreenPreview({ entry }: { entry: BoltzReferenceEntry }) {
  const name = entry.name
  const error = name === "Error" || name === "ErrorWasm" || name === "NotFound"
  const legal = name === "Privacy" || name === "Terms"
  const product = ["Hero", "Btcpay", "Client", "Pro", "Products"].includes(name)
  const history = name === "History" || name === "FeeComparison"
  const rescue = /Rescue|Recovery|MethodSelection|Results/.test(name)
  return (
    <article
      data-boltz-screen={name}
      className="overflow-hidden rounded-xl border border-border bg-card [content-visibility:auto]"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <h3 className="font-semibold">{name}</h3>
          <p className="font-mono text-[0.625rem] text-muted-foreground">
            {entry.path}
          </p>
        </div>
        <Badge variant="outline">Screen</Badge>
      </div>
      <div className="min-h-72 bg-background p-4">
        <MiniNav />
        <div className="mx-auto mt-5 max-w-md">
          {error ? (
            <ErrorScreen name={name} />
          ) : legal ? (
            <LegalScreen name={name} />
          ) : product ? (
            <ProductScreen name={name} />
          ) : history ? (
            <HistoryScreen name={name} />
          ) : rescue ? (
            <RescueScreen name={name} />
          ) : (
            <SwapScreen name={name} />
          )}
        </div>
      </div>
    </article>
  )
}

function MiniNav() {
  return (
    <nav
      aria-label="Preview navigation"
      className="flex items-center justify-between text-[0.6875rem]"
    >
      <strong className="flex items-center gap-1.5">
        <Zap className="size-3.5 text-primary" />
        BAZAAR
      </strong>
      <span className="flex gap-3 text-muted-foreground">
        <span>Swap</span>
        <span>History</span>
        <span>Rescue</span>
      </span>
    </nav>
  )
}

function ErrorScreen({ name }: { name: string }) {
  return (
    <div className="py-8 text-center">
      <TriangleAlert className="mx-auto size-8 text-destructive" />
      <h4 className="mt-3 font-semibold">
        {name === "NotFound"
          ? "Page not found"
          : name === "ErrorWasm"
            ? "Browser engine unavailable"
            : "Something went wrong"}
      </h4>
      <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
        No funds moved. Return to a known state or inspect recovery options.
      </p>
      <Button size="xs" variant="outline" className="mt-4">
        Return to swap
      </Button>
    </div>
  )
}

function LegalScreen({ name }: { name: string }) {
  return (
    <div>
      <h4 className="text-lg font-semibold">
        {name === "Privacy" ? "Privacy policy" : "Terms of service"}
      </h4>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Bazaar coordinates noncustodial swaps. Users remain responsible for
        verifying destinations, amounts, network selection, and recovery
        material before authorizing effects.
      </p>
      <div className="mt-3 space-y-2">
        <div className="h-2 w-full rounded bg-muted" />
        <div className="h-2 w-5/6 rounded bg-muted" />
        <div className="h-2 w-3/4 rounded bg-muted" />
      </div>
    </div>
  )
}

function ProductScreen({ name }: { name: string }) {
  return (
    <div className="py-4 text-center">
      <Badge variant="secondary">
        {name === "Hero" ? "Noncustodial swaps" : name}
      </Badge>
      <h4 className="mt-3 text-xl font-semibold text-balance">
        {name === "Btcpay"
          ? "Accept swaps through BTCPay"
          : name === "Client"
            ? "Build with the swap client"
            : name === "Pro"
              ? "Operate with advanced controls"
              : "Move between Bitcoin rails"}
      </h4>
      <p className="mx-auto mt-2 max-w-sm text-xs text-muted-foreground">
        Exact quotes, explicit networks, and user-held recovery at every step.
      </p>
      <Button size="sm" className="mt-4">
        Explore product
      </Button>
    </div>
  )
}

function HistoryScreen({ name }: { name: string }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">
          {name === "History" ? "Swap history" : "Fee comparison"}
        </h4>
        <Search className="size-4 text-muted-foreground" />
      </div>
      <div className="mt-3 space-y-2">
        <DataLine label="LN → BTC" value="249,360 sats" />
        <DataLine label="LBTC → LN" value="78,500 sats" />
        <DataLine label="BTC → LN" value="510,000 sats" />
      </div>
    </div>
  )
}

function RescueScreen({ name }: { name: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <LifeBuoy className="size-5 text-primary" />
        <h4 className="font-semibold">
          {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
        </h4>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Recover from a local backup, mnemonic, transaction identifier, or
        connected wallet.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button size="xs" variant="outline">
          <Upload className="size-3.5" />
          Upload backup
        </Button>
        <Button size="xs" variant="outline">
          <WalletCards className="size-3.5" />
          Connect wallet
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-secondary p-3 text-xs">
        <ShieldCheck className="size-4 text-emerald-500" />
        Recovery material never leaves this browser.
      </div>
    </div>
  )
}

function SwapScreen({ name }: { name: string }) {
  const pay = name === "Pay"
  const refund = name === "RefundEvm"
  return (
    <div>
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">
          {name.replace(/([a-z])([A-Z])/g, "$1 $2")}
        </h4>
        <Badge variant="outline">Regtest</Badge>
      </div>
      <div className="mt-3 space-y-2 rounded-lg bg-secondary p-3">
        <DataLine label={pay ? "Payment" : "Send"} value="250,000 sats" />
        <DataLine
          label={refund ? "Refund to" : "Receive"}
          value={refund ? "0x7a…e91c" : "249,360 sats"}
        />
        <DataLine label="Fee ceiling" value="640 sats" />
      </div>
      <Button size="sm" className="mt-3 w-full">
        {refund
          ? "Prepare refund"
          : pay
            ? "Verify payment"
            : "Review exact effect"}
      </Button>
    </div>
  )
}
