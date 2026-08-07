import { NextRequest, NextResponse } from "next/server"

import { buildPublicRegtestCsp } from "@/lib/immortal/public-csp"
import { readFundedRegtestConfig } from "@/lib/immortal/funded-manifest"
import { readImmortalDemoConfig } from "@/lib/immortal/manifest"
import { readPublicRegtestConfig } from "@/lib/immortal/public-manifest.server"

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const result = await readPublicRegtestConfig()
  const localSources: string[] = []
  if (
    result.state === "unavailable" &&
    result.code === "public_manifest_not_configured"
  ) {
    const [noSpend, funded] = await Promise.all([
      readImmortalDemoConfig(),
      readFundedRegtestConfig(),
    ])
    if (noSpend.state === "ready") {
      localSources.push(
        noSpend.config.relay.websocketUrl,
        new URL(noSpend.config.relay.healthUrl).origin
      )
    }
    if (funded.state === "ready") {
      localSources.push(funded.config.adapter.baseUrl)
    }
  }
  const policy = buildPublicRegtestCsp(
    nonce,
    result,
    process.env.NODE_ENV === "development",
    localSources
  )
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", policy)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", policy)
  response.headers.set("Cache-Control", "no-store")
  response.headers.set("X-Bazaar-Public-Regtest-State", result.state)
  response.headers.set("Referrer-Policy", "no-referrer")
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  )
  return response
}

export const config = {
  matcher: [
    {
      source: "/",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
