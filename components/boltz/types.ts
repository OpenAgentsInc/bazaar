export type BoltzAssetTicker = "LN" | "BTC" | "LBTC"

export type BoltzAsset = {
  ticker: BoltzAssetTicker
  name: string
  network: string
  iconSrc: string
  disabled?: boolean
}

export const boltzAssets: BoltzAsset[] = [
  {
    ticker: "LN",
    name: "Lightning",
    network: "Bitcoin",
    iconSrc: "/boltz/lightning-icon.svg",
  },
  {
    ticker: "BTC",
    name: "Bitcoin",
    network: "On-chain",
    iconSrc: "/boltz/bitcoin-icon.svg",
  },
  {
    ticker: "LBTC",
    name: "Liquid Bitcoin",
    network: "Liquid",
    iconSrc: "/boltz/liquid-icon.svg",
  },
]

export function getBoltzAsset(ticker: BoltzAssetTicker) {
  return boltzAssets.find((asset) => asset.ticker === ticker) ?? boltzAssets[0]
}
