import type { Metadata } from "next"
import { connection } from "next/server"

import { NetworkPage } from "@/components/network-page"
import { readPublicRegtestConfig } from "@/lib/immortal/public-manifest.server"

export const metadata: Metadata = {
  title: "Immortal network map — public regtest",
  description:
    "Live birds-eye map of the public regtest swap network: relays, providers, activity, and how to join. Regtest sats — not real value.",
}

export default async function Page() {
  await connection()
  const publicConfig = await readPublicRegtestConfig()
  return <NetworkPage publicConfig={publicConfig} />
}
