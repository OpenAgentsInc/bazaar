import { generateSecretKey, getPublicKey } from "@openagentsinc/nip-mkt"

import type {
  ImmortalSessionDeliveryInput,
  ImmortalSignedRecordDelivery,
} from "@/vendor/mkt-swp/immortal-browser-abi"
import type { ValidatedRegtestDestination } from "./destination"

const DATABASE_NAME = "openagents-bazaar-immortal"
const DATABASE_VERSION = 1
const OBJECT_STORE = "records"
const SESSION_PREFIX = "session/"
const IDENTITY_KEY = "identity/demo-v1"
const LOWER_HEX_32 = /^[0-9a-f]{64}$/
const LOWER_EVEN_HEX = /^(?:[0-9a-f]{2})+$/
const FORBIDDEN_SESSION_KEYS = new Set([
  "private_key",
  "secret_key",
  "wallet_seed",
  "seed_phrase",
  "mnemonic",
  "preimage",
  "macaroon",
])

export type StoreErrorCode =
  | "storage_unavailable"
  | "storage_corrupt"
  | "storage_future_version"
  | "session_invalid"
  | "session_missing"
  | "session_conflict"
  | "signed_record_conflict"
  | "effect_binding_conflict"
  | "secret_material_refused"

export class ImmortalStoreError extends Error {
  constructor(
    readonly code: StoreErrorCode,
    message: string
  ) {
    super(message)
    this.name = "ImmortalStoreError"
  }
}

export interface StringKv {
  readonly get: (key: string) => Promise<string | undefined>
  readonly set: (key: string, value: string) => Promise<void>
  readonly delete: (key: string) => Promise<void>
  readonly keys: (prefix: string) => Promise<readonly string[]>
}

export interface DemoIdentity {
  readonly schema: "openagents.bazaar.demo-identity.v1"
  readonly privateKeyHex: string
  readonly pubkey: string
  readonly createdAt: number
  readonly policy: "local_demo_identity_only_never_fund_or_reuse"
}

export interface ProviderRoute {
  readonly role: "provider-a" | "provider-b"
  readonly providerPubkey: string
  readonly offeringCoordinate: string
  readonly relayUrl: string
}

export interface StoredSignedRecord {
  readonly id: string
  readonly pubkey: string
  readonly kind: number
  readonly createdAt: number
  readonly rawSignedEvent: string
  readonly rawWrapEvent: string | null
  readonly wrapEventId: string | null
  readonly provenance: "locally_signed" | "direct" | "gift_wrap"
}

export interface StoredValidatedDelivery {
  readonly eventId: string
  readonly wrapId: string | null
  readonly rawWrapEvent: string | null
  readonly sealId: string | null
  readonly rumorId: string | null
  readonly receivedAt: number
  readonly senderPubkey: string
  readonly source: "counterparty" | "sender_recovery" | "direct"
  readonly engineInput: ImmortalSessionDeliveryInput
  readonly engineDelivery: ImmortalSignedRecordDelivery
}

export interface StoredEffectResult {
  readonly digest: string
  readonly value: unknown
  readonly externalId: string | null
  readonly observedAt: number
}

export interface StoredEffect {
  readonly effectId: string
  readonly requestDigest: string
  readonly request: unknown
  readonly result: StoredEffectResult | null
}

export interface StoredImmortalSession {
  readonly schema: "openagents.bazaar.immortal-session.v1"
  readonly sessionId: string
  readonly requesterPubkey: string
  readonly providerPubkey: string
  readonly relayUrl: string
  readonly selectedProviderRoute: ProviderRoute
  readonly dynamicInput?: {
    readonly inputAmount: string
    readonly destination: ValidatedRegtestDestination
  } | null
  readonly signedRecords: readonly StoredSignedRecord[]
  readonly validatedDeliveries: readonly StoredValidatedDelivery[]
  readonly engineSnapshotJsonHex: string
  readonly engineView: unknown
  readonly effects: readonly StoredEffect[]
  readonly createdAt: number
  readonly updatedAt: number
}

