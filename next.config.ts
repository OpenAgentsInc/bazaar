import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@openagentsinc/nip-mkt"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ]
  },
}

export default nextConfig
