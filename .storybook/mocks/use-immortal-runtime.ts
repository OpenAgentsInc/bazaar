import {
  LIVE_STATUS,
  MOCK_MARKET,
  MOCK_PROVENANCE,
  READY_QUOTES,
} from "../../stories/swap/fixtures"
import { IDLE_LIFECYCLE } from "@/lib/immortal/lifecycle"

const runtimeRef = { current: null }

export function useImmortalRuntime() {
  return {
    status: LIVE_STATUS,
    provenance: MOCK_PROVENANCE,
    market: MOCK_MARKET,
    quotes: READY_QUOTES,
    lifecycle: IDLE_LIFECYCLE,
    requestQuotes: async () => undefined,
    resetQuotes: () => undefined,
    startDemo: async () => undefined,
    retryDemo: () => undefined,
    runAnotherDemo: () => undefined,
    runtimeRef,
  }
}
