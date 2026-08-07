import { INACTIVE_FUNDED_RUNTIME } from "../../stories/swap/fixtures"

export function useFundedRegtest() {
  return {
    runtime: INACTIVE_FUNDED_RUNTIME,
    authorize: async () => undefined,
    refresh: async () => null,
  }
}
