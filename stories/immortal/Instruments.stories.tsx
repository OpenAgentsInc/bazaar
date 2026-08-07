import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CardAction } from "@/components/ui/card"
import {
  EVIDENCE_RUNGS,
  ImmortalEvidenceRungs,
} from "@/components/viz/immortal/evidence-rungs"
import {
  ImmortalStateRail,
  REVERSE_RAIL,
  SUBMARINE_RAIL,
} from "@/components/viz/immortal/state-rail"
import { ImmortalTimeoutLadder } from "@/components/viz/immortal/timeout-ladder"

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-svh bg-background p-5 text-foreground sm:p-10">
      <div className="mx-auto max-w-3xl space-y-4">{children}</div>
    </div>
  )
}

function Panel({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="mb-3 font-mono text-[0.625rem] tracking-widest text-muted-foreground uppercase">
        {title}
      </p>
      {children}
    </div>
  )
}

const meta = {
  title: "Immortal/Instruments",
  parameters: { layout: "fullscreen" },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const StateRailSubmarine: Story = {
  render: () => (
    <Frame>
      <Panel title="Submarine rail — funding observed">
        <ImmortalStateRail
          rail={SUBMARINE_RAIL}
          currentState="funding_observed"
        />
      </Panel>
      <Panel title="Submarine rail — 0-conf bypass taken">
        <ImmortalStateRail
          rail={SUBMARINE_RAIL}
          currentState="zero_conf_accepted"
        />
      </Panel>
      <Panel title="Submarine rail — refund ladder active">
        <ImmortalStateRail
          rail={SUBMARINE_RAIL}
          currentState="refund_pending"
        />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const rails = canvas.getAllByRole("img", {
      name: /submarine swap state rail/,
    })
    await expect(rails).toHaveLength(3)
  },
}

export const StateRailReverse: Story = {
  render: () => (
    <Frame>
      <Panel title="Reverse rail — HTLCs held">
        <ImmortalStateRail rail={REVERSE_RAIL} currentState="ln_htlcs_held" />
      </Panel>
      <Panel title="Reverse rail — completed">
        <ImmortalStateRail rail={REVERSE_RAIL} currentState="completed" />
      </Panel>
    </Frame>
  ),
}

export const TimeoutLadder: Story = {
  render: () => (
    <Frame>
      <Panel title="Submarine — inside the safe funding window">
        <ImmortalTimeoutLadder
          currentHeight={1_262}
          hFund={1_286}
          hClaim={1_298}
          hRefund={1_322}
        />
      </Panel>
      <Panel title="Reverse — chain and CLTV domains, separate clocks">
        <ImmortalTimeoutLadder
          currentHeight={1_262}
          hFund={1_286}
          hClaim={1_298}
          hRefund={1_322}
          holdExpiry={{ currentHeight: 823_401, expiryHeight: 823_473 }}
        />
      </Panel>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /hold invoice expires/ })
    ).toBeInTheDocument()
  },
}

export const EvidenceRungs: Story = {
  render: () => (
    <Frame>
      <Panel title="Every rung — only admitted verification climbs">
        <div className="grid gap-2 sm:grid-cols-2">
          {EVIDENCE_RUNGS.map((rung) => (
            <ImmortalEvidenceRungs key={rung} rung={rung} />
          ))}
        </div>
      </Panel>
      <Panel title="With reservation proof strength">
        <div className="space-y-2">
          <ImmortalEvidenceRungs
            rung="reserved"
            proofClass="provider_signed"
            proofStrength={10}
          />
          <ImmortalEvidenceRungs
            rung="measured"
            proofClass="utxo_control"
            proofStrength={60}
          />
          <ImmortalEvidenceRungs
            rung="paid"
            proofClass="funded_htlc"
            proofStrength={80}
          />
        </div>
      </Panel>
    </Frame>
  ),
}

export const SwapCardContext: Story = {
  render: () => (
    <Frame>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Reverse swap · 250,000 sat</CardTitle>
          <CardDescription>
            provider-b · firm quote · fee 40 bps · verify before fund
          </CardDescription>
          <CardAction>
            <Badge variant="outline">REGTEST</Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImmortalStateRail rail={REVERSE_RAIL} currentState="ln_htlcs_held" />
          <ImmortalTimeoutLadder
            currentHeight={1_262}
            hFund={1_286}
            hClaim={1_298}
            hRefund={1_322}
            holdExpiry={{ currentHeight: 823_401, expiryHeight: 823_473 }}
          />
          <ImmortalEvidenceRungs
            rung="measured"
            proofClass="funded_htlc"
            proofStrength={80}
          />
        </CardContent>
      </Card>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("img", { name: /reverse swap state rail/ })
    ).toBeInTheDocument()
    await expect(
      canvas.getByRole("img", { name: /Evidence rung measured/ })
    ).toBeInTheDocument()
  },
}
