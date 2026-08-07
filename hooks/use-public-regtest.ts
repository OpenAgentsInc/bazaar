"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import {
  buildDynamicPublicRegtestRequestJson,
  type ValidatedRegtestDestination,
} from "@/lib/immortal/destination"
import {
  reviewedQuoteFeeCeiling,
  type ValidatedQuote,
} from "@/lib/immortal/market"
import type { PublicRegtestConfigResult } from "@/lib/immortal/public-config"
import {
  BrowserPublicSessionStorage,
  PublicRegtestGatewayClient,
  PublicRegtestGatewayError,
  type PublicRegtestCapability,
  type PublicRegtestSessionManifest,
} from "@/lib/immortal/public-session"

const POLL_MILLISECONDS = 1_000

export type PublicRegtestRuntimeState =
  | { readonly state: "inactive"; readonly detail: string }
  | { readonly state: "creating"; readonly detail: string }
  | {
      readonly state: "ready"
      readonly detail: string
      readonly manifest: PublicRegtestSessionManifest
    }
  | {
      readonly state: "submitted" | "authorizing" | "watching"
      readonly detail: string
      readonly manifest: PublicRegtestSessionManifest
    }
  | {
      readonly state: "complete"
      readonly detail: string
      readonly manifest: PublicRegtestSessionManifest
    }
  | {
      readonly state: "error"
      readonly code: string
      readonly detail: string
      readonly retryable: boolean
      readonly manifest: PublicRegtestSessionManifest | null
    }

