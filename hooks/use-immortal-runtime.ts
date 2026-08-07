"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type {
  ImmortalConfigResult,
  ImmortalRuntimeProvenance,
  ImmortalRuntimeStatus,
} from "@/lib/immortal/config"
import type { ImmortalBrowserRuntime } from "@/lib/immortal/runtime"
import type {
  ImmortalMarketSnapshot,
  QuoteRequestInput,
  QuoteState,
} from "@/lib/immortal/market"

export function useImmortalRuntime(config: ImmortalConfigResult) {
  const runtimeRef = useRef<ImmortalBrowserRuntime | null>(null)
  const [status, setStatus] = useState<ImmortalRuntimeStatus>(() =>
    config.state === "unavailable"
      ? {
          state: "unavailable",
          code: config.code,
          detail: config.detail,
        }
      : {
          state: "loading",
          detail: "Loading the pinned Immortal requester engine…",
        }
  )
  const [provenance, setProvenance] =
    useState<ImmortalRuntimeProvenance | null>(null)
  const [market, setMarket] = useState<ImmortalMarketSnapshot>({
    assets: [],
    directions: [],
    activeProviderCount: 0,
    activeOfferingCount: 0,
  })
  const [quotes, setQuotes] = useState<QuoteState>({
    state: "idle",
    detail: "Enter an offered amount to request signed quotes.",
  })

  useEffect(() => {
    let disposed = false

    if (config.state === "unavailable") {
      return () => {
        disposed = true
      }
    }

    void import("@/lib/immortal/runtime")
      .then(({ ImmortalBrowserRuntime }) => {
        if (disposed) return
        const runtime = new ImmortalBrowserRuntime({
          onStatus: setStatus,
          onProvenance: setProvenance,
          onMarket: setMarket,
          onQuotes: setQuotes,
        })
        runtimeRef.current = runtime
        return runtime.start(config)
      })
      .catch((cause: unknown) => {
        if (disposed) return
        setStatus({
          state: "incompatible",
          code: "runtime_module_unavailable",
          detail:
            cause instanceof Error
              ? cause.message
              : "The Immortal browser runtime could not be loaded.",
        })
      })

    return () => {
      disposed = true
      runtimeRef.current?.stop()
      runtimeRef.current = null
    }
  }, [config])

  const requestQuotes = useCallback((input: QuoteRequestInput) => {
    return runtimeRef.current?.requestQuotes(input) ?? Promise.resolve()
  }, [])

  const resetQuotes = useCallback(() => {
    runtimeRef.current?.resetQuotes()
  }, [])

  return {
    status,
    provenance,
    market,
    quotes,
    requestQuotes,
    resetQuotes,
    runtimeRef,
  }
}
