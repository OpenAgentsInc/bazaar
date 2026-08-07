import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  ImmortalPrivateDelivery,
  ImmortalReconnectNotice,
  ImmortalRelayConnection,
  ImmortalRelayIdentity,
  ImmortalSessionPersistence,
  ImmortalSnapshotBarrier,
} from "@/components/immortal/relay"

function Frame({
  children,
  wide = false,
}: {
  children: React.ReactNode
  wide?: boolean
}) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div
        className={
          wide ? "mx-auto max-w-5xl space-y-4" : "mx-auto max-w-xl space-y-4"
        }
      >
        {children}
      </div>
    </div>
  )
}

const meta = {
  title: "Immortal/Nostr Relay Runtime",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Connecting: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayConnection
        stage="connecting"
        relayUrl="wss://relay-a.regtest.openagents.com"
      />
    </Frame>
  ),
}
export const AuthenticatingNip42: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayConnection
        stage="authenticating"
        relayUrl="wss://relay-a.regtest.openagents.com"
      />
    </Frame>
  ),
}
export const Snapshotting: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayConnection
        stage="snapshot"
        relayUrl="wss://relay-a.regtest.openagents.com"
      />
    </Frame>
  ),
}
export const Live: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayConnection
        stage="live"
        relayUrl="wss://relay-a.regtest.openagents.com"
      />
    </Frame>
  ),
}
export const Disconnected: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayConnection
        stage="closed"
        relayUrl="wss://relay-a.regtest.openagents.com"
        reconnectAttempt={3}
      />
    </Frame>
  ),
}

export const PinnedRelayIdentity: Story = {
  render: () => (
    <Frame>
      <ImmortalRelayIdentity
        version="0.8.0"
        relayPubkey="a19f…4d82"
        contractSha256="92d8…aa71"
        extensions={["nip-mkt", "mkt-swp:1", "mkt-swp-coordination:1"]}
      />
    </Frame>
  ),
}

export const EoseProvisional: Story = {
  render: () => (
    <Frame>
      <ImmortalSnapshotBarrier
        publicEvents={4}
        privateEvents={7}
        publicEose
        privateEose={false}
      />
    </Frame>
  ),
}
export const EoseComplete: Story = {
  render: () => (
    <Frame>
      <ImmortalSnapshotBarrier
        publicEvents={4}
        privateEvents={12}
        publicEose
        privateEose
      />
    </Frame>
  ),
}

export const Nip59Delivery: Story = {
  render: () => (
    <Frame>
      <ImmortalPrivateDelivery
        record="39604:7f21…c8a4"
        recipient="f802…19bd"
        copies={2}
        state="verified"
      />
    </Frame>
  ),
}

export const DurableRestore: Story = {
  render: () => (
    <Frame>
      <ImmortalSessionPersistence
        sessions={2}
        signedRecords={17}
        deliveries={31}
        effects={1}
        restored
      />
    </Frame>
  ),
}

export const ReconnectingWithSnapshot: Story = {
  render: () => (
    <Frame>
      <ImmortalReconnectNotice attempt={3} retryIn="4 seconds" />
      <ImmortalSnapshotBarrier
        publicEvents={4}
        privateEvents={12}
        publicEose
        privateEose
      />
    </Frame>
  ),
}

export const CompleteRelayBoot: Story = {
  render: () => (
    <Frame wide>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <ImmortalRelayConnection
          stage="live"
          relayUrl="wss://relay-a.regtest.openagents.com"
        />
        <ImmortalRelayIdentity
          version="0.8.0"
          relayPubkey="a19f…4d82"
          contractSha256="92d8…aa71"
          extensions={["nip-mkt", "mkt-swp:1"]}
        />
        <ImmortalSnapshotBarrier
          publicEvents={4}
          privateEvents={12}
          publicEose
          privateEose
        />
        <ImmortalSessionPersistence
          sessions={2}
          signedRecords={17}
          deliveries={31}
          effects={1}
          restored
        />
      </div>
    </Frame>
  ),
}
