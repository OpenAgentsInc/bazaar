// faucet_fund: calls the public-regtest gateway faucet capability
// (request schema openagents.immortal.public-regtest-faucet-request.v1) for a
// local regtest address, then polls the returned status URL until paid or the
// 60-second bound. Regtest coins only; the address is validated client-side
// (bcrt1 prefix) before any network effect.

import {
  assertHttpUrl,
  assertRegtestAddress,
  REGTEST_NETWORK,
} from "../boundaries.js"
import { ok, toolError, type ToolResult } from "../result.js"

export const FAUCET_REQUEST_SCHEMA =
  "openagents.immortal.public-regtest-faucet-request.v1"

export interface FaucetFundArgs {
  gateway: string
  address: string
  amountSat: number
}

const MAXIMUM_AMOUNT_SAT = 10_000_000
const POLL_TIMEOUT_MS = 60_000
const POLL_INTERVAL_MS = 2_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function faucetFund(args: FaucetFundArgs): Promise<ToolResult> {
  assertRegtestAddress(args.address)
  const gateway = assertHttpUrl(args.gateway, "gateway")
  if (
    !Number.isSafeInteger(args.amountSat) ||
    args.amountSat < 1 ||
    args.amountSat > MAXIMUM_AMOUNT_SAT
  ) {
    return toolError(
      "amount_invalid",
      `amountSat must be an integer between 1 and ${MAXIMUM_AMOUNT_SAT} (regtest sats).`
    )
  }

  const endpoint = new URL(
    `${gateway.origin}${gateway.pathname.replace(/\/$/, "")}/v1/public-regtest/faucet`
  )
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema: FAUCET_REQUEST_SCHEMA,
        network: REGTEST_NETWORK,
        address: args.address,
        amount_sat: args.amountSat,
      }),
      signal: AbortSignal.timeout(10_000),
    })
  } catch (cause) {
    return toolError(
      "faucet_unreachable",
      `Could not reach the gateway faucet at ${endpoint}: ${
        cause instanceof Error ? cause.message : String(cause)
      }`
    )
  }
  if (response.status === 404) {
    return toolError(
      "faucet_unavailable",
      `The gateway at ${gateway.origin} does not expose the faucet capability yet ` +
        "(immortal join-kit program, immortal#45). No funds were sent."
    )
  }
  let body: Record<string, unknown> = {}
  try {
    body = (await response.json()) as Record<string, unknown>
  } catch {
    // non-JSON body; handled below
  }
  if (!response.ok) {
    return toolError(
      "faucet_rejected",
      `The faucet rejected the request with HTTP ${response.status}.`,
      { response: body }
    )
  }

  const statusUrl =
    typeof body.status_url === "string"
      ? body.status_url
      : typeof body.statusUrl === "string"
        ? body.statusUrl
        : undefined
  if (!statusUrl) {
    const status = typeof body.status === "string" ? body.status : undefined
    if (status === "paid" || status === "confirmed") {
      return ok({
        schema: "openagents.immortal-mcp.faucet-fund.v1",
        state: "paid",
        response: body,
      })
    }
    return ok({
      schema: "openagents.immortal-mcp.faucet-fund.v1",
      state: "submitted",
      note: "The faucet accepted the request but returned no status URL; report the raw response honestly.",
      response: body,
    })
  }

  assertHttpUrl(statusUrl, "status_url")
  const deadline = Date.now() + POLL_TIMEOUT_MS
  let lastStatus: unknown = body
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS)
    try {
      const poll = await fetch(statusUrl, {
        signal: AbortSignal.timeout(10_000),
        headers: { accept: "application/json" },
      })
      const pollBody = (await poll.json()) as Record<string, unknown>
      lastStatus = pollBody
      const status =
        typeof pollBody.status === "string" ? pollBody.status : undefined
      if (status === "paid" || status === "confirmed") {
        return ok({
          schema: "openagents.immortal-mcp.faucet-fund.v1",
          state: "paid",
          statusUrl,
          response: pollBody,
        })
      }
      if (status === "failed" || status === "rejected" || status === "expired") {
        return toolError("faucet_failed", `The faucet reported ${status}.`, {
          statusUrl,
          response: pollBody,
        })
      }
    } catch {
      // transient poll failure — keep polling until the deadline
    }
  }
  return toolError(
    "faucet_poll_timeout",
    "The faucet did not report paid within 60 seconds. The request may still settle; poll the status URL directly.",
    { statusUrl, lastStatus }
  )
}
