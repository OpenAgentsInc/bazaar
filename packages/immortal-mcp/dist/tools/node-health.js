// node_health: local join-kit status — `docker compose ps` in the join
// directory plus any health/ownership JSON the kit writes. Read-only.
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { ok, toolError } from "../result.js";
const execFileAsync = promisify(execFile);
const HEALTH_FILE_CANDIDATES = [
    "health.json",
    "ownership.json",
    "state/health.json",
    "state/ownership.json",
];
export function defaultJoinDir() {
    return (process.env.IMMORTAL_JOIN_DIR ??
        join(homedir(), "work", "immortal", "deploy", "join"));
}
export async function nodeHealth(args) {
    const joinDir = args.stateDir ?? defaultJoinDir();
    try {
        const info = await stat(joinDir);
        if (!info.isDirectory())
            throw new Error("not a directory");
    }
    catch {
        return toolError("join_kit_not_found", `No join-kit directory at ${joinDir}. The immortal join kit (immortal#45) is not installed there. ` +
            "Set IMMORTAL_JOIN_DIR or pass stateDir, or run spin_up_node first.");
    }
    let compose;
    try {
        const { stdout } = await execFileAsync("docker", ["compose", "ps", "--format", "json"], { cwd: joinDir, timeout: 15_000, maxBuffer: 1024 * 1024 });
        // `docker compose ps --format json` emits either a JSON array or one
        // JSON object per line depending on the compose version.
        const trimmed = stdout.trim();
        let services = [];
        if (trimmed.startsWith("[")) {
            services = JSON.parse(trimmed);
        }
        else if (trimmed.length > 0) {
            services = trimmed
                .split("\n")
                .filter((line) => line.trim().length > 0)
                .map((line) => JSON.parse(line));
        }
        compose = { ok: true, services };
    }
    catch (cause) {
        compose = {
            ok: false,
            error: cause instanceof Error ? cause.message : String(cause),
        };
    }
    const healthFiles = {};
    for (const candidate of HEALTH_FILE_CANDIDATES) {
        const path = join(joinDir, candidate);
        try {
            const raw = await readFile(path, "utf8");
            if (raw.length > 64 * 1024) {
                healthFiles[candidate] = { error: "file exceeds 64 KiB bound" };
            }
            else {
                try {
                    healthFiles[candidate] = JSON.parse(raw);
                }
                catch {
                    healthFiles[candidate] = { error: "not valid JSON" };
                }
            }
        }
        catch {
            // absent — omitted from the report
        }
    }
    if (!compose.ok && Object.keys(healthFiles).length === 0) {
        return toolError("node_health_unavailable", `docker compose failed in ${joinDir} and no health/ownership JSON was found.`, { joinDir, composeError: compose.error, checkedFiles: HEALTH_FILE_CANDIDATES });
    }
    return ok({
        schema: "openagents.immortal-mcp.node-health.v1",
        joinDir,
        compose: compose.ok
            ? { available: true, services: compose.services }
            : { available: false, error: compose.error },
        healthFiles: Object.keys(healthFiles).length > 0
            ? healthFiles
            : { note: `none of ${HEALTH_FILE_CANDIDATES.join(", ")} present` },
    });
}
