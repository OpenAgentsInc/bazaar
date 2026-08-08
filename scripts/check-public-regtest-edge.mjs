#!/usr/bin/env node

import { randomBytes } from "node:crypto"

const origin =
  process.env.BAZAAR_PUBLIC_REGTEST_URL ?? "https://bazaar.openagents.com"
const gateway =
  process.env.BAZAAR_PUBLIC_REGTEST_GATEWAY_URL ??
  "https://gateway.34-41-78-122.sslip.io"
const approvedSources = [
  "https://gateway.34-41-78-122.sslip.io",
  "wss://relay-a.34-41-78-122.nip.io",
  "wss://relay-b.34-41-78-122.sslip.io",
]

const site = await fetch(origin, { redirect: "error" })
assert(site.status === 200, `public site returned ${site.status}`)
assertHeader(site, "strict-transport-security", /max-age=31536000/i)
assertHeader(site, "x-frame-options", /^DENY$/i)
assertHeader(site, "x-content-type-options", /^nosniff$/i)
assertHeader(site, "referrer-policy", /^no-referrer$/i)
assertHeader(site, "cache-control", /no-store/i)
assertHeader(site, "x-bazaar-public-regtest-state", /^ready$/i)
const csp = requiredHeader(site, "content-security-policy")
for (const source of approvedSources) {
  assert(csp.includes(source), `CSP omits approved source ${source}`)
}
assert(!/(?:^|[ ;])\*(?:[ ;]|$)/.test(csp), "CSP contains a wildcard source")

const rejectedOrigin = "https://unapproved.invalid"
const rejected = await fetch(`${gateway}/v1/public-regtest/sessions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Origin: rejectedOrigin,
  },
  body: JSON.stringify({
    schema: "openagents.immortal.public-regtest-session-create.v1",
    requester_identity: randomBytes(32).toString("hex"),
    client_nonce: randomBytes(32).toString("hex"),
  }),
})
assert(rejected.status === 403, `unapproved origin returned ${rejected.status}`)
assert(
  rejected.headers.get("access-control-allow-origin") !== rejectedOrigin,
  "gateway authorized an unapproved origin"
)

process.stdout.write(
  "public-regtest edge gate: headers, CSP, readiness, and origin denial passed\n"
)

function requiredHeader(response, name) {
  const value = response.headers.get(name)
  assert(value !== null, `public site omitted ${name}`)
  return value
}

function assertHeader(response, name, expected) {
  const value = requiredHeader(response, name)
  assert(expected.test(value), `${name} did not match the release policy`)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}