export function engineInputsForSession(
  session: StoredImmortalSession
): readonly ImmortalSessionDeliveryInput[] {
  return session.signedRecords.map((record) => {
    const candidates = session.validatedDeliveries
      .filter((delivery) => delivery.eventId === record.id)
      .toSorted(compareEngineDeliveryEvidence)
    const selected = candidates[0]
    if (!selected) {
      throw new ImmortalStoreError(
        "session_invalid",
        `Signed record ${record.id} has no validated delivery evidence.`
      )
    }
    return selected.engineInput
  })
}

interface StoreEnvelope {
  readonly schema: "openagents.bazaar.immortal-store-envelope.v1"
  readonly storeVersion: 1
  readonly writeSequence: number
  readonly payloadDigest: string
  readonly payload: StoredImmortalSession
}

interface IdentityEnvelope {
  readonly schema: "openagents.bazaar.demo-identity-envelope.v1"
  readonly storeVersion: 1
  readonly identity: DemoIdentity
}

export class MemoryStringKv implements StringKv {
  private readonly values = new Map<string, string>()

  async get(key: string): Promise<string | undefined> {
    return this.values.get(key)
  }

  async set(key: string, value: string): Promise<void> {
    this.values.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key)
  }

  async keys(prefix: string): Promise<readonly string[]> {
    return [...this.values.keys()]
      .filter((key) => key.startsWith(prefix))
      .sort()
  }
}

export class IndexedDbStringKv implements StringKv {
  private constructor(private readonly database: IDBDatabase) {}

  static async open(): Promise<IndexedDbStringKv> {
    if (typeof indexedDB === "undefined") {
      throw new ImmortalStoreError(
        "storage_unavailable",
        "IndexedDB is unavailable in this browser."
      )
    }
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(OBJECT_STORE)) {
          request.result.createObjectStore(OBJECT_STORE)
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      request.onblocked = () =>
        reject(new Error("another Bazaar tab blocked the store upgrade"))
    }).catch((cause) => {
      throw new ImmortalStoreError(
        "storage_unavailable",
        cause instanceof Error
          ? cause.message
          : "IndexedDB could not be opened."
      )
    })
    return new IndexedDbStringKv(database)
  }

  async get(key: string): Promise<string | undefined> {
    return this.request<string | undefined>("readonly", (store) =>
      store.get(key)
    )
  }

  async set(key: string, value: string): Promise<void> {
    await this.request("readwrite", (store) => store.put(value, key))
  }

  async delete(key: string): Promise<void> {
    await this.request("readwrite", (store) => store.delete(key))
  }

  async keys(prefix: string): Promise<readonly string[]> {
    const keys = await this.request<IDBValidKey[]>("readonly", (store) =>
      store.getAllKeys()
    )
    return keys
      .filter(
        (key): key is string =>
          typeof key === "string" && key.startsWith(prefix)
      )
      .sort()
  }

  private request<T>(
    mode: IDBTransactionMode,
    makeRequest: (store: IDBObjectStore) => IDBRequest<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const transaction = this.database.transaction(OBJECT_STORE, mode)
      const request = makeRequest(transaction.objectStore(OBJECT_STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.onabort = () => reject(transaction.error)
    }).catch((cause) => {
      throw new ImmortalStoreError(
        "storage_unavailable",
        cause instanceof Error ? cause.message : "IndexedDB operation failed."
      )
    })
  }
}

export class ImmortalSessionStore {
  private readonly queues = new Map<string, Promise<void>>()

  constructor(
    private readonly kv: StringKv,
    private readonly now: () => number = () => Date.now()
  ) {}

  async list(): Promise<readonly StoredImmortalSession[]> {
    const sessions = await Promise.all(
      (await this.kv.keys(SESSION_PREFIX)).map((key) => this.loadKey(key))
    )
    return sessions.sort((left, right) => left.createdAt - right.createdAt)
  }

