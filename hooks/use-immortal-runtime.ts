"use client"

import { useEffect, useRef, useState } from "react"

import type {
  ImmortalConfigResult,
  ImmortalRuntimeProvenance,
  ImmortalRuntimeStatus,
} from "@/lib/immortal/config"
import type { ImmortalBrowserRuntime } from "@/lib/immortal/runtime"

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

  return { status, provenance, runtimeRef }
}
