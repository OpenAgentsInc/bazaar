import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  ImmortalFundedAdapterBoundary,
  ImmortalIdempotencyReceipt,
  ImmortalNoSpendManifest,
} from "@/components/immortal/demo-contracts"
import {
  ImmortalEffectAuthorization,
  ImmortalMarketRecordChain,
  ImmortalOfferingCard,
  ImmortalVerificationSummary,
  type ImmortalMarketRecord,
} from "@/components/immortal/market"
import {
  ImmortalRelayConnection,
  ImmortalSessionPersistence,
  ImmortalSnapshotBarrier,
} from "@/components/immortal/relay"
import {
  ImmortalEngineStatus,
  ImmortalHostAuthorityBoundary,
  ImmortalSdkMetadata,
} from "@/components/immortal/sdk"

const records: ImmortalMarketRecord[] = [
  {
    type: "RFQ",
    kind: 39604,
    author: "requester",
    state: "verified",
    detail:
      "Signed requester intent binds the route, amount, payment hash, and Offering.",
  },
  {
    type: "Quote",
    kind: 39605,
    author: "provider",
    state: "verified",
    detail: "Northstar returns firm terms and a soft reservation proof.",
  },
  {
    type: "Order",
    kind: 39606,
    author: "requester",
    state: "verified",
    detail:
      "The requester accepts the exact Quote without mutating provider terms.",
  },
  {
    type: "Contract",
    kind: 39610,
    author: "requester",
    state: "current",
    detail:
      "Both sides commit the same rail scripts before funding is prepared.",
  },
]

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-6xl space-y-4">{children}</div>
    </div>
  )
}

function StoryHeading({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string
  title: string
  detail: string
}) {
  return (
    <header className="max-w-3xl py-3">
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{detail}</p>
    </header>
  )
}

const meta = {
  title: "Immortal/Imagined Demo",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const BrowserBoot: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Step 1 · Verify the engine"
        title="A browser host with a deliberately small trust boundary"
        detail="Bazaar pins the generated TypeScript adapter, requester API, WASM digest, and ABI before it creates any durable session."
      />
      <ImmortalEngineStatus
        state="ready"
        detail="ABI v1 · source and requester API digests verified."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalSdkMetadata
          sourceRevision="69a78231ffeae5a"
          requesterApiSha256="bf52fda5…b3a8"
          wasmSha256="7cd00d97…30505"
        />
        <ImmortalHostAuthorityBoundary />
      </div>
    </Frame>
  ),
}

export const RelayConnected: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Step 2 · Establish the snapshot"
        title="Direct Nostr relay transport, authenticated in the browser"
        detail="NIP-11 identity and contract pins are checked before WSS. Public heads and recipient gift wraps must both reach EOSE before the snapshot is canonical."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalRelayConnection
          stage="live"
          relayUrl="wss://relay-a.regtest.openagents.com"
        />
        <ImmortalSnapshotBarrier
          publicEvents={4}
          privateEvents={12}
          publicEose
          privateEose
        />
      </div>
      <ImmortalSessionPersistence
        sessions={1}
        signedRecords={9}
        deliveries={14}
        effects={0}
        restored
      />
    </Frame>
  ),
}

export const TwoProviderNegotiation: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Step 3 · Select signed terms"
        title="Two providers compete without gaining requester authority"
        detail="The no-spend topology proves discovery, private RFQ delivery, deterministic Quote selection, provider restart, bilateral contract, cancellation, and Close."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ImmortalNoSpendManifest />
          <ImmortalOfferingCard
            provider="Northstar · 9ec5…7a21"
            input="LN"
            output="BTC"
            minimum="50,000"
            maximum="5,000,000"
            feeBps="40"
            quoteLifetime="10 minutes"
          />
        </div>
        <ImmortalMarketRecordChain records={records} />
      </div>
    </Frame>
  ),
}

export const VerifyBeforeFund: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Step 4 · Admit one exact effect"
        title="Verification finishes before the wallet prompt begins"
        detail="The engine prepares an exact regtest request. The host owns the final authorization and admits the resulting receipt back into the durable session."
      />
      <ImmortalVerificationSummary
        fundingAuthorized={false}
        statusGaps={0}
        statusForks={0}
        invalidClaims={0}
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalEffectAuthorization
          state="prepared"
          effectId="eff_71cd…981a"
          operation="fund_chain_destination"
          network="Bitcoin regtest"
          amount="250,000 sats"
          destination="bcrt1q8h…g7kh"
        />
        <ImmortalFundedAdapterBoundary />
      </div>
    </Frame>
  ),
}

export const EffectAdmitted: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Step 5 · Preserve the proof"
        title="An idempotent receipt advances the session"
        detail="The receipt is bound to the session, order, effect, and exact request digest. A byte-for-byte replay returns this receipt; a changed replay is refused."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalEffectAuthorization
          state="admitted"
          effectId="eff_71cd…981a"
          operation="fund_chain_destination"
          network="Bitcoin regtest"
          amount="250,000 sats"
          destination="bcrt1q8h…g7kh"
        />
        <ImmortalIdempotencyReceipt
          sessionId="ses_2c91…11fd"
          orderId="ord_a813…991b"
          effectId="eff_71cd…981a"
          digest="sha256:30b6…33e0"
          replayed={false}
        />
      </div>
      <ImmortalSessionPersistence
        sessions={1}
        signedRecords={13}
        deliveries={22}
        effects={1}
        restored={false}
      />
    </Frame>
  ),
}

export const CompleteDemoContract: Story = {
  render: () => (
    <Frame>
      <StoryHeading
        eyebrow="Immortal browser demo"
        title="From signed discovery to requester-admitted rail evidence"
        detail="This complete view is the demo contract: a pinned pure engine, direct authenticated relay transport, immutable market records, and host-owned effects."
      />
      <ImmortalEngineStatus
        state="ready"
        detail="Pinned requester engine verified · no WASM imports."
      />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalRelayConnection
          stage="live"
          relayUrl="wss://relay-a.regtest.openagents.com"
        />
        <ImmortalSnapshotBarrier
          publicEvents={4}
          privateEvents={12}
          publicEose
          privateEose
        />
        <ImmortalNoSpendManifest />
        <ImmortalMarketRecordChain records={records} />
        <ImmortalEffectAuthorization
          state="admitted"
          effectId="eff_71cd…981a"
          operation="fund_chain_destination"
          network="Bitcoin regtest"
          amount="250,000 sats"
          destination="bcrt1q8h…g7kh"
        />
        <ImmortalIdempotencyReceipt
          sessionId="ses_2c91…11fd"
          orderId="ord_a813…991b"
          effectId="eff_71cd…981a"
          digest="sha256:30b6…33e0"
          replayed={false}
        />
      </div>
    </Frame>
  ),
}