export function usePublicRegtest(
  result: PublicRegtestConfigResult,
  requesterIdentity: string | null,
  enabled: boolean
) {
  const initialRuntime: PublicRegtestRuntimeState = {
    state: "inactive",
    detail: "Public regtest mode is not selected.",
  }
  const clientRef = useRef<PublicRegtestGatewayClient | null>(null)
  const capabilityRef = useRef<PublicRegtestCapability | null>(null)
  const disposedRef = useRef(false)
  const admittingRef = useRef<string | null>(null)
  const runtimeRef = useRef<PublicRegtestRuntimeState>(initialRuntime)
  const [runtime, setRuntimeState] =
    useState<PublicRegtestRuntimeState>(initialRuntime)

  const setRuntime = useCallback((next: PublicRegtestRuntimeState) => {
    runtimeRef.current = next
    setRuntimeState(next)
  }, [])

  const refresh = useCallback(async () => {
    const client = clientRef.current
    const capability = capabilityRef.current
    if (!client || !capability) return null
    const manifest = await client.refresh(capability)
    if (manifest.revoked) {
      throw new PublicRegtestGatewayError(
        "session_revoked",
        false,
        null,
        "This public regtest session was revoked."
      )
    }
    const journey = manifest.journey
    if (journey?.stage === "completed") {
      const rails = new Set(journey.requesterEvidence.map(({ rail }) => rail))
      if (
        !journey.unselectedReleased ||
        !rails.has("bitcoin") ||
        !rails.has("lightning")
      ) {
        throw new PublicRegtestGatewayError(
          "terminal_evidence_incomplete",
          false,
          null,
          "Terminal settlement lacks independent Bitcoin, Lightning, or loser-release evidence."
        )
      }
      setRuntime({
        state: "complete",
        detail:
          "Swap complete with requester-verified Bitcoin and Lightning evidence.",
        manifest,
      })
      return manifest
    }
    if (journey?.stage === "failed" || journey?.stage === "recoverable") {
      setRuntime({
        state: "error",
        code: journey.errorCode ?? "recovery_required",
        detail:
          journey.stage === "recoverable"
            ? "The funded session stopped safely and retained recovery evidence."
            : "The funded session failed before terminal evidence was complete.",
        retryable: false,
        manifest,
      })
      return manifest
    }
    const pending = manifest.effects.find(
      (effect) => effect.state === "authorized"
    )
    if (pending && admittingRef.current !== pending.effectId) {
      admittingRef.current = pending.effectId
      setRuntime({
        state: "authorizing",
        detail: "Admitting the exact requester-engine effect…",
        manifest,
      })
      void client
        .admitEffect(capability, pending)
        .then(() => {
          if (disposedRef.current) return
          setRuntime({
            state: "watching",
            detail: "Effect admitted. Waiting for independent rail evidence…",
            manifest,
          })
        })
        .catch((cause: unknown) => {
          if (!disposedRef.current) setRuntime(gatewayFailure(cause, manifest))
        })
        .finally(() => {
          if (admittingRef.current === pending.effectId)
            admittingRef.current = null
        })
    } else if (manifest.dynamicRequest && !pending) {
      setRuntime({
        state: manifest.effects.length > 0 ? "watching" : "submitted",
        detail:
          manifest.effects.length > 0
            ? "The exact effect is admitted; verifying both rails…"
            : "Request accepted. Waiting for two funded provider Quotes…",
        manifest,
      })
    } else if (runtimeRef.current.state === "creating") {
      setRuntime({
        state: "ready",
        detail: "Isolated public regtest session ready.",
        manifest,
      })
    }
    return manifest
  }, [setRuntime])

  useEffect(() => {
    disposedRef.current = false
    admittingRef.current = null
    clientRef.current = null
    capabilityRef.current = null
    if (!enabled || result.state !== "ready" || !requesterIdentity) {
      queueMicrotask(() => {
        if (!disposedRef.current) {
          setRuntime({
            state: "inactive",
            detail:
              result.state === "ready"
                ? "Waiting for the local requester identity."
                : "Public regtest is not configured.",
          })
        }
      })
      return () => {
        disposedRef.current = true
      }
    }

    const client = new PublicRegtestGatewayClient(
      result.config,
      window.location.origin,
      new BrowserPublicSessionStorage()
    )
    clientRef.current = client
    let timer: ReturnType<typeof setTimeout> | undefined

    const initialize = async () => {
      try {
        setRuntime({
          state: "creating",
          detail: "Creating an isolated public regtest session…",
        })
        let capability = client.restore(requesterIdentity)
        let manifest: PublicRegtestSessionManifest
        if (capability) {
          manifest = await client.refresh(capability)
        } else {
          const created = await client.create(requesterIdentity)
          capability = created.capability
          manifest = created.manifest
        }
        capabilityRef.current = capability
        if (disposedRef.current) return
        setRuntime({
          state: manifest.dynamicRequest ? "submitted" : "ready",
          detail: manifest.dynamicRequest
            ? "Restored the exact funded request."
            : "Isolated public regtest session ready.",
          manifest,
        })
        const poll = async () => {
          try {
            await refresh()
          } catch (cause) {
            if (!disposedRef.current)
              setRuntime(
                gatewayFailure(cause, manifestFromState(runtimeRef.current))
              )
          } finally {
            if (!disposedRef.current)
              timer = setTimeout(poll, POLL_MILLISECONDS)
          }
        }
        timer = setTimeout(poll, POLL_MILLISECONDS)
      } catch (cause) {
        if (!disposedRef.current) setRuntime(gatewayFailure(cause, null))
      }
    }
    void initialize()

    return () => {
      disposedRef.current = true
      if (timer) clearTimeout(timer)
      clientRef.current = null
      capabilityRef.current = null
    }
  }, [enabled, refresh, requesterIdentity, result, setRuntime])

  const start = useCallback(
    async (
      quote: ValidatedQuote,
      reviewedQuotes: readonly ValidatedQuote[],
      destination: ValidatedRegtestDestination
    ) => {
      const client = clientRef.current
      const capability = capabilityRef.current
      const current = runtimeRef.current
      if (!client || !capability || current.state !== "ready") return
      try {
        const now = Math.floor(Date.now() / 1_000)
        const expiresAt = Math.min(
          now + 300,
          destination.expiresAt ?? now + 300
        )
        const request = buildDynamicPublicRegtestRequestJson({
          requestId: randomHex32(),
          inputAmountSat: quote.inputAmount,
          maximumTotalFeeSat: reviewedQuoteFeeCeiling(quote, reviewedQuotes),
          createdAt: now,
          expiresAt,
          destination,
        })
        await client.submitDynamicRequest(capability, request)
        const manifest = await client.refresh(capability)
        setRuntime({
          state: "submitted",
          detail: "Request accepted. Waiting for two funded provider Quotes…",
          manifest,
        })
      } catch (cause) {
        setRuntime(
          gatewayFailure(cause, "manifest" in current ? current.manifest : null)
        )
      }
    },
    [setRuntime]
  )

  const allocateInput = useCallback(
    async (swapType: "reverse" | "submarine", amountSat: number) => {
      const client = clientRef.current
      const capability = capabilityRef.current
      if (!client || !capability || runtimeRef.current.state !== "ready") {
        throw new PublicRegtestGatewayError(
          "demo_input_unavailable",
          true,
          null,
          "The isolated public regtest session is not ready."
        )
      }
      return client.allocateDemoInput(capability, swapType, amountSat)
    },
    []
  )

  const startAnother = useCallback(async () => {
    const client = clientRef.current
    const capability = capabilityRef.current
    if (!client || !capability || !requesterIdentity) return
    try {
      await client.revoke(capability)
      const created = await client.create(requesterIdentity)
      capabilityRef.current = created.capability
      setRuntime({
        state: "ready",
        detail: "New isolated public regtest session ready.",
        manifest: created.manifest,
      })
    } catch (cause) {
      setRuntime(gatewayFailure(cause, manifestFromState(runtimeRef.current)))
    }
  }, [requesterIdentity, setRuntime])

  return { runtime, allocateInput, start, startAnother, refresh }
}

function manifestFromState(
  state: PublicRegtestRuntimeState
): PublicRegtestSessionManifest | null {
  return "manifest" in state ? state.manifest : null
}

function gatewayFailure(
  cause: unknown,
  manifest: PublicRegtestSessionManifest | null
): PublicRegtestRuntimeState {
  if (cause instanceof PublicRegtestGatewayError) {
    return {
      state: "error",
      code: cause.code,
      detail: cause.message,
      retryable: cause.retryable,
      manifest,
    }
  }
  return {
    state: "error",
    code: "public_session_unavailable",
    detail: "The public regtest session is temporarily unavailable.",
    retryable: true,
    manifest,
  }
}

function randomHex32(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}
