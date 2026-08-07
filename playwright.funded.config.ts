import { defineConfig } from "@playwright/test"

const launchManifest = process.env.IMMORTAL_FUNDED_DEMO_MANIFEST
if (!launchManifest) {
  throw new Error("IMMORTAL_FUNDED_DEMO_MANIFEST is required")
}

export default defineConfig({
  testDir: "tests/browser",
  testMatch: "funded-regtest-real.spec.ts",
  timeout: 1_200_000,
  expect: { timeout: 900_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3000",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm dev --hostname 127.0.0.1 --port 3000",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ...process.env,
      IMMORTAL_FUNDED_DEMO_MANIFEST: launchManifest,
    },
  },
})
