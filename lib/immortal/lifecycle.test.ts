import assert from "node:assert/strict"
import test from "node:test"

import type { Event } from "@openagentsinc/nip-mkt"

import { projectDemoLifecycle } from "./lifecycle"
import type {
  StoredEffect,
  StoredImmortalSession,
  StoredSignedRecord,
} from "./store"

const requester = "11".repeat(32)
const provider = "22".repeat(32)
const sessionId = "33".repeat(32)

test("projects the exact no-spend chain only after a canonical zero-loss Close", () => {
  const session = completeSession()
  const lifecycle = projectDemoLifecycle(session)

  assert.equal(lifecycle.state, "complete")
  assert.equal(
    lifecycle.detail,
    "Demo complete — reservation released, 0 sats moved."
  )
  assert.equal(lifecycle.completedStages.length, 8)
})

test("fails closed on settlement overclaim, engine gaps, or local effects", () => {
  const overclaim = completeSession({ externalSpendEffects: 1 })
  assert.throws(
    () => projectDemoLifecycle(overclaim),
    /zero_loss_close_invalid/
  )

  const gap = completeSession({ statusGaps: ["missing-status"] })
  assert.throws(() => projectDemoLifecycle(gap), /zero_loss_close_invalid/)

  const localEffect: StoredEffect = {
    effectId: "44".repeat(32),
    requestDigest: "55".repeat(32),
    request: { action: "fund" },
    result: null,
  }
  const effects = { ...completeSession(), effects: [localEffect] }
  assert.throws(() => projectDemoLifecycle(effects), /zero_loss_close_invalid/)
})

function completeSession(
  options: {
    readonly externalSpendEffects?: number
    readonly statusGaps?: readonly string[]
  } = {}
): StoredImmortalSession {
  const events = [
    event(39_604, requester),
    event(39_605, provider),
    event(39_606, requester),
    event(39_610, requester),
    event(39_610, provider),
    event(39_607, provider),
    event(39_608, requester, [["action", "request"]]),
    event(39_608, provider, [["action", "accepted"]]),
    event(39_608, provider, [["action", "effective"]]),
    event(39_609, provider, [], {
      final_state: "cancelled",
      external_spend_effects: options.externalSpendEffects ?? 0,
      loss_classification: "none",
      loss_accounting: {
        input_committed: "0",
        input_recovered: "0",
        output_received: "0",
        provider_fee_paid: "0",
        miner_fee_paid: "0",
        lightning_routing_fee_paid: "0",
        guarantee_recovery_received: "0",
        principal_unresolved: "0",
        reservation_released: "890",
      },
    }),
  ]
  const close = events.at(-1)!
  return {
    schema: "openagents.bazaar.immortal-session.v1",
    sessionId,
    requesterPubkey: requester,
    providerPubkey: provider,
    relayUrl: "ws://127.0.0.1:18084",
    selectedProviderRoute: {
      role: "provider-a",
      providerPubkey: provider,
      offeringCoordinate: `39601:${provider}:demo`,
      relayUrl: "ws://127.0.0.1:18084",
    },
    dynamicInput: null,
    signedRecords: events.map(storedRecord),
    validatedDeliveries: [],
    engineSnapshotJsonHex: "00",
    engineView: {
      verification: {
        state: "contract_terms_verified",
        funding_authorized: false,
        status_gaps: options.statusGaps ?? [],
        status_forks: [],
        invalid_status_claims: [],
      },
      terminal: {
        claimed_state: "cancelled",
        canonical_close_id: close.id,
        loss_accounting_complete: true,
        local_effects_verified: false,
        watch_terminal: false,
      },
    },
    effects: [],
    createdAt: 1,
    updatedAt: 1,
  }
}

function event(
  kind: number,
  pubkey: string,
  tags: string[][] = [],
  profile: Record<string, unknown> = {}
): Event {
  const id = (kind.toString(16).padStart(4, "0") + pubkey).slice(0, 64)
  return {
    id,
    pubkey,
    created_at: kind,
    kind,
    tags: [["session", sessionId], ...tags],
    content: JSON.stringify({ mkt_swp: profile }),
    sig: "66".repeat(64),
  }
}

function storedRecord(value: Event): StoredSignedRecord {
  return {
    id: value.id,
    pubkey: value.pubkey,
    kind: value.kind,
    createdAt: value.created_at,
    rawSignedEvent: JSON.stringify(value),
    rawWrapEvent: null,
    wrapEventId: null,
    provenance: "direct",
  }
}
