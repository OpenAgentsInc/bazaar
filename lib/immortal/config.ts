export const IMMORTAL_ARTIFACT = {
  schema: "openagents.bazaar.immortal-browser-artifact.v1",
  sourceRevision: "d62a4f7c6c34a11d191fe78316fd8d4ce4da1d34",
  requesterApiSha256:
    "bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8",
  wasmSha256:
    "aee4e846a1bfb331ab3896c246e6d93ea1fcb2ef82adb4caf229760fc9cbc088",
  wasmBytes: 3_735_499,
  wasmUrl: "/immortal/immortal_client_web.wasm",
} as const

export interface ImmortalContractIdentity {
  readonly schema: "openagents.immortal.contract.v1"
  readonly contractVersion: number
  readonly crateName: "immortal"
  readonly crateVersion: string
  readonly nips: readonly {
    readonly lane: string
    readonly repo: string
    readonly subdir: string
    readonly commit: string
  }[]
}

export interface ImmortalDemoProvider {
  readonly role: "provider-a" | "provider-b"
  readonly pubkey: string
  readonly offeringCoordinate: string
  readonly policy: {
    readonly variant: string
    readonly quoteClass: "firm"
    readonly reservationClass: "soft"
    readonly quoteLifetimeSeconds: number
    readonly completionDiscountSeconds: number
    readonly settlementClaim: string
  }
  readonly health: {
    readonly state: "ready"
    readonly restartCount: number
  }
}

export interface ImmortalDemoConfig {
  readonly schema: "openagents.bazaar.immortal-demo-config.v1"
  readonly sourceRevision: string
  readonly network: "regtest"
  readonly mode: "no_spend"
  readonly relay: {
    readonly websocketUrl: string
    readonly healthUrl: string
    readonly contractSha256: string
    readonly contractIdentity: ImmortalContractIdentity
  }
  readonly providers: readonly [ImmortalDemoProvider, ImmortalDemoProvider]
  readonly lifecycle: {
    readonly terminalPath: "bilateral_contract_then_mutual_cancel"
    readonly externalSpendEffects: 0
    readonly closeLossClassification: "none"
  }
}

export type ImmortalConfigResult =
  | { readonly state: "ready"; readonly config: ImmortalDemoConfig }
  | {
      readonly state: "unavailable"
      readonly code:
        | "manifest_not_configured"
        | "manifest_unavailable"
        | "manifest_incompatible"
      readonly detail: string
    }

export type ImmortalRuntimeStatus =
  | { readonly state: "loading"; readonly detail: string }
  | {
      readonly state: "incompatible"
      readonly code: string
      readonly detail: string
    }
  | { readonly state: "unavailable"; readonly code: string; readonly detail: string }
  | { readonly state: "connecting"; readonly detail: string }
  | {
      readonly state: "reconnecting"
      readonly attempt: number
      readonly detail: string
    }
  | {
      readonly state: "live"
      readonly requesterPubkey: string
      readonly relayUrl: string
      readonly offeringCount: number
      readonly restoredSessionCount: number
      readonly checkedAt: string
    }

export interface ImmortalRuntimeProvenance {
  readonly engine: {
    readonly sourceRevision: string
    readonly requesterApiSha256: string
    readonly wasmSha256: string
    readonly abiVersion: number
  }
  readonly relay: {
    readonly url: string
    readonly software: string
    readonly version: string
    readonly contractSha256: string
    readonly directBrowserSocket: true
    readonly snapshotBeforeLive: true
    readonly nip42Authenticated: true
  }
  readonly providers: readonly {
    readonly role: string
    readonly pubkey: string
    readonly offeringCoordinate: string
  }[]
}
