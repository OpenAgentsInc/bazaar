// join_network: publishing 39600/39601 is part of join-regtest.sh's provider
// start (step 5 of the join flow). If the installed script exposes a discrete
// publish entrypoint, run it; otherwise return honest typed guidance pointing
// at spin_up_node instead of inventing a publish path.

import { spawn } from "node:child_process"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

import { ok, toolError, type ToolResult } from "../result.js"
import { defaultImmortalDir } from "./spin-up-node.js"

export interface JoinNetworkArgs {
  immortalDir?: string
}

const PUBLISH_ENTRYPOINT_PATTERNS = [
  /^\s*publish\)\s*$/m, // `case "$1" in ... publish)`
  /^\s*(?:cmd_publish|do_publish)\s*\(\)/m, // function-style entrypoint
]

export async function joinNetwork(args: JoinNetworkArgs): Promise<ToolResult> {
  const immortalDir = args.immortalDir ?? defaultImmortalDir()
  const script = join(immortalDir, "scripts", "join-regtest.sh")

  let source: string
  try {
    source = await readFile(script, "utf8")
  } catch {
    return toolError(
      "join_script_not_found",
      `${script} does not exist locally. The immortal join kit (immortal#45) publishes kind 39600 + 39601 as part of ` +
        "provider start; use spin_up_node once the kit is present in the immortal checkout."
    )
  }

  const hasPublishEntrypoint = PUBLISH_ENTRYPOINT_PATTERNS.some((pattern) =>
    pattern.test(source)
  )
  if (!hasPublishEntrypoint) {
    return toolError(
      "no_publish_entrypoint",
      "The installed join-regtest.sh has no discrete publish entrypoint. It publishes kind 39600 (provider profile) " +
        "and a bounded 39601 offering to the public relays as part of `join-regtest.sh provider` start. " +
        "Use spin_up_node (role: provider) to start — or restart — the local provider; then confirm the node appears in " +
        "network_status as a discovered-tier provider.",
      { script }
    )
  }

  const lines: string[] = []
  return await new Promise<ToolResult>((resolve) => {
    const child = spawn("bash", [script, "publish"], {
      cwd: immortalDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    const timer = setTimeout(() => child.kill("SIGTERM"), 120_000)
    const onData = (chunk: Buffer) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim().length === 0) continue
        lines.push(line)
        if (lines.length > 200) lines.shift()
      }
    }
    child.stdout.on("data", onData)
    child.stderr.on("data", onData)
    child.on("error", (cause) => {
      clearTimeout(timer)
      resolve(toolError("spawn_failed", cause.message, { script }))
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve(
          ok({
            schema: "openagents.immortal-mcp.join-network.v1",
            script,
            exitCode: code,
            outputLines: lines,
          })
        )
      } else {
        resolve(
          toolError(
            "publish_failed",
            `join-regtest.sh publish exited with code ${code}.`,
            { script, exitCode: code, outputLines: lines }
          )
        )
      }
    })
  })
}
