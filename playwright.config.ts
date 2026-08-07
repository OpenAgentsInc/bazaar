import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "@playwright/test"

const root = dirname(fileURLToPath(import.meta.url))
const externalManifest = process.env.IMMORTAL_DEMO_MANIFEST
const externalFundedManifest = process.env.IMMORTAL_FUNDED_DEMO_MANIFEST

export default defineConfig({
  testDir: "tests/browser",
  testIgnore: "funded-regtest-real.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3102",
    channel: "chrome",
    trace: "retain-on-failure",
  },
  webServer: [
    ...(externalFundedManifest
      ? []
      : [
          {
            command: "node tests/support/fake-funded-adapter.mjs",
            url: "http://127.0.0.1:18183/health",
            reuseExistingServer: false,
            timeout: 15_000,
          },
        ]),
    ...(externalManifest
      ? []
      : [
          {
            command: "node tests/support/fake-immortal-relay.mjs",
            url: "http://127.0.0.1:18182/health",
            reuseExistingServer: false,
            timeout: 15_000,
          },
        ]),
    {
      command: "pnpm dev --hostname 127.0.0.1 --port 3102",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        ...process.env,
        IMMORTAL_DEMO_MANIFEST:
          externalManifest ??
          resolve(root, "tests/fixtures/no-spend-manifest.json"),
        IMMORTAL_FUNDED_DEMO_MANIFEST:
          externalFundedManifest ??
          resolve(root, "tmp/funded-test-launch.json"),
      },
    },
  ],
})
