import assert from "node:assert/strict"
import test from "node:test"

import {
  ImmortalSessionStore,
  ImmortalStoreError,
  MemoryStringKv,
  engineInputsForSession,
  loadOrCreateDemoIdentity,
  type ProviderRoute,
  type StoredSignedRecord,
  type StoredValidatedDelivery,
} from "./store"
import { validateRegtestDestination } from "./destination"

const SESSION_ID = "11".repeat(32)
const REQUESTER = "22".repeat(32)
const PROVIDER = "33".repeat(32)
const EVENT_ID = "44".repeat(32)
const EFFECT_ID = "55".repeat(32)
const ROUTE: ProviderRoute = {
  role: "provider-a",
  providerPubkey: PROVIDER,
  offeringCoordinate: `39601:${PROVIDER}:submarine-btc-ln`,
  relayUrl: "ws://127.0.0.1:18182",
}

function record(rawSignedEvent = '{"signed":true}'): StoredSignedRecord {
  return {
    id: EVENT_ID,
    pubkey: PROVIDER,
    kind: 39_605,
    createdAt: 1_700_000_000,
    rawSignedEvent,
    rawWrapEvent: '{"kind":1059}',
    wrapEventId: "66".repeat(32),
    provenance: "gift_wrap",
  }
}

function delivery(observedAt = 1_700_000_001): StoredValidatedDelivery {
  return {
    eventId: EVENT_ID,
    wrapId: "66".repeat(32),
    rawWrapEvent: '{"kind":1059,"copy":"counterparty"}',
    sealId: "77".repeat(32),
    rumorId: "88".repeat(32),
    receivedAt: observedAt,
    senderPubkey: PROVIDER,
    source: "counterparty",
    engineInput: {
      raw_signed_event_hex: "7b7d",
      observed_at: observedAt,
      provenance: "direct",
    },
    engineDelivery: {
      event_id: EVENT_ID,
      raw_signed_event: [123, 125],
      raw_wrap_event: null,
      wrap_event_id: null,
      sender_pubkey: PROVIDER,
      observed_at: observedAt,
      provenance: "direct",
    },
  }
}

async function createStore() {
  let now = 1_700_000_000_000
  const kv = new MemoryStringKv()
  const store = new ImmortalSessionStore(kv, () => ++now)
  await store.create({
    sessionId: SESSION_ID,
    requesterPubkey: REQUESTER,
    providerPubkey: PROVIDER,
    relayUrl: ROUTE.relayUrl,
    selectedProviderRoute: ROUTE,
    dynamicInput: null,
    engineSnapshotJsonHex: "",
    engineView: null,
  })
  return { kv, store }
}

test("demo identity is stable and explicitly restricted to local demo use", async () => {
  const kv = new MemoryStringKv()
  const first = await loadOrCreateDemoIdentity(kv, () => 123)
  const restored = await loadOrCreateDemoIdentity(kv, () => 456)

  assert.deepEqual(restored, first)
  assert.equal(first.privateKeyHex.length, 64)
  assert.equal(first.pubkey.length, 64)
  assert.equal(first.policy, "local_demo_identity_only_never_fund_or_reuse")
})

test("concurrent duplicate delivery is persisted once and restores exactly", async () => {
  const { kv, store } = await createStore()
  await Promise.all([
    store.appendDelivery(SESSION_ID, record(), delivery()),
    store.appendDelivery(SESSION_ID, record(), delivery()),
  ])
  await store.saveEngineSnapshot(SESSION_ID, "7b7d", {
    state: "quote_verified",
    order_count: 0,
  })

  const beforeReload = await store.get(SESSION_ID)
  const afterReload = await new ImmortalSessionStore(kv).get(SESSION_ID)
  assert.deepEqual(afterReload, beforeReload)
  assert.equal(afterReload.signedRecords.length, 1)
  assert.equal(afterReload.validatedDeliveries.length, 1)
})

test("record evidence and its validated engine snapshot commit together", async () => {
  const { kv, store } = await createStore()
  const committed = await store.commitDeliveryAndEngineSnapshot(
    SESSION_ID,
    record(),
    delivery(),
    "7b7d",
    { state: "quote_verified" }
  )
  const restored = await new ImmortalSessionStore(kv).get(SESSION_ID)

  assert.equal(committed.signedRecords.length, 1)
  assert.equal(committed.validatedDeliveries.length, 1)
  assert.equal(committed.engineSnapshotJsonHex, "7b7d")
  assert.deepEqual(restored, committed)
})

test("snapshot replay retains the first observation of identical wrap bytes", async () => {
  const { store } = await createStore()
  await store.appendDelivery(SESSION_ID, record(), delivery())
  const replayed = await store.appendDelivery(
    SESSION_ID,
    record(),
    delivery(1_700_000_100)
  )

  assert.equal(replayed.validatedDeliveries.length, 1)
  assert.equal(replayed.validatedDeliveries[0]?.receivedAt, 1_700_000_001)
  assert.equal(
    replayed.validatedDeliveries[0]?.engineInput.observed_at,
    1_700_000_001
  )
})

