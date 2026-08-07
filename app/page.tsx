import { connection } from "next/server"

import { SwapPage } from "@/components/swap-page"
import { readFundedRegtestConfig } from "@/lib/immortal/funded-manifest"
import { readImmortalDemoConfig } from "@/lib/immortal/manifest"

export default async function Page() {
  await connection()
  const [config, fundedConfig] = await Promise.all([
    readImmortalDemoConfig(),
    readFundedRegtestConfig(),
  ])

  return <SwapPage config={config} fundedConfig={fundedConfig} />
}
