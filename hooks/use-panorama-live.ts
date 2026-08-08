"use client"

import * as React from "react"
import { validatePublicHead, type Event } from "@openagentsinc/nip-mkt"

import type { PanoramaLiveInputs } from "@/hooks/use-panorama-network"
import type { PublicRegtestConfigResult } from "@/lib/immortal/public-config"
import {
  ImmortalRelayTransport,
  type RelayConnectionState,
  type RelaySnapshot,
} from "@/lib/immortal/transport"
import {
  IndexedDbStringKv,
  loadOrCreateDemoIdentity,
} from "@/lib/immortal/store"
import {
  aggregatePublicReceipts,
  normalizeRelayUrl,
  type PanoramaProviderHead,
} from "@/lib/viz/panorama-network"

const HEAD_KINDS = new Set([39_600, 39_601])
const RECEIPT_KIND = 39_603
const MAXIMUM_RECONNECT_DELAY_MS = 8_000

export function usePanoramaLive(
  publicConfig: PublicRegtestConfigResult,
  enabled: boolean
): PanoramaLiveInputs {
  const [live, setLive] = React.useState<PanoramaLiveInputs>({ clientCount: 1 })

  React.useEffect(() => {
    if (!enabled || publicConfig.state !== "ready") return
    let disposed = false
    const transports = new Map<string, ImmortalRelayTransport>()
    const reconnectTimers = new Map<string, ReturnType<typeof setTimeout>>()
    const states = new Map<string, RelayConnectionState>()
    const headsByRelay = new Map<string, Map<string, Event>>()
    const receiptsByRelay = new Map<string, Map<string, Event>>()

    const publish = () => {
      if (disposed) return
      const heads: PanoramaProviderHead[] = []
      for (const [relayUrl, relayHeads] of headsByRelay) {
        for (const event of relayHeads.values()) heads.push({ relayUrl, event })
      }
      const receipts = [...receiptsByRelay.values()].flatMap((events) => [
        ...events.values(),
      ])
      setLive({
        socketStates: Object.fromEntries(states),
        heads,
        receiptAggregates: aggregatePublicReceipts(receipts),
        clientCount: 1,
      })
    }

    const admit = (relayUrl: string, event: Event) => {
      if (!HEAD_KINDS.has(event.kind) && event.kind !== RECEIPT_KIND) return
      try {
        validatePublicHead(event)
      } catch {
        return
      }
      const target =
        event.kind === RECEIPT_KIND
          ? receiptsByRelay.get(relayUrl)!
          : headsByRelay.get(relayUrl)!
      const distinct = event.tags.find((tag) => tag[0] === "d")?.[1]
      if (!distinct) return
      const key = `${event.kind}:${event.pubkey}:${distinct}`
      const current = target.get(key)
      if (
        !current ||
        event.created_at > current.created_at ||
        (event.created_at === current.created_at && event.id < current.id)
      ) {
        target.set(key, event)
      }
    }

    const consumeSnapshot = (relayUrl: string, snapshot: RelaySnapshot) => {
      headsByRelay.set(relayUrl, new Map())
      receiptsByRelay.set(relayUrl, new Map())
      for (const event of snapshot.publicEvents) admit(relayUrl, event)
      publish()
    }

    void (async () => {
      const kv = await IndexedDbStringKv.open()
      const identity = await loadOrCreateDemoIdentity(kv)
      if (disposed) return

      const connect = async (
        relay: (typeof publicConfig.config.relays)[number],
        attempt: number
      ): Promise<void> => {
        const relayUrl = normalizeRelayUrl(relay.websocketUrl)
        transports.get(relayUrl)?.close()
        const transport = new ImmortalRelayTransport(
          relay.websocketUrl,
          identity,
          relay.contractIdentity
        )
        transports.set(relayUrl, transport)
        headsByRelay.set(relayUrl, headsByRelay.get(relayUrl) ?? new Map())
        receiptsByRelay.set(
          relayUrl,
          receiptsByRelay.get(relayUrl) ?? new Map()
        )
        try {
          await transport.connect({
            onState: (state) => {
              states.set(relayUrl, state)
              publish()
            },
            onSnapshot: async (snapshot) => consumeSnapshot(relayUrl, snapshot),
            onPublicEvent: async (event) => {
              admit(relayUrl, event)
              publish()
            },
            onPrivateEvent: async () => {},
            onDisconnect: () => scheduleReconnect(relay, attempt + 1),
          })
        } catch {
          states.set(relayUrl, "closed")
          publish()
          scheduleReconnect(relay, attempt + 1)
        }
      }

      const scheduleReconnect = (
        relay: (typeof publicConfig.config.relays)[number],
        attempt: number
      ) => {
        const relayUrl = normalizeRelayUrl(relay.websocketUrl)
        if (disposed || reconnectTimers.has(relayUrl)) return
        const delay = Math.min(
          MAXIMUM_RECONNECT_DELAY_MS,
          500 * 2 ** Math.min(attempt, 4)
        )
        reconnectTimers.set(
          relayUrl,
          setTimeout(() => {
            reconnectTimers.delete(relayUrl)
            void connect(relay, attempt)
          }, delay)
        )
      }

      await Promise.all(
        publicConfig.config.relays.map((relay) => connect(relay, 0))
      )
    })().catch(() => {
      if (!disposed) setLive({ clientCount: 1 })
    })

    return () => {
      disposed = true
      for (const timer of reconnectTimers.values()) clearTimeout(timer)
      for (const transport of transports.values()) transport.close()
    }
  }, [enabled, publicConfig])

  return live
}