  async get(sessionId: string): Promise<StoredImmortalSession> {
    validateHex32(sessionId, "session ID")
    return this.loadKey(sessionKey(sessionId))
  }

  async create(
    input: Omit<
      StoredImmortalSession,
      | "schema"
      | "signedRecords"
      | "validatedDeliveries"
      | "effects"
      | "createdAt"
      | "updatedAt"
    >
  ): Promise<StoredImmortalSession> {
    return this.serial(input.sessionId, async () => {
      const key = sessionKey(input.sessionId)
      if (await this.kv.get(key)) {
        throw new ImmortalStoreError(
          "session_conflict",
          "The session already exists."
        )
      }
      const timestamp = this.now()
      const session: StoredImmortalSession = {
        schema: "openagents.bazaar.immortal-session.v1",
        ...input,
        signedRecords: [],
        validatedDeliveries: [],
        effects: [],
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      await this.persist(key, session, 1)
      return session
    })
  }

  async appendDelivery(
    sessionId: string,
    signedRecord: StoredSignedRecord,
    delivery: StoredValidatedDelivery
  ): Promise<StoredImmortalSession> {
    return this.update(sessionId, (session) =>
      appendValidatedDelivery(session, signedRecord, delivery)
    )
  }

  async commitDeliveryAndEngineSnapshot(
    sessionId: string,
    signedRecord: StoredSignedRecord,
    delivery: StoredValidatedDelivery,
    snapshotJsonHex: string,
    engineView: unknown
  ): Promise<StoredImmortalSession> {
    validateEngineSnapshot(snapshotJsonHex)
    return this.update(sessionId, (session) => ({
      ...appendValidatedDelivery(session, signedRecord, delivery),
      engineSnapshotJsonHex: snapshotJsonHex,
      engineView,
    }))
  }

  async saveEngineSnapshot(
    sessionId: string,
    snapshotJsonHex: string,
    engineView: unknown
  ): Promise<StoredImmortalSession> {
    validateEngineSnapshot(snapshotJsonHex)
    return this.update(sessionId, (session) => ({
      ...session,
      engineSnapshotJsonHex: snapshotJsonHex,
      engineView,
    }))
  }

  async selectProviderRoute(
    sessionId: string,
    route: ProviderRoute
  ): Promise<StoredImmortalSession> {
    validateRoute(route)
    return this.update(sessionId, (session) => ({
      ...session,
      providerPubkey: route.providerPubkey,
      relayUrl: route.relayUrl,
      selectedProviderRoute: route,
    }))
  }

  async recordEffectRequest(
    sessionId: string,
    effectId: string,
    request: unknown
  ): Promise<StoredImmortalSession> {
    validateHex32(effectId, "effect ID")
    const requestDigest = await digestJson(request)
    return this.update(sessionId, (session) => {
      const existing = session.effects.find(
        (candidate) => candidate.effectId === effectId
      )
      if (existing) {
        if (existing.requestDigest !== requestDigest) {
          throw new ImmortalStoreError(
            "effect_binding_conflict",
            "An effect ID was replayed with a different request."
          )
        }
        return session
      }
      return {
        ...session,
        effects: [
          ...session.effects,
          { effectId, requestDigest, request, result: null },
        ],
      }
    })
  }

  async recordEffectResult(
    sessionId: string,
    effectId: string,
    result: unknown,
    externalId: string | null
  ): Promise<StoredImmortalSession> {
    const digest = await digestJson(result)
    return this.update(sessionId, (session) => {
      const existing = session.effects.find(
        (candidate) => candidate.effectId === effectId
      )
      if (!existing) {
        throw new ImmortalStoreError(
          "effect_binding_conflict",
          "An effect result arrived before its durable request."
        )
      }
      if (existing.result) {
        if (existing.result.digest !== digest) {
          throw new ImmortalStoreError(
            "effect_binding_conflict",
            "An effect result was replayed with different bytes."
          )
        }
        return session
      }
      return {
        ...session,
        effects: session.effects.map((candidate) =>
          candidate.effectId === effectId
            ? {
                ...candidate,
                result: {
                  digest,
                  value: result,
                  externalId,
                  observedAt: this.now(),
                },
              }
            : candidate
        ),
      }
    })
  }

  async priorEffectResult(
    sessionId: string,
    effectId: string,
    request: unknown
  ): Promise<StoredEffectResult | null> {
    const session = await this.get(sessionId)
    const existing = session.effects.find(
      (candidate) => candidate.effectId === effectId
    )
    if (!existing) return null
    if (existing.requestDigest !== (await digestJson(request))) {
      throw new ImmortalStoreError(
        "effect_binding_conflict",
        "The resumed effect request differs from the durable request."
      )
    }
    return existing.result
  }

  private async update(
    sessionId: string,
    modify: (session: StoredImmortalSession) => StoredImmortalSession
  ): Promise<StoredImmortalSession> {
    validateHex32(sessionId, "session ID")
    return this.serial(sessionId, async () => {
      const key = sessionKey(sessionId)
      const envelope = await this.loadEnvelope(key)
      const modified = {
        ...modify(envelope.payload),
        sessionId,
        updatedAt: this.now(),
      }
      await this.persist(key, modified, envelope.writeSequence + 1)
      return modified
    })
  }

  private async loadKey(key: string): Promise<StoredImmortalSession> {
    return (await this.loadEnvelope(key)).payload
  }

  private async loadEnvelope(key: string): Promise<StoreEnvelope> {
    const encoded = await this.kv.get(key)
    if (!encoded) {
      throw new ImmortalStoreError(
        "session_missing",
        "The stored session does not exist."
      )
    }
    let value: unknown
    try {
      value = JSON.parse(encoded)
    } catch {
      throw new ImmortalStoreError(
        "storage_corrupt",
        "A stored session is not valid JSON."
      )
    }
    const envelope = value as Partial<StoreEnvelope>
    if (
      envelope.schema !== "openagents.bazaar.immortal-store-envelope.v1" ||
      envelope.storeVersion !== 1
    ) {
      throw new ImmortalStoreError(
        "storage_future_version",
        "The stored session uses an unsupported schema version."
      )
    }
    if (
      !Number.isSafeInteger(envelope.writeSequence) ||
      (envelope.writeSequence ?? 0) < 1 ||
      !envelope.payload ||
      envelope.payload.schema !== "openagents.bazaar.immortal-session.v1"
    ) {
      throw new ImmortalStoreError(
        "storage_corrupt",
        "A stored session envelope is invalid."
      )
    }
    validateSession(envelope.payload)
    if ((await digestJson(envelope.payload)) !== envelope.payloadDigest) {
      throw new ImmortalStoreError(
        "storage_corrupt",
        "A stored session failed its content digest."
      )
    }
    return envelope as StoreEnvelope
  }

  private async persist(
    key: string,
    session: StoredImmortalSession,
    writeSequence: number
  ): Promise<void> {
    validateSession(session)
    assertNoSessionSecrets(session)
    const envelope: StoreEnvelope = {
      schema: "openagents.bazaar.immortal-store-envelope.v1",
      storeVersion: 1,
      writeSequence,
      payloadDigest: await digestJson(session),
      payload: session,
    }
    await this.kv.set(key, canonicalJson(envelope))
  }

  private async serial<T>(
    sessionId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const previous = this.queues.get(sessionId) ?? Promise.resolve()
    let release: () => void = () => {}
    const current = new Promise<void>((resolve) => {
      release = resolve
    })
    const queued = previous.then(() => current)
    this.queues.set(sessionId, queued)
    await previous
    try {
      return await withBrowserLock(
        `bazaar-immortal-session-${sessionId}`,
        operation
      )
    } finally {
      release()
      if (this.queues.get(sessionId) === queued) this.queues.delete(sessionId)
    }
  }
}

function sameSignedRecord(
  left: StoredSignedRecord,
  right: StoredSignedRecord
): boolean {
  return (
    left.id === right.id &&
    left.pubkey === right.pubkey &&
    left.kind === right.kind &&
    left.createdAt === right.createdAt &&
    left.rawSignedEvent === right.rawSignedEvent
  )
}

function appendValidatedDelivery(
  session: StoredImmortalSession,
  signedRecord: StoredSignedRecord,
  delivery: StoredValidatedDelivery
): StoredImmortalSession {
  const existingRecord = session.signedRecords.find(
    (candidate) => candidate.id === signedRecord.id
  )
  if (existingRecord && !sameSignedRecord(existingRecord, signedRecord)) {
    throw new ImmortalStoreError(
      "signed_record_conflict",
      "A signed event ID was replayed with different bytes."
    )
  }
  const existingDelivery = session.validatedDeliveries.find(
    (candidate) =>
      candidate.eventId === delivery.eventId &&
      candidate.wrapId === delivery.wrapId
  )
  if (
    existingDelivery &&
    !sameValidatedDeliveryReplay(existingDelivery, delivery)
  ) {
    throw new ImmortalStoreError(
      "signed_record_conflict",
      "A validated delivery was replayed with different provenance."
    )
  }
  return {
    ...session,
    signedRecords: existingRecord
      ? session.signedRecords
      : [...session.signedRecords, signedRecord],
    validatedDeliveries: existingDelivery
      ? session.validatedDeliveries
      : [...session.validatedDeliveries, delivery],
  }
}

function validateEngineSnapshot(snapshotJsonHex: string): void {
  if (
    !LOWER_EVEN_HEX.test(snapshotJsonHex) ||
    snapshotJsonHex.length > 4_194_304
  ) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The engine snapshot is not bounded lowercase hexadecimal bytes."
    )
  }
}