test("same signed ID or delivery provenance with changed bytes fails closed", async () => {
  const { store } = await createStore()
  await store.appendDelivery(SESSION_ID, record(), delivery())

  await assert.rejects(
    store.appendDelivery(SESSION_ID, record('{"changed":true}'), delivery()),
    (cause) =>
      cause instanceof ImmortalStoreError &&
      cause.code === "signed_record_conflict"
  )
  await assert.rejects(
    store.appendDelivery(SESSION_ID, record(), {
      ...delivery(),
      rawWrapEvent: '{"kind":1059,"changed":true}',
    }),
    (cause) =>
      cause instanceof ImmortalStoreError &&
      cause.code === "signed_record_conflict"
  )
})

test("one signed record retains both exact NIP-59 delivery copies", async () => {
  const { store } = await createStore()
  await store.appendDelivery(SESSION_ID, record(), delivery())
  await store.appendDelivery(
    SESSION_ID,
    {
      ...record(),
      rawWrapEvent: '{"kind":1059,"copy":"sender-recovery"}',
      wrapEventId: "99".repeat(32),
      provenance: "locally_signed",
    },
    {
      ...delivery(),
      wrapId: "99".repeat(32),
      rawWrapEvent: '{"kind":1059,"copy":"sender-recovery"}',
      sealId: "aa".repeat(32),
      rumorId: "bb".repeat(32),
      source: "sender_recovery",
    }
  )

  const session = await store.get(SESSION_ID)
  assert.equal(session.signedRecords.length, 1)
  assert.equal(session.validatedDeliveries.length, 2)
  assert.notEqual(
    session.validatedDeliveries[0]?.rawWrapEvent,
    session.validatedDeliveries[1]?.rawWrapEvent
  )
  assert.deepEqual(engineInputsForSession(session), [delivery().engineInput])
})

test("engine input projection fails closed without delivery evidence", async () => {
  const { store } = await createStore()
  const session = await store.appendDelivery(SESSION_ID, record(), delivery())
  assert.throws(
    () =>
      engineInputsForSession({
        ...session,
        validatedDeliveries: [],
      }),
    (cause) =>
      cause instanceof ImmortalStoreError && cause.code === "session_invalid"
  )
})

test("external effects replay their exact durable result and reject rebinding", async () => {
  const { kv, store } = await createStore()
  const request = {
    operation: "broadcast",
    transaction_sha256: "aa".repeat(32),
  }
  const result = { transaction_id: "bb".repeat(32), accepted: true }

  await Promise.all([
    store.recordEffectRequest(SESSION_ID, EFFECT_ID, request),
    store.recordEffectRequest(SESSION_ID, EFFECT_ID, request),
  ])
  await store.recordEffectResult(SESSION_ID, EFFECT_ID, result, "regtest:tx")
  await store.recordEffectResult(SESSION_ID, EFFECT_ID, result, "regtest:tx")

  const restored = new ImmortalSessionStore(kv)
  assert.deepEqual(
    await restored.priorEffectResult(SESSION_ID, EFFECT_ID, request),
    {
      digest: (await restored.get(SESSION_ID)).effects[0]?.result?.digest,
      value: result,
      externalId: "regtest:tx",
      observedAt: (await restored.get(SESSION_ID)).effects[0]?.result
        ?.observedAt,
    }
  )
  await assert.rejects(
    restored.priorEffectResult(SESSION_ID, EFFECT_ID, { operation: "refund" }),
    (cause) =>
      cause instanceof ImmortalStoreError &&
      cause.code === "effect_binding_conflict"
  )
})

test("session persistence refuses custody or settlement secrets", async () => {
  const { store } = await createStore()
  await assert.rejects(
    store.saveEngineSnapshot(SESSION_ID, "7b7d", {
      settlement: { preimage: "not-allowed" },
    }),
    (cause) =>
      cause instanceof ImmortalStoreError &&
      cause.code === "secret_material_refused"
  )
})

test("reload preserves the exact canonical destination and parser version", async () => {
  const parsed = validateRegtestDestination(
    "bcrt1pvcpgfdxvvnklep6kdyewn80pphta54nwwrex3ahrvh2uh0e9dgwsalmcu5",
    "reverse",
    0
  )
  assert.equal(parsed.ok, true)
  if (!parsed.ok) return
  const kv = new MemoryStringKv()
  const store = new ImmortalSessionStore(kv, () => 1_700_000_000_000)
  await store.create({
    sessionId: SESSION_ID,
    requesterPubkey: REQUESTER,
    providerPubkey: PROVIDER,
    relayUrl: ROUTE.relayUrl,
    selectedProviderRoute: ROUTE,
    dynamicInput: {
      inputAmount: "150000",
      destination: parsed.destination,
    },
    engineSnapshotJsonHex: "",
    engineView: null,
  })

  const restored = await new ImmortalSessionStore(kv).get(SESSION_ID)
  assert.deepEqual(restored.dynamicInput, {
    inputAmount: "150000",
    destination: parsed.destination,
  })
})
