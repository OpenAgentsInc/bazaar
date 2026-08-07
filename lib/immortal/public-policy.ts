export const PUBLIC_FUNDED_QUOTE_VALIDITY_SECONDS = 300
export const PUBLIC_FUNDED_BITCOIN_BLOCK_SECONDS = 600
export const PUBLIC_FUNDED_TIMEOUT_BLOCKS = 13

/**
 * Keep the requested completion deadline beyond Immortal's funded Quote,
 * funding, and confirmation ladder. The extra margin absorbs ordinary public
 * relay and browser latency without weakening the provider's timeout checks.
 */
export const PUBLIC_FUNDED_COMPLETION_WINDOW_SECONDS = 10_800

export const PUBLIC_FUNDED_MINIMUM_LADDER_SECONDS =
  PUBLIC_FUNDED_QUOTE_VALIDITY_SECONDS +
  PUBLIC_FUNDED_TIMEOUT_BLOCKS * PUBLIC_FUNDED_BITCOIN_BLOCK_SECONDS
