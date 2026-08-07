import type { ImmortalConfigResult, ImmortalDemoConfig } from "./config"
import type { PublicRegtestConfig } from "./public-config"

const BTC = "swp:1:bip122:00000000000000000000000000000000:btc:chain"
const LN = "swp:1:bip122:00000000000000000000000000000000:btc:lightning"

/**
 * Project the signed public launch into the existing direct-relay requester
 * runtime. The templates provide only pre-Quote public key shape; the live
 * destination commitment, amount, invoice, and payment hash replace their
 * fixture values in every RFQ.
 */
export function publicRequesterRuntimeConfig(
  config: PublicRegtestConfig
): ImmortalConfigResult {
  const relay = config.relays[0]
  if (!relay) {
    return {
      state: "unavailable",
      code: "manifest_incompatible",
      detail: "The signed public launch contains no relay.",
    }
  }
  const [providerA, providerB] = config.providers
  const providers = [providerA, providerB].map((provider, index) => ({
    role: provider.role,
    pubkey: provider.pubkey,
    offeringCoordinate: provider.offeringCoordinate,
    policy: {
      variant: `public-funded-${index + 1}`,
      quoteClass: "firm" as const,
      reservationClass: "soft" as const,
      quoteLifetimeSeconds: 600,
      completionDiscountSeconds: 0,
      settlementClaim: "requester_verified_rail_evidence",
    },
    health: { state: "ready" as const, restartCount: 0 },
  })) as unknown as ImmortalDemoConfig["providers"]
  const claimKey = providerA.pubkey
  const refundKey = providerB.pubkey
  return {
    state: "ready",
    config: {
      schema: "openagents.bazaar.immortal-demo-config.v1",
      sourceRevision: config.immortalRevision,
      network: "regtest",
      mode: "no_spend",
      relay: {
        websocketUrl: relay.websocketUrl,
        healthUrl: config.gateway.baseUrl,
        contractSha256: relay.contractSha256,
        contractIdentity: relay.contractIdentity,
      },
      providers,
      requestContract: {
        schema: "openagents.immortal.no-spend-request-contract.v1",
        templates: [
          {
            swapType: "submarine",
            inputAssetId: BTC,
            outputAssetId: LN,
            inputAmount: "100000",
            paymentHash: providerA.pubkey,
            invoiceSha256: providerB.pubkey,
            requesterPublicKeys: [
              { legId: "source", path: "refund", publicKey: refundKey },
            ],
          },
          {
            swapType: "reverse",
            inputAssetId: LN,
            outputAssetId: BTC,
            inputAmount: "100000",
            paymentHash: providerB.pubkey,
            invoiceSha256: null,
            requesterPublicKeys: [
              { legId: "destination", path: "claim", publicKey: claimKey },
            ],
          },
          {
            swapType: "chain",
            inputAssetId: BTC,
            outputAssetId: BTC,
            inputAmount: "100000",
            paymentHash: providerA.pubkey,
            invoiceSha256: null,
            requesterPublicKeys: [
              { legId: "destination", path: "claim", publicKey: claimKey },
              { legId: "source", path: "refund", publicKey: refundKey },
            ],
          },
        ],
      },
      lifecycle: {
        terminalPath: "bilateral_contract_then_mutual_cancel",
        externalSpendEffects: 0,
        closeLossClassification: "none",
      },
    },
  }
}
