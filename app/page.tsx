import { connection } from "next/server"

import { SwapPage } from "@/components/swap-page"
import { readFundedRegtestConfig } from "@/lib/immortal/funded-manifest"
import { readImmortalDemoConfig } from "@/lib/immortal/manifest"
import { readPublicRegtestConfig } from "@/lib/immortal/public-manifest.server"

export default async function Page() {
  await connection()
  const [config, fundedConfig, publicConfig] = await Promise.all([
    readImmortalDemoConfig(),
    readFundedRegtestConfig(),
    readPublicRegtestConfig(),
  ])

  return (
    <SwapPage
      config={config}
      fundedConfig={fundedConfig}
      publicConfig={publicConfig}
    />
  )
}