function compareEngineDeliveryEvidence(
  left: StoredValidatedDelivery,
  right: StoredValidatedDelivery
): number {
  return (
    left.receivedAt - right.receivedAt ||
    (left.wrapId ?? "").localeCompare(right.wrapId ?? "") ||
    left.source.localeCompare(right.source)
  )
}

export async function loadOrCreateDemoIdentity(
  kv: StringKv,
  now: () => number = () => Date.now()
): Promise<DemoIdentity> {
  return withBrowserLock("bazaar-immortal-demo-identity", async () => {
    const stored = await kv.get(IDENTITY_KEY)
    if (stored) {
      try {
        const envelope = JSON.parse(stored) as IdentityEnvelope
        if (
          envelope.schema !== "openagents.bazaar.demo-identity-envelope.v1" ||
          envelope.storeVersion !== 1
        ) {
          throw new Error("identity schema mismatch")
        }
        validateIdentity(envelope.identity)
        return envelope.identity
      } catch {
        throw new ImmortalStoreError(
          "storage_corrupt",
          "The local demo identity is corrupt or incompatible."
        )
      }
    }
    const privateKey = generateSecretKey()
    const identity: DemoIdentity = {
      schema: "openagents.bazaar.demo-identity.v1",
      privateKeyHex: bytesToHex(privateKey),
      pubkey: getPublicKey(privateKey),
      createdAt: now(),
      policy: "local_demo_identity_only_never_fund_or_reuse",
    }
    validateIdentity(identity)
    const envelope: IdentityEnvelope = {
      schema: "openagents.bazaar.demo-identity-envelope.v1",
      storeVersion: 1,
      identity,
    }
    await kv.set(IDENTITY_KEY, canonicalJson(envelope))
    return identity
  })
}

