export type BoltzReferenceKind =
  | "foundation"
  | "input"
  | "swap"
  | "payment"
  | "wallet"
  | "recovery"
  | "shell"
  | "setting"
  | "status"
  | "screen"

export interface BoltzReferenceEntry {
  readonly name: string
  readonly path: string
  readonly kind: BoltzReferenceKind
  readonly summary: string
}

function words(name: string) {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
}

function entries(
  names: readonly string[],
  path: string,
  kind: BoltzReferenceKind,
  purpose: string
): BoltzReferenceEntry[] {
  return names.map((name) => ({
    name,
    path: `${path}/${name}.tsx`,
    kind,
    summary: `${words(name)} ${purpose}`,
  }))
}

export const boltzReferenceComponents: readonly BoltzReferenceEntry[] = [
  ...entries(
    [
      "Accordion",
      "Asset",
      "BlockExplorer",
      "BlockExplorerLink",
      "Chart",
      "CopyBox",
      "CopyButton",
      "ExternalLink",
      "LoadingSpinner",
      "Pagination",
      "QrCode",
      "Select",
      "SwapIcons",
    ],
    "components",
    "foundation",
    "provides a reusable display primitive."
  ),
  ...entries(
    [
      "AddressInput",
      "AmountDenominator",
      "AssetSelect",
      "HardwareDerivationPaths",
      "InvoiceInput",
      "MnemonicInput",
      "NetworkSelect",
      "QrScan",
      "RescueFileInput",
      "RescueFileUpload",
    ],
    "components",
    "input",
    "captures and validates swap data."
  ),
  ...entries(
    [
      "CreateButton",
      "FeeComparisonTable",
      "Fees",
      "FeesCollapse",
      "FiatAmount",
      "OptimizedRoute",
      "Reverse",
      "SwapChecker",
      "SwapExecutionWorker",
      "SwapHeader",
      "SwapLimits",
      "SwapList",
      "SwapListLogs",
    ],
    "components",
    "swap",
    "represents swap quoting, creation, or history."
  ),
  ...entries(
    [
      "ApproveErc20",
      "ApproveTrc20",
      "ContractTransaction",
      "LockupEvm",
      "PayInvoice",
      "PayOnchain",
      "RefundButton",
      "RefundEta",
      "SendToBridge",
      "WaitForBridge",
    ],
    "components",
    "payment",
    "coordinates an exact external payment effect."
  ),
  {
    name: "BridgeSendRecovery",
    path: "components/BridgeSendRecovery.ts",
    kind: "payment",
    summary:
      "Bridge Send Recovery coordinates an exact external payment effect.",
  },
  ...entries(
    ["ConnectWallet", "WalletConnect", "WeblnButton"],
    "components",
    "wallet",
    "connects an external wallet without taking custody."
  ),
  ...entries(
    [
      "BackupDownloadContent",
      "BackupFlow",
      "BackupVerifyContent",
      "MnemonicBackupContent",
      "MnemonicVerifyContent",
    ],
    "components",
    "recovery",
    "protects or restores user-held recovery material."
  ),
  ...entries(
    [
      "Footer",
      "InsufficientBalance",
      "LegacyRescueRedirects",
      "Nav",
      "Notification",
      "ProBanner",
      "Warning",
      "Warnings",
    ],
    "components",
    "shell",
    "communicates application navigation or state."
  ),
  ...entries(
    [
      "BitcoinOnly",
      "Denomination",
      "FiatCurrencySetting",
      "GasTopUp",
      "Logs",
      "PrivacyMode",
      "RescueKey",
      "Separator",
      "SettingsCog",
      "SettingsMenu",
      "Slippage",
      "Tooltip",
      "ZeroConf",
    ],
    "components/settings",
    "setting",
    "configures a bounded client-side preference."
  ),
]

export const boltzReferenceStatuses: readonly BoltzReferenceEntry[] = entries(
  [
    "Broadcasting",
    "CommitmentCreated",
    "CommitmentRejected",
    "InvoiceExpired",
    "InvoiceFailedToPay",
    "InvoicePending",
    "InvoiceSet",
    "PreBridgeDexQuoteBlocked",
    "SwapCreated",
    "SwapExpired",
    "SwapRefunded",
    "TransactionClaimed",
    "TransactionConfirmed",
    "TransactionLockupFailed",
    "TransactionMempool",
  ],
  "status",
  "status",
  "is a distinct swap lifecycle state."
)

export const boltzReferenceScreens: readonly BoltzReferenceEntry[] = [
  ...entries(
    [
      "ClaimRescue",
      "Create",
      "Error",
      "ErrorWasm",
      "FeeComparison",
      "GasAbstractionSweepRescue",
      "Hero",
      "History",
      "NotFound",
      "Pay",
      "Privacy",
      "RefundEvm",
      "RefundRescue",
      "Rescue",
      "RescueEvm",
      "Terms",
    ],
    "pages",
    "screen",
    "is represented as a complete responsive application screen."
  ),
  ...entries(
    ["Btcpay", "Client", "Pro", "Products"],
    "pages/products",
    "screen",
    "is represented as a complete product screen."
  ),
  ...entries(
    ["MethodSelection", "Recovery", "Results"],
    "pages/external-rescue",
    "screen",
    "is represented as a complete external recovery screen."
  ),
]

export const boltzReferenceInventory = [
  ...boltzReferenceComponents,
  ...boltzReferenceStatuses,
  ...boltzReferenceScreens,
] as const

export const boltzReferenceCounts = {
  components: boltzReferenceComponents.length,
  statuses: boltzReferenceStatuses.length,
  screens: boltzReferenceScreens.length,
  total: boltzReferenceInventory.length,
} as const
