import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import {
  ImmortalEngineStatus,
  ImmortalHostAuthorityBoundary,
  ImmortalSdkError,
  ImmortalSdkMetadata,
  ImmortalSdkOperations,
} from "@/components/immortal/sdk"

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
  title: "Immortal/TypeScript SDK",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const MetadataAndProvenance: Story = {
  render: () => (
    <Frame>
      <ImmortalSdkMetadata
        sourceRevision="69a78231ffeae5a"
        requesterApiSha256="bf52fda5…b3a8"
        wasmSha256="7cd00d97…30505"
      />
    </Frame>
  ),
}

export const AllOperations: Story = {
  render: () => (
    <Frame wide>
      <ImmortalSdkOperations />
    </Frame>
  ),
}

export const HostAuthority: Story = {
  render: () => (
    <Frame>
      <ImmortalHostAuthorityBoundary />
    </Frame>
  ),
}

export const EngineLoading: Story = {
  render: () => (
    <Frame>
      <ImmortalEngineStatus
        state="loading"
        detail="Loading the pinned Immortal requester engine…"
      />
    </Frame>
  ),
}

export const EngineReady: Story = {
  render: () => (
    <Frame>
      <ImmortalEngineStatus
        state="ready"
        detail="ABI v1 · source revision and requester API digest verified."
      />
    </Frame>
  ),
}

export const TypedFailure: Story = {
  render: () => (
    <Frame>
      <ImmortalSdkError
        code="browser_abi_version_mismatch"
        detail="The application requested ABI v2, but the pinned engine exposes ABI v1. No session was created."
      />
    </Frame>
  ),
}

export const CompleteSdkBoundary: Story = {
  render: () => (
    <Frame wide>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ImmortalEngineStatus
            state="ready"
            detail="Pinned requester engine verified."
          />
          <ImmortalSdkMetadata
            sourceRevision="69a78231ffeae5a"
            requesterApiSha256="bf52fda5…b3a8"
            wasmSha256="7cd00d97…30505"
          />
        </div>
        <ImmortalHostAuthorityBoundary />
      </div>
      <ImmortalSdkOperations />
    </Frame>
  ),
}
