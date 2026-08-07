"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { FundedRegtestConfigResult } from "@/lib/immortal/funded-config"
import {
  fundedEffectWire,
  parseFundedEffectReceipt,
  parseFundedSessionManifest,
  type FundedEffectReceipt,
  type FundedSessionManifest,
} from "@/lib/immortal/funded-session"

const MAXIMUM_RESPONSE_BYTES = 16_384
const POLL_INTERVAL_MILLISECONDS = 500

export type FundedRuntimeState =
  | { readonly state: "inactive"; readonly detail: string }
  | { readonly state: "unavailable"; readonly detail: string }
  | { readonly state: "connecting"; readonly detail: string }
  | {
      readonly state: "ready"
      readonly detail: string
      readonly session: FundedSessionManifest
    }
  | {
      readonly state: "authorizing"
      readonly detail: string
      readonly session: FundedSessionManifest
    }
  | {
      readonly state: "watching"
      readonly detail: string
      readonly session: FundedSessionManifest
      readonly receipt: FundedEffectReceipt
    }
  | {
      readonly state: "complete"
      readonly detail: string
      readonly session: FundedSessionManifest
    }
  | {
      readonly state: "error"
      readonly detail: string
      readonly session: FundedSessionManifest | null
    }

export function useFundedRegtest(
  result: FundedRegtestConfigResult,
  enabled: boolean
) {
  const disposedRef = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  const [runtime, setRuntime] = useState<FundedRuntimeState>({
    state: "inactive",
    detail: "Funded regtest mode is not selected.",
  })
  const runtimeRef = useRef(runtime)

  useEffect(() => {
    runtimeRef.current = runtime
  }, [runtime])

  const refresh = useCallback(async () => {
    if (!enabled || result.state !== "ready") return null
    const config = result.config
    ensureLaunchIsCurrent(config.expiresAt)
    ensureBrowserOrigin(config.adapter.allowedOrigin)
    const response = await fetch(`${config.adapter.baseUrl}/v1/session`, {
      method: "GET",
      cache: "no-store",
      credentials: "omit",
      redirect: "error",
      signal: requestRef.current?.signal,
      headers: { Accept: "application/json" },
    })
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Funded adapter returned HTTP ${response.status}.`)
    }
    const value = await readBoundedJson(response)
    return parseFundedSessionManifest(value, config, window.location.origin)
  }, [enabled, result])

  useEffect(() => {
    disposedRef.current = false
    requestRef.current?.abort()
    requestRef.current = null

    if (!enabled) {
      setRuntime({
        state: "inactive",
        detail: "Funded regtest mode is not selected.",
      })
      return () => {
        disposedRef.current = true
      }
    }
    if (result.state === "unavailable") {
      setRuntime({ state: "unavailable", detail: result.detail })
      return () => {
        disposedRef.current = true
      }
    }

    let timer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    requestRef.current = controller
    setRuntime({
      state: "connecting",
      detail: "Waiting for the bounded Immortal funded session…",
    })

    const poll = async () => {
      try {
        const session = await refresh()
        if (disposedRef.current) return
        if (!session) {
          setRuntime((current) =>
            current.state === "authorizing" || current.state === "watching"
              ? current
              : {
                  state: "connecting",
                  detail: "Waiting for the bounded Immortal funded session…",
                }
          )
        } else {
          setRuntime((current) => projectSession(session, current))
        }
      } catch (cause) {
        if (disposedRef.current || controller.signal.aborted) return
        setRuntime((current) => ({
          state: "error",
          detail: errorDetail(cause),
          session: "session" in current ? current.session : null,
        }))
      } finally {
        if (!disposedRef.current) {
          timer = setTimeout(poll, POLL_INTERVAL_MILLISECONDS)
        }
      }
    }
    void poll()

    return () => {
      disposedRef.current = true
      if (timer) clearTimeout(timer)
      controller.abort()
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [enabled, refresh, result])

  const authorize = useCallback(async () => {
    if (result.state !== "ready") return
    const current = runtimeRef.current
    if (current.state !== "ready") return
    const session = current.session
    const authorizing: FundedRuntimeState = {
      state: "authorizing",
      detail: "Authorizing this exact engine-issued regtest effect…",
      session,
    }
    runtimeRef.current = authorizing
    setRuntime(authorizing)
    const effect = session.journeys[session.activeJourney]?.pendingEffect
    if (!effect) return

    try {
      ensureLaunchIsCurrent(result.config.expiresAt)
      ensureBrowserOrigin(result.config.adapter.allowedOrigin)
      const response = await fetch(
        `${result.config.adapter.baseUrl}/v1/effects`,
        {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          redirect: "error",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(fundedEffectWire(effect)),
        }
      )
      if (!response.ok) {
        throw new Error(`Funded effect returned HTTP ${response.status}.`)
      }
      const receipt = parseFundedEffectReceipt(
        await readBoundedJson(response),
        effect
      )
      if (disposedRef.current) return
      setRuntime({
        state: "watching",
        detail: "Effect admitted. Waiting for both local rail proofs…",
        session,
        receipt,
      })
    } catch (cause) {
      if (disposedRef.current) return
      setRuntime({
        state: "error",
        detail: errorDetail(cause),
        session,
      })
    }
  }, [result])

  return { runtime, authorize, refresh }
}

function projectSession(
  session: FundedSessionManifest,
  current: FundedRuntimeState
): FundedRuntimeState {
  const journey = session.journeys[session.activeJourney]
  if (!journey) {
    return {
      state: "error",
      detail: "The active funded journey disappeared.",
      session,
    }
  }
  if (
    journey.requesterVerification.state === "terminal_rail_evidence_verified"
  ) {
    return {
      state: "complete",
      detail: "Both local regtest rails verified by Immortal.",
      session,
    }
  }
  if (journey.effectReceipt) {
    return {
      state: "watching",
      detail: "Effect admitted. Waiting for both local rail proofs…",
      session,
      receipt: journey.effectReceipt,
    }
  }
  if (current.state === "authorizing") {
    return { ...current, session }
  }
  return {
    state: "ready",
    detail: "Review and authorize the exact engine-issued regtest effect.",
    session,
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length")
  if (length && Number(length) > MAXIMUM_RESPONSE_BYTES) {
    throw new Error("Funded adapter response exceeds 16 KiB.")
  }
  const text = await response.text()
  if (
    !text ||
    new TextEncoder().encode(text).byteLength > MAXIMUM_RESPONSE_BYTES
  ) {
    throw new Error("Funded adapter response is empty or exceeds 16 KiB.")
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("Funded adapter response is not JSON.")
  }
}

function ensureBrowserOrigin(expected: string): void {
  if (window.location.origin !== expected) {
    throw new Error("This browser origin is not authorized by the funded lab.")
  }
}

function ensureLaunchIsCurrent(expiresAt: number): void {
  if (expiresAt <= Math.floor(Date.now() / 1_000)) {
    throw new Error("The funded launch manifest expired. Restart the lab.")
  }
}

function errorDetail(cause: unknown): string {
  return cause instanceof Error
    ? cause.message
    : "The funded regtest bridge failed closed."
}
