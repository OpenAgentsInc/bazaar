// spin_up_node: runs the immortal join kit's `scripts/join-regtest.sh`
// locally. Effectful — hosts should require approval. The script (not this
// server) generates and owns the provider keys.
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { assertHttpUrl, assertWsUrl } from "../boundaries.js";
import { ok, toolError } from "../result.js";
const TIMEOUT_MS = 15 * 60 * 1000;
const MAXIMUM_LINES = 200;
export function defaultImmortalDir() {
    return process.env.IMMORTAL_DIR ?? join(homedir(), "work", "immortal");
}
export async function spinUpNode(args, onLine) {
    if (args.relays)
        for (const relay of args.relays)
            assertWsUrl(relay, "relays[]");
    if (args.gateway)
        assertHttpUrl(args.gateway, "gateway");
    if (args.addnode && !/^[a-z0-9.:[\]-]{1,253}$/i.test(args.addnode)) {
        return toolError("addnode_invalid", "addnode must be a host[:port] peer endpoint.");
    }
    const immortalDir = args.immortalDir ?? defaultImmortalDir();
    const script = join(immortalDir, "scripts", "join-regtest.sh");
    try {
        await stat(script);
    }
    catch {
        return toolError("join_script_not_found", `${script} does not exist. The immortal join kit (immortal#45) is not present in this checkout. ` +
            "Clone https://github.com/OpenAgentsInc/immortal (or set IMMORTAL_DIR/immortalDir) and update it once the join kit lands.");
    }
    const scriptArgs = [args.role, "--network", "public-regtest"];
    if (args.relays && args.relays.length > 0) {
        scriptArgs.push("--relays", args.relays.join(","));
    }
    if (args.addnode)
        scriptArgs.push("--addnode", args.addnode);
    if (args.gateway)
        scriptArgs.push("--gateway", args.gateway);
    const lines = [];
    const pushLine = (line) => {
        if (line.length === 0)
            return;
        lines.push(line.length > 2_000 ? `${line.slice(0, 2_000)}…` : line);
        if (lines.length > MAXIMUM_LINES)
            lines.shift();
        try {
            onLine?.(line);
        }
        catch {
            // progress notification failures must not kill the join
        }
    };
    return await new Promise((resolve) => {
        const child = spawn("bash", [script, ...scriptArgs], {
            cwd: immortalDir,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        let timedOut = false;
        const timer = setTimeout(() => {
            timedOut = true;
            child.kill("SIGTERM");
            setTimeout(() => child.kill("SIGKILL"), 10_000).unref();
        }, TIMEOUT_MS);
        let buffer = "";
        const onData = (chunk) => {
            buffer += chunk.toString();
            let index = buffer.indexOf("\n");
            while (index >= 0) {
                pushLine(buffer.slice(0, index).trimEnd());
                buffer = buffer.slice(index + 1);
                index = buffer.indexOf("\n");
            }
        };
        child.stdout.on("data", onData);
        child.stderr.on("data", onData);
        child.on("error", (cause) => {
            clearTimeout(timer);
            resolve(toolError("spawn_failed", cause.message, {
                script,
                args: scriptArgs,
            }));
        });
        child.on("close", (code, signal) => {
            clearTimeout(timer);
            if (buffer.trim().length > 0)
                pushLine(buffer.trimEnd());
            const payload = {
                schema: "openagents.immortal-mcp.spin-up-node.v1",
                script,
                args: scriptArgs,
                exitCode: code,
                signal: signal ?? null,
                timedOut,
                outputLines: lines,
                outputNote: `last ${MAXIMUM_LINES} lines at most`,
            };
            if (timedOut) {
                resolve(toolError("join_timeout", "join-regtest.sh exceeded the 15-minute bound and was terminated.", payload));
            }
            else if (code === 0) {
                resolve(ok(payload));
            }
            else {
                resolve(toolError("join_failed", `join-regtest.sh exited with code ${code}.`, payload));
            }
        });
    });
}
