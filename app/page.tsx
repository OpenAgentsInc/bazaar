import { connection } from "next/server"

import { SwapPage } from "@/components/swap-page"
import { readImmortalDemoConfig } from "@/lib/immortal/manifest"

export default async function Page() {
  await connection()
  const config = await readImmortalDemoConfig()

  return <SwapPage config={config} />
}
