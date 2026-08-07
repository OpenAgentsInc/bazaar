// Immortal Viz/Network Map — the /network page catalog (bazaar#16,
// docs/network-map-and-onboarding.md §3). Every network here is produced by
// the real `buildPanoramaNetwork` fold over live-shaped inputs (manifest +
// sockets + NIP-11 + 39600/39601 heads + 39603 aggregates); the page story
// uses the mocked usePanoramaNetwork from .storybook/mocks, the same
// pattern as use-immortal-runtime.

import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import { NetworkPage } from "@/components/network-page"
import { ImmortalNetworkPanorama } from "@/components/viz/immortal/network-panorama"

import {
  DEGRADED_LIVE_NETWORK,
  PINNED_ONLY_NETWORK,
  WITH_DISCOVERED_NETWORK,
} from "./network-map-fixtures"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-5xl space-y-4">{children}</div>
    </div>
  )
}

function Panel({
  title,
  caption,
  children,
}: {
  title: string
  caption?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-1 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {caption ? (
        <p className="mb-3 text-xs text-muted-foreground">{caption}</p>
      ) : null}
      {children}
    </div>
  )
}

const meta = {
  title: "Immortal Viz/Network Map",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const PinnedOnly: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Pinned only — the signed manifest, live"
        caption="Both manifest relays live with verified NIP-11 identities, both pinned providers publishing active heads. Exactly what the /network hero shows on a healthy deployment before anyone joins."
      >
        <ImmortalNetworkPanorama network={PINNED_ONLY_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /Network panorama "public regtest"/ })
    ).toBeInTheDocument()
    // No discovered tier anywhere: the sr-only mirror carries no unpinned tag.
    await expect(canvas.queryByText(/unpinned/)).not.toBeInTheDocument()
  },
}

export const WithDiscoveredTier: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Discovered tier — three joins, one new relay"
        caption="Two pinned providers plus three discovered providers that published valid 39600/39601 heads on connected relays, and one discovered relay listed in a joiner's profile. Discovered nodes render dimmed with an explicit unpinned suffix — never color-only — and are never routable from the swap card."
      >
        <ImmortalNetworkPanorama network={WITH_DISCOVERED_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // ARIA: the scene exposes one img with the full network summary.
    const scene = canvas.getByRole("img", {
      name: /Network panorama "public regtest": 3 relays.*5 providers/,
    })
    await expect(scene).toBeInTheDocument()
    // The sr-only mirror names every discovered node as unpinned, and the
    // discovered relay carries the suffix in its accessible label too.
    const unpinned = canvas.getAllByText(/unpinned \(not in the signed manifest\)/)
    await expect(unpinned.length).toBe(4)
    // The discovered relay carries the unpinned suffix in its visible SVG
    // label and its sr-only mirror entry (never color-only).
    await expect(
      canvas.getAllByText(/relay-join · unpinned/).length
    ).toBeGreaterThan(0)
  },
}

export const DegradedLive: Story = {
  render: () => (
    <Frame>
      <Panel
        title="Degraded — relay-b socket closed, provider-b silent"
        caption="One relay lane closed (offline, dashed red), its NIP-11 probe failing, and a pinned provider that has not published a head this session (starting, not hidden). The map keeps rendering what it can still see."
      >
        <ImmortalNetworkPanorama network={DEGRADED_LIVE_NETWORK} />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /2 relays \(1 ready\)/ })
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(/relay · offline · pinned by the signed manifest/)
    ).toBeInTheDocument()
  },
}

export const JoinPanel: Story = {
  render: () => (
    <NetworkPage
      publicConfig={{
        state: "unavailable",
        code: "public_manifest_not_configured",
        detail: "Storybook renders through the mocked panorama hook.",
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Page composition: hero fed by the mocked hook, REGTEST label, join
    // panel with the one-command instructions and the docs link.
    await expect(
      canvas.getByRole("img", { name: /Network panorama "public regtest"/ })
    ).toBeInTheDocument()
    await expect(
      canvas.getByLabelText(/Regtest network — regtest sats, not real value/)
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(/join-regtest\.sh provider/)
    ).toBeInTheDocument()
    const docsLink = canvas.getByRole("link", { name: "docs/join-regtest.md" })
    await expect(docsLink).toHaveAttribute(
      "href",
      "https://github.com/OpenAgentsInc/immortal/blob/main/docs/join-regtest.md"
    )
    await expect(
      canvas.getAllByText("regtest sats — not real value").length
    ).toBe(2)
  },
}
