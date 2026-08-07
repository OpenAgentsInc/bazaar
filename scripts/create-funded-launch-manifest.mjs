#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const NETWORK = "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4"
const CONTRACT_SCHEMA = "openagents.immortal.browser-demo-contract.v1"
const CONTRACT_SHA256 =
  "1edc8f07b859832dd95f11fbed9831ebfd53bc11cf8d8d5156509556c023856d"
const SOURCE_REVISION = "69a78231ffeae5a78fe45de9aba122db00178953"
const REQUESTER_API_SHA256 =
  "bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8"
const WASM_SHA256 =
  "7cd00d973892ed90348c1101447c05a8194c3258a3bb5e6fd92dd0fc62130505"

export async function writeFundedLaunchManifest({
  output,
  adapter,
  origin,
  immortalRevision,
  bazaarRevision,
  lifetimeSeconds = 3_600,
}) {
  const outputPath = resolve(required(output, "output"))
  const adapterOrigin = loopbackOrigin(adapter, "adapter")
  const browserOrigin = loopbackOrigin(origin, "origin")
  const immortal = revision(immortalRevision, "Immortal revision")
  const bazaar = revision(bazaarRevision, "Bazaar revision")
  if (
    !Number.isInteger(lifetimeSeconds) ||
    lifetimeSeconds < 60 ||
    lifetimeSeconds > 3_600
  ) {
    throw new Error("lifetime must be an integer from 60 through 3600 seconds")
  }
  const now = Math.floor(Date.now() / 1_000)
  const manifest = {
    schema: "openagents.bazaar.funded-regtest-launch.v1",
    mode: "unsafe_local_funded_regtest_demo",
    network: NETWORK,
    created_at: now,
    expires_at: now + lifetimeSeconds,
    adapter: {
      base_url: adapterOrigin,
      allowed_origin: browserOrigin,
      contract_schema: CONTRACT_SCHEMA,
      contract_sha256: CONTRACT_SHA256,
    },
    engine: {
      source_revision: SOURCE_REVISION,
      requester_api_sha256: REQUESTER_API_SHA256,
      wasm_sha256: WASM_SHA256,
      browser_abi_version: 1,
    },
    launcher: {
      immortal_revision: immortal,
      bazaar_revision: bazaar,
    },
  }
  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  })
  return outputPath
}

function loopbackOrigin(value, label) {
  const parsed = new URL(required(value, label))
  if (
    parsed.protocol !== "http:" ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !parsed.port ||
    !/^127(?:\.(?:0|[1-9][0-9]{0,2})){3}$/.test(parsed.hostname)
  ) {
    throw new Error(
      `${label} must be an exact numeric IPv4 loopback HTTP origin`
    )
  }
  return parsed.origin
}

function revision(value, label) {
  const candidate = required(value, label)
  if (!/^[0-9a-f]{40}$/.test(candidate)) {
    throw new Error(`${label} must be lower hex-20`)
  }
  return candidate
}

function required(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} is required`)
  }
  return value
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const values = new Map()
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index]
    const value = process.argv[index + 1]
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("arguments must be --name value pairs")
    }
    values.set(key.slice(2), value)
  }
  const output = await writeFundedLaunchManifest({
    output: values.get("output"),
    adapter: values.get("adapter"),
    origin: values.get("origin"),
    immortalRevision: values.get("immortal-revision"),
    bazaarRevision: values.get("bazaar-revision"),
    lifetimeSeconds: values.has("lifetime")
      ? Number(values.get("lifetime"))
      : undefined,
  })
  process.stdout.write(`${output}\n`)
}