export function hexToBytes(value: string): Uint8Array {
  if (!LOWER_EVEN_HEX.test(value)) {
    throw new ImmortalStoreError(
      "session_invalid",
      "Expected lowercase hexadecimal bytes."
    )
  }
  return Uint8Array.from(value.match(/../g) ?? [], (byte) =>
    Number.parseInt(byte, 16)
  )
}

export function bytesToHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  )
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

export async function digestJson(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJson(value))
  return bytesToHex(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
  )
}

function sameValidatedDeliveryReplay(
  left: StoredValidatedDelivery,
  right: StoredValidatedDelivery
): boolean {
  const stable = (delivery: StoredValidatedDelivery) => {
    return {
      eventId: delivery.eventId,
      wrapId: delivery.wrapId,
      rawWrapEvent: delivery.rawWrapEvent,
      sealId: delivery.sealId,
      rumorId: delivery.rumorId,
      senderPubkey: delivery.senderPubkey,
      source: delivery.source,
      engineInput: {
        raw_signed_event_hex: delivery.engineInput.raw_signed_event_hex,
        provenance: delivery.engineInput.provenance,
      },
      engineDelivery: {
        event_id: delivery.engineDelivery.event_id,
        raw_signed_event: delivery.engineDelivery.raw_signed_event,
        raw_wrap_event: delivery.engineDelivery.raw_wrap_event,
        wrap_event_id: delivery.engineDelivery.wrap_event_id,
        sender_pubkey: delivery.engineDelivery.sender_pubkey,
        provenance: delivery.engineDelivery.provenance,
      },
    }
  }
  return canonicalJson(stable(left)) === canonicalJson(stable(right))
}

