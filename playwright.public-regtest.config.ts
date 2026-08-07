import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { defineConfig } from "@playwright/test"

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  testDir: resolve(root, "tests/public-regtest"),
  timeout: 12 * 60_000,
  expect: { timeout: 60_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL:
      process.env.BAZAAR_PUBLIC_REGTEST_URL ?? "https://bazaar.openagents.com",
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
})
