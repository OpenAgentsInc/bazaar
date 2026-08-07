import assert from "node:assert/strict"
import test from "node:test"

import { createPublicRegtestLaunchManifest } from "./create-public-regtest-launch-manifest.mjs"

const input = {
  signingSecret: "11".repeat(32),
  bazaarRevision: "22".repeat(20),
  immortalRevision: "33".repeat(20),
  providerA: "44".repeat(32),
  providerB: "55".repeat(32),
  lifetimeSeconds: 600,
}

test("launch signing binds explicit distinct provider identities", async () => {
  const result = await createPublicRegtestLaunchManifest(input)
  const envelope = JSON.parse(result.envelope)
  assert.deepEqual(
    envelope.manifest.providers.map(({ role, pubkey }) => ({ role, pubkey })),
    [
      { role: "provider-a", pubkey: input.providerA },
      { role: "provider-b", pubkey: input.providerB },
    ]
  )
  assert.deepEqual(
    JSON.parse(envelope.signature_event.content),
    envelope.manifest
  )
  assert.match(envelope.signature_event.content, new RegExp(input.providerA))
  assert.match(envelope.signature_event.content, new RegExp(input.providerB))
})

test("launch signing refuses missing or duplicate providers", async () => {
  await assert.rejects(
    createPublicRegtestLaunchManifest({ ...input, providerA: undefined }),
    /provider A pubkey/
  )
  await assert.rejects(
    createPublicRegtestLaunchManifest({ ...input, providerB: input.providerA }),
    /providers must be distinct/
  )
})