function canonicalize(value: unknown): unknown {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isSafeInteger(value))
  ) {
    return value
  }
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)])
    )
  }
  throw new ImmortalStoreError(
    "session_invalid",
    "The store accepts only bounded JSON-compatible values."
  )
}

async function withBrowserLock<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(name, operation)
  }
  return operation()
}

function validateSession(session: StoredImmortalSession): void {
  if (session.schema !== "openagents.bazaar.immortal-session.v1") {
    throw new ImmortalStoreError(
      "session_invalid",
      "The session schema is unsupported."
    )
  }
  validateHex32(session.sessionId, "session ID")
  validateHex32(session.requesterPubkey, "requester public key")
  validateHex32(session.providerPubkey, "provider public key")
  validateRoute(session.selectedProviderRoute)
  validateDynamicInput(session.dynamicInput)
  if (
    session.providerPubkey !== session.selectedProviderRoute.providerPubkey ||
    session.relayUrl !== session.selectedProviderRoute.relayUrl
  ) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The selected provider route is not bound to the session."
    )
  }
  if (
    session.engineSnapshotJsonHex !== "" &&
    (!LOWER_EVEN_HEX.test(session.engineSnapshotJsonHex) ||
      session.engineSnapshotJsonHex.length > 4_194_304)
  ) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The engine snapshot is invalid."
    )
  }
  for (const record of session.signedRecords) {
    validateHex32(record.id, "signed event ID")
    validateHex32(record.pubkey, "signed event author")
    if (
      !Number.isSafeInteger(record.kind) ||
      !Number.isSafeInteger(record.createdAt)
    ) {
      throw new ImmortalStoreError(
        "session_invalid",
        "A signed record is invalid."
      )
    }
  }
  for (const delivery of session.validatedDeliveries) {
    validateHex32(delivery.eventId, "delivery event ID")
    validateOptionalHex32(delivery.wrapId, "delivery wrap ID")
    validateOptionalHex32(delivery.sealId, "delivery seal ID")
    validateOptionalHex32(delivery.rumorId, "delivery rumor ID")
    validateHex32(delivery.senderPubkey, "delivery sender")
    if (
      !Number.isSafeInteger(delivery.receivedAt) ||
      delivery.receivedAt < 0 ||
      !["counterparty", "sender_recovery", "direct"].includes(delivery.source)
    ) {
      throw new ImmortalStoreError(
        "session_invalid",
        "The validated delivery provenance is invalid."
      )
    }
    const expectedProvenance =
      delivery.source === "direct" ? "locally_signed" : "direct"
    if (
      !LOWER_EVEN_HEX.test(delivery.engineInput.raw_signed_event_hex) ||
      delivery.engineInput.observed_at !== delivery.receivedAt ||
      delivery.engineInput.provenance !== expectedProvenance ||
      delivery.engineDelivery.event_id !== delivery.eventId ||
      delivery.engineDelivery.sender_pubkey !== delivery.senderPubkey ||
      delivery.engineDelivery.observed_at !== delivery.receivedAt ||
      delivery.engineDelivery.provenance !== expectedProvenance ||
      delivery.engineDelivery.raw_wrap_event !== null ||
      delivery.engineDelivery.wrap_event_id !== null
    ) {
      throw new ImmortalStoreError(
        "session_invalid",
        "The validated delivery engine binding is invalid."
      )
    }
  }
  for (const effect of session.effects)
    validateHex32(effect.effectId, "effect ID")
}

