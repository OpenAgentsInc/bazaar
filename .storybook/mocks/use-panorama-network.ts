// Storybook mock for @/hooks/use-panorama-network (aliased in main.ts, same
// pattern as use-immortal-runtime): serves the fixture-fed discovered-tier
// view so page-level stories render the full /network composition without
// NIP-11 probes or a signed manifest. Call arguments (publicConfig, live)
// are accepted and ignored, exactly like the other hook mocks.

import type { PanoramaNetworkView } from "../../hooks/use-panorama-network"
import { MOCK_PANORAMA_VIEW } from "../../stories/immortal/network-map-fixtures"

export function usePanoramaNetwork(): PanoramaNetworkView {
  return MOCK_PANORAMA_VIEW
}