function validateDynamicInput(
  input: StoredImmortalSession["dynamicInput"]
): void {
  if (input == null) return
  if (!/^[1-9][0-9]*$/.test(input.inputAmount)) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The dynamic input amount is not canonical."
    )
  }
  const destination = input.destination
  if (
    destination.schema !== "openagents.bazaar.regtest-destination.v1" ||
    destination.parserPackage !== "@openagentsinc/mkt-swp-destination" ||
    destination.parserRevision !== "1cc29d4318" ||
    destination.parserVersion !== 1 ||
    !/^[0-9a-f]{64}$/.test(destination.commitmentSha256) ||
    destination.canonicalValue.length === 0 ||
    destination.canonicalValue.length > 7_090
  ) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The persisted destination binding is invalid."
    )
  }
}

function validateIdentity(identity: DemoIdentity): void {
  if (
    identity.schema !== "openagents.bazaar.demo-identity.v1" ||
    !LOWER_HEX_32.test(identity.privateKeyHex) ||
    !LOWER_HEX_32.test(identity.pubkey) ||
    getPublicKey(hexToBytes(identity.privateKeyHex)) !== identity.pubkey ||
    identity.policy !== "local_demo_identity_only_never_fund_or_reuse"
  ) {
    throw new ImmortalStoreError(
      "storage_corrupt",
      "The demo identity is invalid."
    )
  }
}

function validateRoute(route: ProviderRoute): void {
  validateHex32(route.providerPubkey, "route provider public key")
  if (!route.offeringCoordinate.startsWith(`39601:${route.providerPubkey}:`)) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The route Offering is not bound to its provider."
    )
  }
  const relay = new URL(route.relayUrl)
  if (!["ws:", "wss:"].includes(relay.protocol)) {
    throw new ImmortalStoreError(
      "session_invalid",
      "The route relay is invalid."
    )
  }
}

function assertNoSessionSecrets(value: unknown, path = "session"): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSessionSecrets(item, `${path}[${index}]`)
    )
    return
  }
  if (!value || typeof value !== "object") return
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_SESSION_KEYS.has(key.toLowerCase())) {
      throw new ImmortalStoreError(
        "secret_material_refused",
        `Secret material is not allowed in ${path}.`
      )
    }
    assertNoSessionSecrets(item, `${path}.${key}`)
  }
}

function validateHex32(value: string, label: string): void {
  if (!LOWER_HEX_32.test(value)) {
    throw new ImmortalStoreError("session_invalid", `${label} is invalid.`)
  }
}

function validateOptionalHex32(value: string | null, label: string): void {
  if (value !== null) validateHex32(value, label)
}

function sessionKey(sessionId: string): string {
  return `${SESSION_PREFIX}${sessionId}`
}
