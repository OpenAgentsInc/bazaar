#!/usr/bin/env node

// src/index.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// src/boundaries.ts
var REGTEST_NETWORK = "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4";
var MAINNET_NETWORK = "bip122:000000000019d6689c085ae165831e93";
var HARD_BOUNDARIES = "HARD BOUNDARIES: regtest only (network " + REGTEST_NETWORK + "); this server never holds provider seeds (the local daemon owns its keys); mainnet identifiers (bc1/1/3 addresses, lnbc invoices, the mainnet chain id) fail argument validation; no tool can alter or sign the launch manifest.";
var BoundaryError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "BoundaryError";
  }
  code;
};
var BECH32_CHARSET = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,90}$/;
var BASE58_MAINNET = /^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/;
function rejectMainnetIdentifiers(value, field) {
  const lower = value.toLowerCase();
  if (lower.includes(MAINNET_NETWORK)) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `${field} contains the mainnet chain id; this server is regtest-only.`
    );
  }
  if (/^bc1[a-z0-9]+$/.test(lower) || /^tb1[a-z0-9]+$/.test(lower)) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `${field} looks like a mainnet/testnet bech32 address; only bcrt1 regtest addresses are accepted.`
    );
  }
  if (BASE58_MAINNET.test(value)) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `${field} looks like a legacy mainnet address; only bcrt1 regtest addresses are accepted.`
    );
  }
  if (lower.startsWith("lnbc") && !lower.startsWith("lnbcrt")) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `${field} looks like a mainnet Lightning invoice; only lnbcrt regtest invoices are accepted.`
    );
  }
}
function assertRegtestAddress(address) {
  rejectMainnetIdentifiers(address, "address");
  if (!address.startsWith("bcrt1")) {
    throw new BoundaryError(
      "address_not_regtest",
      "The address must be a regtest bech32 address with the bcrt1 prefix."
    );
  }
  const data = address.slice("bcrt1".length);
  if (!BECH32_CHARSET.test(data)) {
    throw new BoundaryError(
      "address_invalid",
      "The address is not a valid lowercase bech32 string after the bcrt1 prefix."
    );
  }
}
function assertHttpUrl(value, field) {
  rejectMainnetIdentifiers(value, field);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BoundaryError("url_invalid", `${field} is not a valid URL.`);
  }
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname.endsWith(".internal") || url.hostname.endsWith(".local");
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    throw new BoundaryError(
      "url_invalid",
      `${field} must use https (plain http is allowed only for localhost/private hosts).`
    );
  }
  return url;
}
function assertWsUrl(value, field) {
  rejectMainnetIdentifiers(value, field);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BoundaryError("url_invalid", `${field} is not a valid URL.`);
  }
  if (url.protocol !== "wss:" && url.protocol !== "ws:") {
    throw new BoundaryError(
      "url_invalid",
      `${field} must be a ws:// or wss:// relay URL.`
    );
  }
  return url;
}
var LOWER_HEX_32 = /^[0-9a-f]{64}$/;
function assertHexPubkey(value, field) {
  if (!LOWER_HEX_32.test(value)) {
    throw new BoundaryError(
      "pubkey_invalid",
      `${field} must be a 64-character lowercase hex Nostr pubkey.`
    );
  }
}

// src/result.ts
function ok(payload) {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }]
  };
}
function toolError(code, message, extra) {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: JSON.stringify({ error: { code, message, ...extra } }, null, 2)
      }
    ]
  };
}
async function guarded(run) {
  try {
    return await run();
  } catch (cause) {
    if (cause instanceof BoundaryError) {
      return toolError(cause.code, cause.message);
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    return toolError("internal_error", message);
  }
}

// src/tools/faucet-fund.ts
var FAUCET_REQUEST_SCHEMA = "openagents.immortal.public-regtest-faucet-request.v1";
var MAXIMUM_AMOUNT_SAT = 1e7;
var POLL_TIMEOUT_MS = 6e4;
var POLL_INTERVAL_MS = 2e3;
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function faucetFund(args) {
  assertRegtestAddress(args.address);
  const gateway = assertHttpUrl(args.gateway, "gateway");
  if (!Number.isSafeInteger(args.amountSat) || args.amountSat < 1 || args.amountSat > MAXIMUM_AMOUNT_SAT) {
    return toolError(
      "amount_invalid",
      `amountSat must be an integer between 1 and ${MAXIMUM_AMOUNT_SAT} (regtest sats).`
    );
  }
  const endpoint = new URL(
    `${gateway.origin}${gateway.pathname.replace(/\/$/, "")}/v1/public-regtest/faucet`
  );
  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schema: FAUCET_REQUEST_SCHEMA,
        network: REGTEST_NETWORK,
        address: args.address,
        amount_sat: args.amountSat
      }),
      signal: AbortSignal.timeout(1e4)
    });
  } catch (cause) {
    return toolError(
      "faucet_unreachable",
      `Could not reach the gateway faucet at ${endpoint}: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
  if (response.status === 404) {
    return toolError(
      "faucet_unavailable",
      `The gateway at ${gateway.origin} does not expose the faucet capability yet (immortal join-kit program, immortal#45). No funds were sent.`
    );
  }
  let body = {};
  try {
    body = await response.json();
  } catch {
  }
  if (!response.ok) {
    return toolError(
      "faucet_rejected",
      `The faucet rejected the request with HTTP ${response.status}.`,
      { response: body }
    );
  }
  const statusUrl = typeof body.status_url === "string" ? body.status_url : typeof body.statusUrl === "string" ? body.statusUrl : void 0;
  if (!statusUrl) {
    const status = typeof body.status === "string" ? body.status : void 0;
    if (status === "paid" || status === "confirmed") {
      return ok({
        schema: "openagents.immortal-mcp.faucet-fund.v1",
        state: "paid",
        response: body
      });
    }
    return ok({
      schema: "openagents.immortal-mcp.faucet-fund.v1",
      state: "submitted",
      note: "The faucet accepted the request but returned no status URL; report the raw response honestly.",
      response: body
    });
  }
  assertHttpUrl(statusUrl, "status_url");
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = body;
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    try {
      const poll = await fetch(statusUrl, {
        signal: AbortSignal.timeout(1e4),
        headers: { accept: "application/json" }
      });
      const pollBody = await poll.json();
      lastStatus = pollBody;
      const status = typeof pollBody.status === "string" ? pollBody.status : void 0;
      if (status === "paid" || status === "confirmed") {
        return ok({
          schema: "openagents.immortal-mcp.faucet-fund.v1",
          state: "paid",
          statusUrl,
          response: pollBody
        });
      }
      if (status === "failed" || status === "rejected" || status === "expired") {
        return toolError("faucet_failed", `The faucet reported ${status}.`, {
          statusUrl,
          response: pollBody
        });
      }
    } catch {
    }
  }
  return toolError(
    "faucet_poll_timeout",
    "The faucet did not report paid within 60 seconds. The request may still settle; poll the status URL directly.",
    { statusUrl, lastStatus }
  );
}

// src/tools/join-network.ts
import { spawn as spawn2 } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join as join2 } from "node:path";

// src/tools/spin-up-node.ts
import { spawn } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
var TIMEOUT_MS = 15 * 60 * 1e3;
var MAXIMUM_LINES = 200;
function defaultImmortalDir() {
  return process.env.IMMORTAL_DIR ?? join(homedir(), "work", "immortal");
}
async function spinUpNode(args, onLine) {
  if (args.relays) for (const relay of args.relays) assertWsUrl(relay, "relays[]");
  if (args.gateway) assertHttpUrl(args.gateway, "gateway");
  if (args.addnode && !/^[a-z0-9.:[\]-]{1,253}$/i.test(args.addnode)) {
    return toolError(
      "addnode_invalid",
      "addnode must be a host[:port] peer endpoint."
    );
  }
  const immortalDir = args.immortalDir ?? defaultImmortalDir();
  const script = join(immortalDir, "scripts", "join-regtest.sh");
  try {
    await stat(script);
  } catch {
    return toolError(
      "join_script_not_found",
      `${script} does not exist. The immortal join kit (immortal#45) is not present in this checkout. Clone https://github.com/OpenAgentsInc/immortal (or set IMMORTAL_DIR/immortalDir) and update it once the join kit lands.`
    );
  }
  const scriptArgs = [args.role, "--network", "public-regtest"];
  if (args.relays && args.relays.length > 0) {
    scriptArgs.push("--relays", args.relays.join(","));
  }
  if (args.addnode) scriptArgs.push("--addnode", args.addnode);
  if (args.gateway) scriptArgs.push("--gateway", args.gateway);
  const lines = [];
  const pushLine = (line) => {
    if (line.length === 0) return;
    lines.push(line.length > 2e3 ? `${line.slice(0, 2e3)}\u2026` : line);
    if (lines.length > MAXIMUM_LINES) lines.shift();
    try {
      onLine?.(line);
    } catch {
    }
  };
  return await new Promise((resolve2) => {
    const child = spawn("bash", [script, ...scriptArgs], {
      cwd: immortalDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 1e4).unref();
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
      resolve2(
        toolError("spawn_failed", cause.message, {
          script,
          args: scriptArgs
        })
      );
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (buffer.trim().length > 0) pushLine(buffer.trimEnd());
      const payload = {
        schema: "openagents.immortal-mcp.spin-up-node.v1",
        script,
        args: scriptArgs,
        exitCode: code,
        signal: signal ?? null,
        timedOut,
        outputLines: lines,
        outputNote: `last ${MAXIMUM_LINES} lines at most`
      };
      if (timedOut) {
        resolve2(
          toolError(
            "join_timeout",
            "join-regtest.sh exceeded the 15-minute bound and was terminated.",
            payload
          )
        );
      } else if (code === 0) {
        resolve2(ok(payload));
      } else {
        resolve2(
          toolError("join_failed", `join-regtest.sh exited with code ${code}.`, payload)
        );
      }
    });
  });
}

// src/tools/join-network.ts
var PUBLISH_ENTRYPOINT_PATTERNS = [
  /^\s*publish\)\s*$/m,
  // `case "$1" in ... publish)`
  /^\s*(?:cmd_publish|do_publish)\s*\(\)/m
  // function-style entrypoint
];
async function joinNetwork(args) {
  const immortalDir = args.immortalDir ?? defaultImmortalDir();
  const script = join2(immortalDir, "scripts", "join-regtest.sh");
  let source;
  try {
    source = await readFile(script, "utf8");
  } catch {
    return toolError(
      "join_script_not_found",
      `${script} does not exist locally. The immortal join kit (immortal#45) publishes kind 39600 + 39601 as part of provider start; use spin_up_node once the kit is present in the immortal checkout.`
    );
  }
  const hasPublishEntrypoint = PUBLISH_ENTRYPOINT_PATTERNS.some(
    (pattern) => pattern.test(source)
  );
  if (!hasPublishEntrypoint) {
    return toolError(
      "no_publish_entrypoint",
      "The installed join-regtest.sh has no discrete publish entrypoint. It publishes kind 39600 (provider profile) and a bounded 39601 offering to the public relays as part of `join-regtest.sh provider` start. Use spin_up_node (role: provider) to start \u2014 or restart \u2014 the local provider; then confirm the node appears in network_status as a discovered-tier provider.",
      { script }
    );
  }
  const lines = [];
  return await new Promise((resolve2) => {
    const child = spawn2("bash", [script, "publish"], {
      cwd: immortalDir,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const timer = setTimeout(() => child.kill("SIGTERM"), 12e4);
    const onData = (chunk) => {
      for (const line of chunk.toString().split("\n")) {
        if (line.trim().length === 0) continue;
        lines.push(line);
        if (lines.length > 200) lines.shift();
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", (cause) => {
      clearTimeout(timer);
      resolve2(toolError("spawn_failed", cause.message, { script }));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve2(
          ok({
            schema: "openagents.immortal-mcp.join-network.v1",
            script,
            exitCode: code,
            outputLines: lines
          })
        );
      } else {
        resolve2(
          toolError(
            "publish_failed",
            `join-regtest.sh publish exited with code ${code}.`,
            { script, exitCode: code, outputLines: lines }
          )
        );
      }
    });
  });
}

// src/nostr.ts
import WebSocket from "ws";
import { verifyEvent } from "@openagentsinc/nip-mkt";
async function fetchNip11(websocketUrl) {
  let httpUrl;
  try {
    httpUrl = new URL(websocketUrl);
  } catch {
    return { reachable: false, error: "invalid relay URL" };
  }
  httpUrl.protocol = httpUrl.protocol === "ws:" ? "http:" : "https:";
  try {
    const response = await fetch(httpUrl, {
      headers: { accept: "application/nostr+json" },
      signal: AbortSignal.timeout(5e3)
    });
    if (!response.ok) {
      return { reachable: false, error: `HTTP ${response.status}` };
    }
    const body = await response.json();
    return {
      reachable: true,
      name: typeof body.name === "string" ? body.name : void 0,
      software: typeof body.software === "string" ? body.software : void 0,
      version: typeof body.version === "string" ? body.version : void 0,
      supportedNips: Array.isArray(body.supported_nips) ? body.supported_nips.filter(
        (nip) => typeof nip === "number"
      ) : void 0,
      extensions: body.extensions ?? void 0
    };
  } catch (cause) {
    return {
      reachable: false,
      error: cause instanceof Error ? cause.message : String(cause)
    };
  }
}
var MAXIMUM_EVENTS_PER_RELAY = 500;
function fetchRelaySnapshot(url, kinds, timeoutMs = 1e4) {
  return new Promise((resolve2) => {
    const events = [];
    const notices = [];
    let droppedInvalidSignatures = 0;
    let closedReason;
    let settled = false;
    const subscription = `immortal-mcp-${Math.random().toString(36).slice(2, 10)}`;
    let socket;
    try {
      socket = new WebSocket(url, { handshakeTimeout: 5e3 });
    } catch (cause) {
      resolve2({
        url,
        reachable: false,
        events: [],
        droppedInvalidSignatures: 0,
        notices: [],
        error: cause instanceof Error ? cause.message : String(cause)
      });
      return;
    }
    const finish = (reachable, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(["CLOSE", subscription]));
        }
        socket.close();
      } catch {
      }
      resolve2({
        url,
        reachable,
        events,
        droppedInvalidSignatures,
        closedReason,
        notices,
        error
      });
    };
    const timer = setTimeout(() => finish(events.length > 0, "timeout"), timeoutMs);
    socket.on("open", () => {
      socket.send(
        JSON.stringify([
          "REQ",
          subscription,
          { kinds: [...kinds], limit: MAXIMUM_EVENTS_PER_RELAY }
        ])
      );
    });
    socket.on("message", (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!Array.isArray(message)) return;
      const [verb, ...rest] = message;
      if (verb === "EVENT" && rest[0] === subscription) {
        const event = rest[1];
        if (events.length < MAXIMUM_EVENTS_PER_RELAY && kinds.includes(event?.kind)) {
          try {
            if (verifyEvent(event)) events.push(event);
            else droppedInvalidSignatures += 1;
          } catch {
            droppedInvalidSignatures += 1;
          }
        }
      } else if (verb === "EOSE" && rest[0] === subscription) {
        finish(true);
      } else if (verb === "CLOSED" && rest[0] === subscription) {
        closedReason = typeof rest[1] === "string" ? rest[1] : "closed";
        finish(true);
      } else if (verb === "NOTICE") {
        if (notices.length < 8) notices.push(String(rest[0] ?? ""));
      }
    });
    socket.on("error", (cause) => {
      finish(false, cause instanceof Error ? cause.message : String(cause));
    });
    socket.on("close", () => finish(events.length > 0 || settled, void 0));
  });
}
function tagValue(tags, name) {
  const matches = tags.filter((tag) => tag.length >= 2 && tag[0] === name);
  return matches.length === 1 ? matches[0][1] : "";
}
function foldHeads(events) {
  const heads = /* @__PURE__ */ new Map();
  for (const event of events) {
    const distinct = tagValue(event.tags, "d");
    if (!distinct) continue;
    const key = `${event.kind}:${event.pubkey}:${distinct}`;
    const current = heads.get(key);
    if (!current || event.created_at > current.created_at || event.created_at === current.created_at && event.id < current.id) {
      heads.set(key, event);
    }
  }
  return heads;
}

// src/offerings.ts
import {
  parseJsonRejectingDuplicateMembers
} from "@openagentsinc/nip-mkt";
function contentRecord(event) {
  try {
    const parsed = parseJsonRejectingDuplicateMembers(event.content);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed))
      return parsed;
  } catch {
  }
  return void 0;
}
function normalizeOffering(event) {
  const base = {
    providerPubkey: event.pubkey,
    coordinate: `39601:${event.pubkey}:${tagValue(event.tags, "d")}`,
    status: tagValue(event.tags, "status"),
    providerReference: tagValue(event.tags, "provider"),
    eventId: event.id,
    createdAt: event.created_at
  };
  const content = contentRecord(event);
  const profile = content && typeof content.mkt_swp === "object" && content.mkt_swp !== null ? content.mkt_swp : void 0;
  if (!profile) {
    return {
      ...base,
      swapTypes: [],
      sides: [],
      parseError: "offering content has no mkt_swp profile object"
    };
  }
  const swapTypes = Array.isArray(profile.swap_types) ? profile.swap_types.filter(
    (value) => typeof value === "string"
  ) : [];
  const sides = [];
  let parseError;
  if (Array.isArray(profile.sides)) {
    for (const value of profile.sides) {
      if (value === null || typeof value !== "object") {
        parseError = "offering side is not an object";
        continue;
      }
      const side = value;
      sides.push({
        inputAssetId: String(side.input_asset_id ?? ""),
        outputAssetId: String(side.output_asset_id ?? ""),
        min: String(side.min ?? ""),
        max: String(side.max ?? ""),
        feeBps: String(side.fee_bps ?? "")
      });
    }
  } else {
    parseError = "offering profile has no sides array";
  }
  return { ...base, swapTypes, sides, parseError };
}
function normalizeProviderProfile(event) {
  const content = contentRecord(event);
  const profile = content && typeof content.mkt_swp === "object" && content.mkt_swp !== null ? content.mkt_swp : void 0;
  const labelCandidate = profile && ["name", "display_name", "label"].map((key) => profile[key]).find((value) => typeof value === "string" && value.length > 0);
  const alt = tagValue(event.tags, "alt");
  return {
    pubkey: event.pubkey,
    coordinate: `39600:${event.pubkey}:${tagValue(event.tags, "d")}`,
    status: tagValue(event.tags, "status"),
    label: typeof labelCandidate === "string" ? labelCandidate : alt || `provider ${event.pubkey.slice(0, 12)}\u2026`,
    eventId: event.id,
    createdAt: event.created_at
  };
}

// src/tools/list-offerings.ts
async function listOfferings(args) {
  for (const relay of args.relays) assertWsUrl(relay, "relays[]");
  const snapshots = await Promise.all(
    args.relays.map((relay) => fetchRelaySnapshot(relay, [39601], 1e4))
  );
  const heads = [
    ...foldHeads(snapshots.flatMap((snapshot) => [...snapshot.events])).values()
  ];
  return ok({
    schema: "openagents.immortal-mcp.offerings.v1",
    relays: snapshots.map((snapshot) => ({
      url: snapshot.url,
      reachable: snapshot.reachable,
      events: snapshot.events.length,
      droppedInvalidSignatures: snapshot.droppedInvalidSignatures,
      closedReason: snapshot.closedReason ?? null,
      error: snapshot.error ?? null
    })),
    offerings: heads.filter((event) => event.kind === 39601).map((event) => {
      const offering = normalizeOffering(event);
      return {
        providerPubkey: offering.providerPubkey,
        coordinate: offering.coordinate,
        status: offering.status,
        swapTypes: offering.swapTypes,
        pairs: offering.sides.map((side) => ({
          inputAssetId: side.inputAssetId,
          outputAssetId: side.outputAssetId,
          min: side.min,
          max: side.max,
          feeBps: side.feeBps
        })),
        parseError: offering.parseError ?? null
      };
    })
  });
}

// src/manifest.ts
import { createHash } from "node:crypto";
import {
  parseJsonRejectingDuplicateMembers as parseJsonRejectingDuplicateMembers2,
  verifyEvent as verifyEvent2
} from "@openagentsinc/nip-mkt";
var ENVELOPE_SCHEMA = "openagents.bazaar.public-regtest-envelope.v1";
var LAUNCH_SCHEMA = "openagents.bazaar.public-regtest-launch.v1";
var MANIFEST_EVENT_KIND = 27237;
var MAXIMUM_MANIFEST_BYTES = 65536;
function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === void 0) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest contains a non-JSON value."
    );
  }
  return encoded;
}
function sha256Hex(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
function record(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an object.`);
  }
  return value;
}
function asString(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) {
    throw new BoundaryError(
      "manifest_invalid",
      `${label} must be a non-empty string.`
    );
  }
  return value;
}
function asInteger(value, label) {
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an integer.`);
  }
  return value;
}
function asArray(value, label) {
  if (!Array.isArray(value)) {
    throw new BoundaryError("manifest_invalid", `${label} must be an array.`);
  }
  return value;
}
function parseSignatureEvent(value) {
  const event = record(value, "signature event");
  return {
    kind: asInteger(event.kind, "signature event kind"),
    id: asString(event.id, "signature event id"),
    pubkey: asString(event.pubkey, "signature event pubkey"),
    created_at: asInteger(event.created_at, "signature event timestamp"),
    tags: asArray(event.tags, "signature event tags").map(
      (tag) => asArray(tag, "signature event tag").map(
        (entry) => asString(entry, "signature event tag entry")
      )
    ),
    content: typeof event.content === "string" ? event.content : "",
    sig: asString(event.sig, "signature event signature")
  };
}
async function fetchManifestSummary(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(1e4),
    headers: { accept: "application/json" },
    redirect: "error"
  });
  if (!response.ok) {
    throw new BoundaryError(
      "manifest_unavailable",
      `The manifest URL responded with HTTP ${response.status}.`
    );
  }
  const raw = await response.text();
  return checkManifestEnvelope(raw);
}
function checkManifestEnvelope(raw) {
  if (new TextEncoder().encode(raw).byteLength > MAXIMUM_MANIFEST_BYTES) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest exceeds its 64 KiB byte bound."
    );
  }
  let parsed;
  try {
    parsed = parseJsonRejectingDuplicateMembers2(raw);
  } catch {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest envelope is malformed JSON or has duplicate members."
    );
  }
  const envelope = record(parsed, "manifest envelope");
  if (envelope.schema !== ENVELOPE_SCHEMA) {
    throw new BoundaryError(
      "manifest_invalid",
      `The envelope schema must be ${ENVELOPE_SCHEMA}.`
    );
  }
  const manifest = record(envelope.manifest, "manifest");
  if (manifest.schema !== LAUNCH_SCHEMA) {
    throw new BoundaryError(
      "manifest_invalid",
      `The launch schema must be ${LAUNCH_SCHEMA}.`
    );
  }
  const network = asString(manifest.network, "manifest network");
  if (network !== REGTEST_NETWORK) {
    throw new BoundaryError(
      "mainnet_identifier_rejected",
      `The manifest network is not the public regtest chain (${REGTEST_NETWORK}); this server is regtest-only.`
    );
  }
  const gateway = record(manifest.gateway, "gateway");
  const relays = asArray(manifest.relays, "relays").map((entry) => ({
    websocketUrl: asString(
      record(entry, "relay").websocket_url,
      "relay websocket_url"
    )
  }));
  if (relays.length < 1) {
    throw new BoundaryError(
      "manifest_invalid",
      "The manifest lists no relays."
    );
  }
  const providers = asArray(manifest.providers, "providers").map((entry) => {
    const provider = record(entry, "provider");
    return {
      role: asString(provider.role, "provider role"),
      pubkey: asString(provider.pubkey, "provider pubkey"),
      offeringCoordinate: asString(
        provider.offering_coordinate,
        "provider offering coordinate"
      )
    };
  });
  const event = parseSignatureEvent(envelope.signature_event);
  if (event.kind !== MANIFEST_EVENT_KIND) {
    throw new BoundaryError(
      "manifest_invalid",
      `The signature event kind must be ${MANIFEST_EVENT_KIND}.`
    );
  }
  const canonical = canonicalJson(envelope.manifest);
  const contentBinding = event.content === canonical ? "bound" : "mismatch";
  let signatureEvent = "invalid";
  try {
    signatureEvent = verifyEvent2(event) ? "verified" : "invalid";
  } catch {
    signatureEvent = "invalid";
  }
  return {
    network,
    issuedAt: asInteger(manifest.issued_at, "issued_at"),
    expiresAt: asInteger(manifest.expires_at, "expires_at"),
    serviceState: asString(manifest.service_state, "service_state"),
    bazaarRevision: asString(manifest.bazaar_revision, "bazaar_revision"),
    immortalRevision: asString(
      manifest.immortal_revision,
      "immortal_revision"
    ),
    gatewayBaseUrl: asString(gateway.base_url, "gateway base_url"),
    relays,
    providers,
    signingPubkey: event.pubkey,
    signatureEventId: event.id,
    manifestSha256: sha256Hex(canonical),
    verification: {
      structure: "ok",
      signatureEvent,
      contentBinding,
      trustRoot: "structure-checked; signature event cryptographically verified against its own pubkey, but the signer was NOT checked against the deployment's pinned trust root (this server does not hold the pinned signing pubkey or revisions)."
    }
  };
}

// src/tools/network-status.ts
async function networkStatus(args) {
  const manifestUrl = args.manifestUrl ?? process.env.IMMORTAL_MANIFEST_URL;
  if (!manifestUrl) {
    return toolError(
      "manifest_url_required",
      "Provide manifestUrl (a URL serving the raw public regtest manifest envelope JSON, e.g. <origin>/bazaar-public-regtest.json) or set IMMORTAL_MANIFEST_URL. No default production origin is baked into this server."
    );
  }
  assertHttpUrl(manifestUrl, "manifestUrl");
  let manifest;
  try {
    manifest = await fetchManifestSummary(manifestUrl);
  } catch (cause) {
    if (cause instanceof BoundaryError) throw cause;
    return toolError(
      "manifest_unavailable",
      `Could not fetch or parse the manifest envelope: ${cause instanceof Error ? cause.message : String(cause)}`
    );
  }
  const pinnedPubkeys = new Set(
    manifest.providers.map((provider) => provider.pubkey)
  );
  const relayResults = await Promise.all(
    manifest.relays.map(async (relay) => {
      const [nip11, snapshot] = await Promise.all([
        fetchNip11(relay.websocketUrl),
        fetchRelaySnapshot(relay.websocketUrl, [39600, 39601], 1e4)
      ]);
      return { relay, nip11, snapshot };
    })
  );
  const allEvents = relayResults.flatMap((entry) => [...entry.snapshot.events]);
  const heads = [...foldHeads(allEvents).values()];
  const profiles = heads.filter((event) => event.kind === 39600).map(normalizeProviderProfile);
  const offerings = heads.filter((event) => event.kind === 39601).map(normalizeOffering);
  const offeringsByProvider = /* @__PURE__ */ new Map();
  for (const offering of offerings) {
    const list = offeringsByProvider.get(offering.providerPubkey) ?? [];
    list.push(offering);
    offeringsByProvider.set(offering.providerPubkey, list);
  }
  const providerPubkeys = /* @__PURE__ */ new Set([
    ...profiles.map((profile) => profile.pubkey),
    ...offerings.map((offering) => offering.providerPubkey),
    ...pinnedPubkeys
  ]);
  const relayIdsFor = (pubkey) => relayResults.filter(
    (entry) => entry.snapshot.events.some((event) => event.pubkey === pubkey)
  ).map((entry) => entry.relay.websocketUrl);
  const providers = [...providerPubkeys].map((pubkey) => {
    const profile = profiles.find((candidate) => candidate.pubkey === pubkey);
    const providerOfferings = offeringsByProvider.get(pubkey) ?? [];
    return {
      id: pubkey,
      pubkey,
      label: profile?.label ?? `provider ${pubkey.slice(0, 12)}\u2026`,
      trust: pinnedPubkeys.has(pubkey) ? "pinned" : "discovered",
      state: profile ? profile.status === "active" ? "ready" : "degraded" : "offline",
      profileStatus: profile?.status ?? null,
      relayIds: relayIdsFor(pubkey),
      offerings: providerOfferings.map((offering) => ({
        coordinate: offering.coordinate,
        status: offering.status,
        swapTypes: offering.swapTypes,
        sides: offering.sides,
        parseError: offering.parseError ?? null
      })),
      // 39603 receipt aggregation is not implemented in this server yet.
      feeBps: null,
      swaps24h: null,
      volumeSat24h: null
    };
  });
  return ok({
    schema: "openagents.immortal-mcp.network-status.v1",
    name: "immortal public regtest",
    network: manifest.network,
    manifest: {
      url: manifestUrl,
      issuedAt: manifest.issuedAt,
      expiresAt: manifest.expiresAt,
      serviceState: manifest.serviceState,
      bazaarRevision: manifest.bazaarRevision,
      immortalRevision: manifest.immortalRevision,
      gatewayBaseUrl: manifest.gatewayBaseUrl,
      signingPubkey: manifest.signingPubkey,
      signatureEventId: manifest.signatureEventId,
      manifestSha256: manifest.manifestSha256,
      verification: manifest.verification
    },
    relays: relayResults.map(({ relay, nip11, snapshot }) => ({
      id: relay.websocketUrl,
      url: relay.websocketUrl,
      trust: "pinned",
      reachable: snapshot.reachable,
      software: nip11.software ?? null,
      version: nip11.version ?? null,
      extensions: nip11.extensions ?? null,
      nip11Reachable: nip11.reachable,
      nip11Error: nip11.error ?? null,
      snapshotEvents: snapshot.events.length,
      droppedInvalidSignatures: snapshot.droppedInvalidSignatures,
      closedReason: snapshot.closedReason ?? null,
      notices: snapshot.notices,
      error: snapshot.error ?? null
    })),
    providers,
    clientCount: null,
    stats: {
      swaps24h: null,
      volumeSat24h: null,
      operatorFeeSat24h: null,
      note: "39603 public-market-receipt aggregation is not implemented in this server; stats are null, not zero."
    },
    activity: null
  });
}

// src/tools/node-health.ts
import { execFile } from "node:child_process";
import { readFile as readFile2, stat as stat2 } from "node:fs/promises";
import { homedir as homedir2 } from "node:os";
import { join as join3 } from "node:path";
import { promisify } from "node:util";
var execFileAsync = promisify(execFile);
var HEALTH_FILE_CANDIDATES = [
  "health.json",
  "ownership.json",
  "state/health.json",
  "state/ownership.json"
];
function defaultJoinDir() {
  return process.env.IMMORTAL_JOIN_DIR ?? join3(homedir2(), "work", "immortal", "deploy", "join");
}
async function nodeHealth(args) {
  const joinDir = args.stateDir ?? defaultJoinDir();
  try {
    const info = await stat2(joinDir);
    if (!info.isDirectory()) throw new Error("not a directory");
  } catch {
    return toolError(
      "join_kit_not_found",
      `No join-kit directory at ${joinDir}. The immortal join kit (immortal#45) is not installed there. Set IMMORTAL_JOIN_DIR or pass stateDir, or run spin_up_node first.`
    );
  }
  let compose;
  try {
    const { stdout } = await execFileAsync(
      "docker",
      ["compose", "ps", "--format", "json"],
      { cwd: joinDir, timeout: 15e3, maxBuffer: 1024 * 1024 }
    );
    const trimmed = stdout.trim();
    let services = [];
    if (trimmed.startsWith("[")) {
      services = JSON.parse(trimmed);
    } else if (trimmed.length > 0) {
      services = trimmed.split("\n").filter((line) => line.trim().length > 0).map((line) => JSON.parse(line));
    }
    compose = { ok: true, services };
  } catch (cause) {
    compose = {
      ok: false,
      error: cause instanceof Error ? cause.message : String(cause)
    };
  }
  const healthFiles = {};
  for (const candidate of HEALTH_FILE_CANDIDATES) {
    const path = join3(joinDir, candidate);
    try {
      const raw = await readFile2(path, "utf8");
      if (raw.length > 64 * 1024) {
        healthFiles[candidate] = { error: "file exceeds 64 KiB bound" };
      } else {
        try {
          healthFiles[candidate] = JSON.parse(raw);
        } catch {
          healthFiles[candidate] = { error: "not valid JSON" };
        }
      }
    } catch {
    }
  }
  if (!compose.ok && Object.keys(healthFiles).length === 0) {
    return toolError(
      "node_health_unavailable",
      `docker compose failed in ${joinDir} and no health/ownership JSON was found.`,
      { joinDir, composeError: compose.error, checkedFiles: HEALTH_FILE_CANDIDATES }
    );
  }
  return ok({
    schema: "openagents.immortal-mcp.node-health.v1",
    joinDir,
    compose: compose.ok ? { available: true, services: compose.services } : { available: false, error: compose.error },
    healthFiles: Object.keys(healthFiles).length > 0 ? healthFiles : { note: `none of ${HEALTH_FILE_CANDIDATES.join(", ")} present` }
  });
}

// src/tools/request-listing.ts
var MAXIMUM_HEALTH_JSON_BYTES = 16 * 1024;
async function requestListing(args) {
  assertHexPubkey(args.pubkey, "pubkey");
  const coordinatePattern = new RegExp(
    `^39601:${args.pubkey}:[a-z0-9][a-z0-9._-]{0,127}$`
  );
  if (!coordinatePattern.test(args.offeringCoordinate)) {
    throw new BoundaryError(
      "offering_coordinate_invalid",
      "offeringCoordinate must be `39601:<pubkey>:<d>` and bound to the given provider pubkey."
    );
  }
  assertHttpUrl(args.nip11Url, "nip11Url");
  rejectMainnetIdentifiers(args.healthJson, "healthJson");
  if (new TextEncoder().encode(args.healthJson).byteLength > MAXIMUM_HEALTH_JSON_BYTES) {
    throw new BoundaryError(
      "health_json_too_large",
      "healthJson exceeds the 16 KiB bound; trim it to the join kit's health summary."
    );
  }
  let healthPretty;
  try {
    healthPretty = JSON.stringify(JSON.parse(args.healthJson), null, 2);
  } catch {
    throw new BoundaryError(
      "health_json_invalid",
      "healthJson must be valid JSON (the join kit's health summary)."
    );
  }
  const title = `Listing request: public regtest provider ${args.pubkey.slice(0, 16)}\u2026`;
  const body = [
    "## Public regtest listing request (discovered \u2192 pinned)",
    "",
    "Requesting manifest pinning for a provider currently visible on the discovered tier.",
    "",
    `- **Provider pubkey:** \`${args.pubkey}\``,
    `- **Offering coordinate:** \`${args.offeringCoordinate}\``,
    `- **Relay NIP-11 URL:** ${args.nip11Url}`,
    "",
    "### Join-kit health output",
    "",
    "```json",
    healthPretty,
    "```",
    "",
    "---",
    "",
    "Pinning is a signed, human operator decision: the operator re-signs the launch manifest and the node",
    "moves tiers on the next manifest refresh (\u2264300 s). This issue was prefilled by",
    "`@openagentsinc/immortal-mcp` (regtest only; the server never holds provider seeds and cannot alter",
    "or sign the launch manifest)."
  ].join("\n");
  const url = new URL("https://github.com/OpenAgentsInc/immortal/issues/new");
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  url.searchParams.set("labels", "listing-request,public-regtest");
  return ok({
    schema: "openagents.immortal-mcp.request-listing.v1",
    url: url.toString(),
    note: "Open this URL in a browser to file the pin request. This tool did not open a browser and did not create the issue."
  });
}

// src/tools/get-quotes.ts
import { createHash as createHash2, randomBytes, webcrypto } from "node:crypto";
import { readFile as readFile3 } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Effect as Effect2, Schema as Schema2 } from "effect";
import WebSocket2 from "ws";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  serializeSignedEvent,
  unwrapPrivateRecord,
  verifyEvent as verifyEvent3,
  wrapPrivateRecordCopies
} from "@openagentsinc/nip-mkt";

// ../../vendor/mkt-swp/immortal-browser-abi.ts
import { Context, Effect, Layer, Schema, Semaphore } from "effect";
import { parseJsonRejectingDuplicateMembers as parseJsonRejectingDuplicateMembers3 } from "@openagentsinc/nip-mkt";
var IMMORTAL_BROWSER_ABI_VERSION = 1;
var IMMORTAL_BROWSER_ABI_SCHEMA = "openagents.immortal.mkt-swp.browser-abi.v1";
var IMMORTAL_BROWSER_SOURCE_REVISION = "1fb8f30d218c4e8e7d0e29dc4cd2e8d4900d60a8";
var IMMORTAL_REQUESTER_API_SHA256 = "bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8";
var IMMORTAL_BROWSER_MAX_REQUEST_BYTES = 2 * 1024 * 1024;
var IMMORTAL_BROWSER_MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
var IMMORTAL_BROWSER_OPERATIONS = [
  "metadata",
  "validate_offering",
  "validate_delivery",
  "verify_signed",
  "requester_rfq",
  "requester_order",
  "requester_contract_draft",
  "requester_contract",
  "requester_cancel",
  "requester_close",
  "exit_package_inspect",
  "session_create",
  "session_ingest",
  "session_restore",
  "prepare_funding_request",
  "verify_before_fund"
];
var ImmortalBrowserOperationSchema = Schema.Literals(
  IMMORTAL_BROWSER_OPERATIONS
);
var LowerHex64Schema = Schema.String.check(Schema.isPattern(/^[0-9a-f]{64}$/));
var NonNegativeSafeIntegerSchema = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER)
);
var UInt16Schema = NonNegativeSafeIntegerSchema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(65535))
);
var UInt32Schema = NonNegativeSafeIntegerSchema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(4294967295))
);
var ByteSchema = UInt16Schema.pipe(
  Schema.check(Schema.isLessThanOrEqualTo(255))
);
var ByteArraySchema = Schema.Array(ByteSchema);
var LowerHexSchema = Schema.String.check(
  Schema.isPattern(/^(?:[0-9a-f]{2})+$/)
);
var DecimalStringSchema = Schema.String.check(
  Schema.isPattern(/^(0|[1-9][0-9]*)$/)
);
var NostrTagSchema = Schema.NonEmptyArray(Schema.String);
var ImmortalBrowserMetadataSchema = Schema.Struct({
  schema: Schema.Literal(IMMORTAL_BROWSER_ABI_SCHEMA),
  abi_version: Schema.Literal(IMMORTAL_BROWSER_ABI_VERSION),
  source_revision: Schema.Literal(IMMORTAL_BROWSER_SOURCE_REVISION),
  requester_api_sha256: Schema.Literal(IMMORTAL_REQUESTER_API_SHA256),
  maximum_request_bytes: Schema.Literal(IMMORTAL_BROWSER_MAX_REQUEST_BYTES),
  maximum_response_bytes: Schema.Literal(IMMORTAL_BROWSER_MAX_RESPONSE_BYTES),
  operations: Schema.Array(ImmortalBrowserOperationSchema),
  custody: Schema.Literal("host_owned")
});
var ImmortalSigningRequestSchema = Schema.Struct({
  pubkey: LowerHex64Schema,
  created_at: NonNegativeSafeIntegerSchema,
  kind: UInt16Schema,
  tags: Schema.Array(NostrTagSchema),
  content: Schema.String,
  expected_event_id: LowerHex64Schema
});
var ImmortalNostrEventSchema = Schema.Struct({
  id: LowerHex64Schema,
  pubkey: LowerHex64Schema,
  created_at: NonNegativeSafeIntegerSchema,
  kind: UInt16Schema,
  tags: Schema.Array(NostrTagSchema),
  content: Schema.String,
  sig: Schema.String.check(Schema.isPattern(/^[0-9a-f]{128}$/))
});
var ImmortalSignedRecordDeliverySchema = Schema.Struct({
  event_id: LowerHex64Schema,
  raw_signed_event: ByteArraySchema,
  raw_wrap_event: Schema.NullOr(ByteArraySchema),
  wrap_event_id: Schema.NullOr(LowerHex64Schema),
  sender_pubkey: LowerHex64Schema,
  observed_at: NonNegativeSafeIntegerSchema,
  provenance: Schema.Literals(["locally_signed", "direct", "gift_wrap"])
});
var ImmortalSessionDeliveryInputSchema = Schema.Struct({
  raw_signed_event_hex: LowerHexSchema,
  observed_at: NonNegativeSafeIntegerSchema,
  provenance: Schema.Literals(["locally_signed", "direct"])
});
var ImmortalRequesterFeeViewSchema = Schema.Struct({
  fee_bps: DecimalStringSchema,
  provider_fee: DecimalStringSchema,
  miner_fee_budget: DecimalStringSchema,
  lightning_routing_fee_budget: DecimalStringSchema,
  maximum_total_fee: DecimalStringSchema,
  fee_payer: Schema.NonEmptyString
});
var ImmortalRequesterPriceFeedViewSchema = Schema.Struct({
  url: Schema.NonEmptyString,
  value_pointer: Schema.String,
  observed_value: Schema.NonEmptyString,
  response_sha256: LowerHex64Schema,
  observed_at: NonNegativeSafeIntegerSchema,
  max_age_seconds: NonNegativeSafeIntegerSchema
});
var ImmortalRequesterQuoteViewSchema = Schema.Struct({
  rfq_id: LowerHex64Schema,
  quote_id: LowerHex64Schema,
  provider_pubkey: LowerHex64Schema,
  quote_class: Schema.NonEmptyString,
  reservation_class: Schema.NonEmptyString,
  swap_type: Schema.Literals(["submarine", "reverse", "chain"]),
  input_asset_id: Schema.NonEmptyString,
  output_asset_id: Schema.NonEmptyString,
  input_amount: DecimalStringSchema,
  output_amount: DecimalStringSchema,
  amount_equation: Schema.NonEmptyString,
  rounding: Schema.NonEmptyString,
  clock_skew_seconds: DecimalStringSchema,
  expires_at: NonNegativeSafeIntegerSchema,
  effective_acceptance_deadline: NonNegativeSafeIntegerSchema,
  fees: ImmortalRequesterFeeViewSchema,
  price_feed: Schema.NullOr(ImmortalRequesterPriceFeedViewSchema)
});
var ImmortalRequesterTimelineEntrySchema = Schema.Struct({
  event_id: LowerHex64Schema,
  author: Schema.Literals(["requester", "provider"]),
  kind: Schema.Literals([
    "rfq",
    "quote",
    "order",
    "contract",
    "status",
    "cancel",
    "close"
  ]),
  created_at: NonNegativeSafeIntegerSchema,
  sequence: Schema.NullOr(NonNegativeSafeIntegerSchema),
  state: Schema.NullOr(Schema.String),
  causal_event_ids: Schema.Array(LowerHex64Schema),
  conflict: Schema.NullOr(Schema.String)
});
var ImmortalRequesterSessionViewSchema = Schema.Struct({
  schema: Schema.Literal("openagents.mkt-swp.requester-session-view.v1"),
  session_id: LowerHex64Schema,
  quote: ImmortalRequesterQuoteViewSchema,
  timeline: Schema.Array(ImmortalRequesterTimelineEntrySchema),
  verification: Schema.Struct({
    state: Schema.Literals([
      "quote_verified",
      "order_verified",
      "awaiting_provider_contract",
      "contract_terms_verified",
      "terminal_verified"
    ]),
    local_verification_required: Schema.Boolean,
    funding_authorized: Schema.Boolean,
    status_gaps: Schema.Array(Schema.String),
    status_forks: Schema.Array(Schema.String),
    invalid_status_claims: Schema.Array(Schema.String)
  }),
  terminal: Schema.Struct({
    claimed_state: Schema.Literals([
      "open",
      "completed",
      "refunded",
      "cancelled",
      "rejected",
      "expired",
      "failed",
      "disputed",
      "unresolved",
      "conflicted"
    ]),
    canonical_close_id: Schema.NullOr(LowerHex64Schema),
    close_event_ids: Schema.Array(LowerHex64Schema),
    principal_unresolved: Schema.NullOr(Schema.String),
    loss_accounting_complete: Schema.Boolean,
    local_effects_verified: Schema.Boolean,
    watch_terminal: Schema.Boolean
  }),
  deliveries: Schema.Array(ImmortalSignedRecordDeliverySchema)
});
var ImmortalSessionResultSchema = Schema.Struct({
  snapshot_json_hex: Schema.String.check(
    Schema.isPattern(/^(?:[0-9a-f]{2})+$/)
  ),
  view: ImmortalRequesterSessionViewSchema
});
var ImmortalSessionIngestResultSchema = Schema.Struct({
  ...ImmortalSessionResultSchema.fields,
  ingested_records: NonNegativeSafeIntegerSchema
});
var ImmortalLiquidFundingVerificationInputSchema = Schema.Struct({
  raw_transaction: LowerHexSchema,
  trusted_unblind_transaction: Schema.NullOr(LowerHexSchema),
  transaction_sha256: LowerHex64Schema,
  output_index: UInt32Schema,
  asset_id: Schema.NonEmptyString,
  amount: DecimalStringSchema,
  script_pubkey: LowerHexSchema,
  taproot_internal_key: LowerHex64Schema,
  taproot_merkle_root: Schema.NullOr(LowerHex64Schema),
  confidentiality: Schema.Literals(["explicit", "confidential"]),
  minimum_confirmations: UInt32Schema,
  replacement_policy: Schema.NonEmptyString
});
var ImmortalLiquidUnilateralExitPackageSchema = Schema.Struct({
  schema: Schema.NonEmptyString,
  genesis_hash: LowerHex64Schema,
  network_id: Schema.NonEmptyString,
  asset_id: Schema.NonEmptyString,
  funding_transaction_id: LowerHex64Schema,
  funding_output_index: UInt32Schema,
  funding_amount: DecimalStringSchema,
  funding_script_pubkey: LowerHexSchema,
  path: Schema.NonEmptyString,
  script: LowerHexSchema,
  control_block: LowerHexSchema,
  timelock: UInt32Schema,
  spend_input_index: UInt32Schema,
  fee_output_index: UInt32Schema,
  fee_amount: DecimalStringSchema,
  transaction_sha256: LowerHex64Schema,
  transaction: LowerHexSchema,
  mode: Schema.Literals(["presigned", "wallet_sign"]),
  wallet_signing_handle_sha256: Schema.NullOr(LowerHex64Schema),
  preimage_recovery_ref: Schema.NullOr(Schema.NonEmptyString)
});
var ImmortalLiquidBeforeFundRequestSchema = Schema.Struct({
  swap_type: Schema.Literals(["submarine", "reverse", "chain"]),
  purpose: Schema.Literals(["requester_broadcast", "counterparty_lock"]),
  input_asset_id: Schema.NonEmptyString,
  output_asset_id: Schema.NonEmptyString,
  funding: ImmortalLiquidFundingVerificationInputSchema,
  exit_package: ImmortalLiquidUnilateralExitPackageSchema
});
var ImmortalLiquidRecoveryFundingSchema = Schema.Struct({
  transaction_id: LowerHex64Schema,
  transaction_template: LowerHexSchema,
  transaction_template_sha256: LowerHex64Schema,
  output_index: UInt32Schema,
  amount: DecimalStringSchema,
  script_pubkey: LowerHexSchema,
  confirmation_policy_sha256: LowerHex64Schema
});
var ImmortalLiquidRecoveryExitSchema = Schema.Struct({
  mode: Schema.NonEmptyString,
  path: Schema.NonEmptyString,
  transaction_template_sha256: LowerHex64Schema,
  transaction_template: LowerHexSchema,
  signed_transaction: Schema.NullOr(LowerHexSchema),
  signer_ref: Schema.NullOr(Schema.NonEmptyString),
  transaction_version: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(-2147483648),
    Schema.isLessThanOrEqualTo(2147483647)
  ),
  lock_time: UInt32Schema,
  input_sequence: UInt32Schema,
  input_index: UInt32Schema,
  signature_hash: LowerHex64Schema,
  sighash_type: Schema.NonEmptyString,
  destination_script_pubkey: LowerHexSchema,
  earliest_broadcast_height: DecimalStringSchema,
  latest_safe_broadcast_height: DecimalStringSchema,
  fee_policy: Schema.Struct({
    target_blocks: NonNegativeSafeIntegerSchema,
    maximum_fee: DecimalStringSchema,
    bump_mode: Schema.NonEmptyString
  })
});
var ImmortalLiquidRecoveryVerificationSchema = Schema.Struct({
  quote_id: LowerHex64Schema,
  verifier_digest: LowerHex64Schema,
  swap_tree_sha256: LowerHex64Schema,
  genesis_hash: LowerHex64Schema,
  taproot_script: LowerHexSchema,
  taproot_control_block: LowerHexSchema,
  taproot_tree: Schema.optionalKey(Schema.Json),
  fee_output_index: UInt32Schema,
  fee_amount: DecimalStringSchema
});
var ImmortalLiquidRecoveryPackageSchema = Schema.Struct({
  schema: Schema.NonEmptyString,
  profile: Schema.NonEmptyString,
  profile_version: NonNegativeSafeIntegerSchema,
  order_id: LowerHex64Schema,
  swap_contract_ids: Schema.Array(LowerHex64Schema),
  contract_sha256: LowerHex64Schema,
  participant_role: Schema.Literals(["requester", "provider"]),
  leg_id: Schema.NonEmptyString,
  network_id: Schema.NonEmptyString,
  asset_id: Schema.NonEmptyString,
  effect_id: LowerHex64Schema,
  funding: ImmortalLiquidRecoveryFundingSchema,
  exit: ImmortalLiquidRecoveryExitSchema,
  verification: ImmortalLiquidRecoveryVerificationSchema,
  secret_commitments: Schema.Struct({
    payment_hash: LowerHex64Schema,
    preimage_recovery_ref: Schema.NullOr(Schema.NonEmptyString)
  }),
  broadcast: Schema.Struct({
    mode: Schema.NonEmptyString,
    rpc_method: Schema.NonEmptyString,
    network_id: Schema.NonEmptyString,
    genesis_hash: LowerHex64Schema
  })
});
var ImmortalLiquidFundingBindingSchema = Schema.Struct({
  contract_sha256: LowerHex64Schema,
  contract_ids: Schema.Array(LowerHex64Schema),
  leg_id: Schema.NonEmptyString,
  exit_effect_id: LowerHex64Schema,
  exit_package_sha256: LowerHex64Schema,
  request: ImmortalLiquidBeforeFundRequestSchema,
  transaction_id: LowerHex64Schema,
  output_index: UInt32Schema,
  amount: DecimalStringSchema,
  exit_transaction_sha256: LowerHex64Schema,
  recovery_package: ImmortalLiquidRecoveryPackageSchema,
  provenance: Schema.Struct({
    authority: Schema.Literal("local_elementsd"),
    network_id: Schema.NonEmptyString,
    genesis_hash: LowerHex64Schema,
    pegged_asset: Schema.NonEmptyString,
    funding_transaction_sha256: LowerHex64Schema,
    output_index: UInt32Schema,
    confidentiality: Schema.Literals(["explicit", "confidential"]),
    unblinded_transaction_sha256: Schema.NullOr(LowerHex64Schema)
  })
});
var ImmortalFundingActionSchema = Schema.Union(
  [
    Schema.Struct({
      action: Schema.Literal("broadcast_bitcoin"),
      effect_id: LowerHex64Schema,
      leg_id: Schema.NonEmptyString,
      raw_transaction: LowerHexSchema
    }),
    Schema.Struct({
      action: Schema.Literal("broadcast_liquid"),
      effect_id: LowerHex64Schema,
      leg_id: Schema.NonEmptyString,
      raw_transaction: LowerHexSchema,
      transaction_id: LowerHex64Schema,
      output_index: UInt32Schema,
      exit_package_sha256: LowerHex64Schema
    }),
    Schema.Struct({
      action: Schema.Literal("pay_lightning_invoice"),
      effect_id: LowerHex64Schema,
      leg_id: Schema.NonEmptyString,
      invoice: Schema.NonEmptyString,
      maximum_routing_fee: DecimalStringSchema,
      invoice_expires_at: NonNegativeSafeIntegerSchema,
      minimum_final_cltv_delta: NonNegativeSafeIntegerSchema,
      hold_invoice_required: Schema.Boolean,
      hold_expiry_height: UInt32Schema
    })
  ],
  { mode: "oneOf" }
);
var ImmortalFundingRequestSchema = Schema.Struct({
  session_id: LowerHex64Schema,
  order_id: LowerHex64Schema,
  quote_id: LowerHex64Schema,
  swap_type: Schema.Literals(["submarine", "reverse", "chain"]),
  liquid: Schema.optionalKey(ImmortalLiquidFundingBindingSchema),
  action: ImmortalFundingActionSchema
});
var ImmortalFundingResultSchema = Schema.Struct({
  funding_request: ImmortalFundingRequestSchema,
  snapshot_json_hex: Schema.String.check(
    Schema.isPattern(/^(?:[0-9a-f]{2})+$/)
  )
});
var ImmortalContractDraftSchema = Schema.Record(
  Schema.String,
  Schema.Json
);
var ImmortalExitPackageInspectionSchema = Schema.Struct({
  document: Schema.Json,
  commitment_sha256: LowerHex64Schema,
  effect_id: LowerHex64Schema,
  path: Schema.NonEmptyString,
  mode: Schema.NonEmptyString,
  unsigned_transaction_hex: Schema.NullOr(LowerHexSchema),
  signing_digest: Schema.NullOr(LowerHex64Schema)
});
var ImmortalBrowserResponseSchema = Schema.Struct({
  schema: Schema.Literal(IMMORTAL_BROWSER_ABI_SCHEMA),
  abi_version: Schema.Literal(IMMORTAL_BROWSER_ABI_VERSION),
  source_revision: Schema.Literal(IMMORTAL_BROWSER_SOURCE_REVISION),
  requester_api_sha256: Schema.Literal(IMMORTAL_REQUESTER_API_SHA256),
  result: Schema.optionalKey(Schema.Json),
  error: Schema.optionalKey(
    Schema.Struct({ code: Schema.NonEmptyString, detail: Schema.String })
  )
});
var ImmortalBrowserAbiError = class extends Schema.TaggedErrorClass()(
  "MktSwp.ImmortalBrowserAbiError",
  {
    stage: Schema.Literals([
      "fetch",
      "compile",
      "instantiate",
      "compatibility",
      "request",
      "invoke",
      "response"
    ]),
    code: Schema.NonEmptyString,
    detail: Schema.String
  }
) {
};
var invokeLocks = /* @__PURE__ */ new WeakMap();
var invokeLockFor = (exports) => {
  const existing = invokeLocks.get(exports);
  if (existing !== void 0) return existing;
  const created = Semaphore.makeUnsafe(1);
  invokeLocks.set(exports, created);
  return created;
};
var strictDecode = (schema, input, stage, code) => Schema.decodeUnknownEffect(schema)(input, {
  onExcessProperty: "error"
}).pipe(
  Effect.mapError(
    (cause) => new ImmortalBrowserAbiError({
      stage,
      code,
      detail: String(cause)
    })
  )
);
var abiError = (stage, code, cause) => new ImmortalBrowserAbiError({
  stage,
  code,
  detail: cause instanceof Error ? cause.message : String(cause)
});
var sourceBytes = (source) => {
  if (typeof Response !== "undefined" && source instanceof Response) {
    if (!source.ok) {
      return Effect.fail(
        abiError(
          "fetch",
          "browser_wasm_fetch_failed",
          `requester engine fetch returned HTTP ${source.status}`
        )
      );
    }
    return Effect.tryPromise({
      try: () => source.arrayBuffer(),
      catch: (cause) => abiError("fetch", "browser_wasm_fetch_failed", cause)
    });
  }
  if (source instanceof ArrayBuffer) return Effect.succeed(source);
  if (ArrayBuffer.isView(source)) {
    return Effect.succeed(
      Uint8Array.from(
        new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
      ).buffer
    );
  }
  if (typeof source === "string" || source instanceof URL) {
    return Effect.tryPromise({
      try: async () => {
        const response = await fetch(source);
        if (!response.ok) {
          throw new Error(
            `requester engine fetch returned HTTP ${response.status}`
          );
        }
        return response.arrayBuffer();
      },
      catch: (cause) => abiError("fetch", "browser_wasm_fetch_failed", cause)
    });
  }
  return Effect.fail(
    abiError("fetch", "browser_wasm_source_invalid", "unsupported WASM source")
  );
};
var requiredFunction = (exports, name) => {
  const candidate = exports[name];
  return typeof candidate === "function" ? Effect.succeed((...arguments_) => {
    const result = candidate(...arguments_);
    return typeof result === "number" ? result : Number.NaN;
  }) : Effect.fail(
    abiError(
      "compatibility",
      "browser_wasm_export_missing",
      `the requester engine omits ${name}`
    )
  );
};
var bindExports = (exports) => Effect.all({
  abiVersion: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_abi_version"
  ),
  maximumRequestBytes: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_max_request_bytes"
  ),
  maximumResponseBytes: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_max_response_bytes"
  ),
  requestReset: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_request_reset"
  ),
  requestPush: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_request_push"
  ),
  invoke: requiredFunction(exports, "immortal_mkt_swp_browser_invoke"),
  responseLength: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_response_len"
  ),
  responseByte: requiredFunction(
    exports,
    "immortal_mkt_swp_browser_response_byte"
  )
});
var readCompatibilityValue = (read, label) => Effect.try({
  try: read,
  catch: (cause) => abiError(
    "compatibility",
    "browser_wasm_export_failed",
    `${label} failed: ${cause instanceof Error ? cause.message : String(cause)}`
  )
});
var exchange = (exports, request) => Effect.try({
  try: () => {
    const checkStatus = (status, action) => {
      if (status !== 0) {
        throw abiError(
          "invoke",
          "browser_wasm_state_error",
          `the requester engine failed during ${action} with status ${status}`
        );
      }
    };
    checkStatus(exports.requestReset(), "reset");
    for (const byte of request) {
      checkStatus(exports.requestPush(byte), "request transfer");
    }
    checkStatus(exports.invoke(), "invoke");
    const length = exports.responseLength();
    if (!Number.isSafeInteger(length) || length <= 0 || length > IMMORTAL_BROWSER_MAX_RESPONSE_BYTES) {
      throw abiError(
        "response",
        "browser_response_bound",
        "the requester engine returned an invalid response length"
      );
    }
    const response = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      const byte = exports.responseByte(index);
      if (!Number.isSafeInteger(byte) || byte < 0 || byte > 255) {
        throw abiError(
          "response",
          "browser_response_invalid",
          "the requester engine response ended early"
        );
      }
      response[index] = byte;
    }
    return response;
  },
  catch: (cause) => cause instanceof ImmortalBrowserAbiError ? cause : abiError("invoke", "browser_wasm_trapped", cause)
});
var invokeOperation = /* @__PURE__ */ Symbol(
  "ImmortalBrowserClient.invokeOperation"
);
var ImmortalBrowserEngine = class extends Context.Service()("@openagentsinc/mkt-swp/ImmortalBrowserEngine") {
};
var makeClient = (exports, invokeLock) => Effect.gen(function* () {
  const abiVersion = yield* readCompatibilityValue(
    exports.abiVersion,
    "browser ABI version export"
  );
  if (abiVersion !== IMMORTAL_BROWSER_ABI_VERSION) {
    return yield* abiError(
      "compatibility",
      "browser_abi_version_mismatch",
      `expected browser ABI ${IMMORTAL_BROWSER_ABI_VERSION}`
    );
  }
  const maximumRequestBytes = yield* readCompatibilityValue(
    exports.maximumRequestBytes,
    "maximum request bytes export"
  );
  const maximumResponseBytes = yield* readCompatibilityValue(
    exports.maximumResponseBytes,
    "maximum response bytes export"
  );
  if (maximumRequestBytes !== IMMORTAL_BROWSER_MAX_REQUEST_BYTES || maximumResponseBytes !== IMMORTAL_BROWSER_MAX_RESPONSE_BYTES) {
    return yield* abiError(
      "compatibility",
      "browser_abi_bounds_mismatch",
      "requester engine bounds do not match the pinned browser contract"
    );
  }
  const invokeUnlocked = Effect.fn(
    "MktSwp.ImmortalBrowserClient.invokeUnlocked"
  )(function* (operation, input) {
    const validatedInput = yield* strictDecode(
      Schema.Json,
      input,
      "request",
      "browser_input_invalid"
    );
    const request = new TextEncoder().encode(
      JSON.stringify({
        abi_version: IMMORTAL_BROWSER_ABI_VERSION,
        operation,
        input: validatedInput
      })
    );
    if (request.byteLength > IMMORTAL_BROWSER_MAX_REQUEST_BYTES) {
      return yield* abiError(
        "request",
        "browser_request_bound",
        `request exceeds ${IMMORTAL_BROWSER_MAX_REQUEST_BYTES} bytes`
      );
    }
    const response = yield* exchange(exports, request);
    const parsed = yield* Effect.try({
      try: () => parseJsonRejectingDuplicateMembers3(
        new TextDecoder("utf-8", { fatal: true }).decode(response)
      ),
      catch: (cause) => abiError("response", "browser_response_invalid", cause)
    });
    const document = yield* strictDecode(
      ImmortalBrowserResponseSchema,
      parsed,
      "response",
      "browser_response_invalid"
    );
    if (document.result === void 0 === (document.error === void 0)) {
      return yield* abiError(
        "response",
        "browser_response_invalid",
        "browser response must contain exactly one of result or error"
      );
    }
    if (document.error !== void 0) {
      return yield* new ImmortalBrowserAbiError({
        stage: "invoke",
        code: document.error.code,
        detail: document.error.detail
      });
    }
    if (document.result === void 0) {
      return yield* abiError(
        "response",
        "browser_response_invalid",
        "browser response result is absent"
      );
    }
    return document.result;
  });
  const invoke = Effect.fn("MktSwp.ImmortalBrowserClient.invoke")(function* (operation, input) {
    return yield* invokeLock.withPermit(invokeUnlocked(operation, input));
  });
  const metadata = yield* invoke("metadata", {}).pipe(
    Effect.flatMap(
      (result) => strictDecode(
        ImmortalBrowserMetadataSchema,
        result,
        "compatibility",
        "browser_metadata_invalid"
      )
    )
  );
  if (metadata.operations.length !== IMMORTAL_BROWSER_OPERATIONS.length || metadata.operations.some(
    (operation, index) => operation !== IMMORTAL_BROWSER_OPERATIONS[index]
  )) {
    return yield* abiError(
      "compatibility",
      "browser_operations_mismatch",
      "requester engine operation inventory does not match the pinned contract"
    );
  }
  return { metadata, [invokeOperation]: invoke };
});
var bindImmortalBrowserClient = Effect.fn(
  "MktSwp.bindImmortalBrowserClient"
)(function* (exports) {
  const invokeLock = invokeLockFor(exports);
  const bound = yield* bindExports(exports);
  return yield* makeClient(bound, invokeLock);
});
var loadImmortalBrowserClient = Effect.fn(
  "MktSwp.loadImmortalBrowserClient"
)(function* (source) {
  const bytes = yield* sourceBytes(source);
  const module = yield* Effect.tryPromise({
    try: () => WebAssembly.compile(bytes),
    catch: (cause) => abiError("compile", "browser_wasm_compile_failed", cause)
  });
  if (WebAssembly.Module.imports(module).length !== 0) {
    return yield* abiError(
      "compatibility",
      "browser_wasm_imports_forbidden",
      "the requester engine must not import host authority"
    );
  }
  const instance = yield* Effect.tryPromise({
    try: () => WebAssembly.instantiate(module, {}),
    catch: (cause) => abiError("instantiate", "browser_wasm_instantiate_failed", cause)
  });
  return yield* bindImmortalBrowserClient(instance.exports);
});
var invokeDecoded = (client, operation, input, outputSchema) => client[invokeOperation](operation, input).pipe(
  Effect.flatMap(
    (result) => strictDecode(
      outputSchema,
      result,
      "response",
      `browser_${operation}_response_invalid`
    )
  )
);
var requesterRfq = (client, input) => invokeDecoded(client, "requester_rfq", input, ImmortalSigningRequestSchema);
var validateImmortalDelivery = (client, input) => invokeDecoded(
  client,
  "validate_delivery",
  input,
  ImmortalSignedRecordDeliverySchema
);
var verifySignedRequesterRecord = (client, input) => invokeDecoded(client, "verify_signed", input, ImmortalNostrEventSchema);
var createRequesterSession = (client, input) => invokeDecoded(client, "session_create", input, ImmortalSessionResultSchema);

// src/tools/get-quotes.ts
if (!globalThis.crypto)
  Object.defineProperty(globalThis, "crypto", { value: webcrypto });
var CHAIN = "swp:1:bip122:0f9188f13cb7b2c9e5c72a6b65eeada4:btc:chain";
var LIGHTNING = "swp:1:bip122:0f9188f13cb7b2c9e5c72a6b65eeada4:btc:lightning";
var PRIVATE_PROFILES = [
  {
    id: "mkt-swp",
    version: 1,
    privateKinds: [39610],
    referenceMarkers: ["cancel-request", "cancel-accept"],
    criticalMembers: ["mkt_swp"],
    understoodMembers: ["mkt_swp"]
  }
];
var TIMEOUT_MS2 = 15e3;
async function getQuotes(args) {
  const manifestUrl = args.manifestUrl ?? process.env.IMMORTAL_MANIFEST_URL;
  if (!manifestUrl) {
    return toolError(
      "manifest_url_required",
      "Provide manifestUrl or set IMMORTAL_MANIFEST_URL."
    );
  }
  assertHttpUrl(manifestUrl, "manifestUrl");
  const manifest = await fetchManifestSummary(manifestUrl);
  if (manifest.verification.signatureEvent !== "verified" || manifest.verification.contentBinding !== "bound" || manifest.serviceState !== "ready") {
    throw new BoundaryError(
      "manifest_untrusted",
      "The public-regtest manifest is not signed, bound, and ready."
    );
  }
  const privateKey = generateSecretKey();
  const requesterPubkey = getPublicKey(privateKey);
  const client = await Effect2.runPromise(
    loadImmortalBrowserClient(await readRequesterWasm())
  );
  const headsByRelay = await Promise.all(
    manifest.relays.map(async (relay) => ({
      relayUrl: relay.websocketUrl,
      events: await authenticatedSnapshot(
        relay.websocketUrl,
        privateKey,
        [39600, 39601]
      )
    }))
  );
  const routes = eligibleRoutes(
    manifest.providers,
    headsByRelay,
    args.amountSat
  );
  if (routes.length < 2) {
    return toolError(
      "competitive_quotes_unavailable",
      `Only ${routes.length} eligible pinned provider route(s) are live; two are required.`
    );
  }
  const logicalRequestId = digestJson({
    schema: "openagents.immortal-mcp.logical-rfq.v1",
    nonce: randomBytes(32).toString("hex"),
    amountSat: args.amountSat
  });
  const settled = await Promise.allSettled(
    routes.map(
      (route) => requestProviderQuote(
        client,
        route,
        privateKey,
        requesterPubkey,
        logicalRequestId,
        args.amountSat
      )
    )
  );
  const quotes = settled.flatMap(
    (entry) => entry.status === "fulfilled" ? [entry.value] : []
  );
  if (quotes.length < 2) {
    return toolError(
      "competitive_quotes_unavailable",
      `Only ${quotes.length} current signed Quote(s) passed the Immortal requester engine.`,
      {
        failures: settled.flatMap(
          (entry) => entry.status === "rejected" ? [
            entry.reason instanceof Error ? entry.reason.message : String(entry.reason)
          ] : []
        )
      }
    );
  }
  quotes.sort(
    (left, right) => compareDecimal(right.outputAmount, left.outputAmount) || compareDecimal(left.maximumTotalFee, right.maximumTotalFee) || left.providerPubkey.localeCompare(right.providerPubkey)
  );
  const selected = quotes[0];
  return ok({
    schema: "openagents.immortal-mcp.signed-quotes.v1",
    network: manifest.network,
    direction: args.direction,
    inputAmountSat: args.amountSat,
    logicalRequestId,
    selectionPolicy: "highest_output_then_lowest_fee_then_provider_key",
    quotes: quotes.map(publicQuote),
    selected: publicQuote(selected),
    custody: "ephemeral_requester_identity_destroyed_after_no_spend_quote"
  });
}
function eligibleRoutes(providers, snapshots, amountSat) {
  const amount = BigInt(amountSat);
  const events = snapshots.flatMap((snapshot) => snapshot.events);
  const heads = foldHeads(events);
  return providers.flatMap((provider, index) => {
    const offering = [...heads.values()].find(
      (event) => event.kind === 39601 && event.pubkey === provider.pubkey && `39601:${event.pubkey}:${tagValue(event.tags, "d")}` === provider.offeringCoordinate && tagValue(event.tags, "status") === "active"
    );
    if (!offering) return [];
    const normalized = normalizeOffering(offering);
    const side = normalized.sides.find(
      (candidate) => candidate.inputAssetId === LIGHTNING && candidate.outputAssetId === CHAIN && /^(0|[1-9][0-9]*)$/.test(candidate.min) && /^(0|[1-9][0-9]*)$/.test(candidate.max) && amount >= BigInt(candidate.min) && amount <= BigInt(candidate.max)
    );
    if (!side) return [];
    return [
      {
        providerPubkey: provider.pubkey,
        offeringCoordinate: provider.offeringCoordinate,
        relayUrl: snapshots[index % snapshots.length].relayUrl,
        side,
        offering
      }
    ];
  });
}
async function requestProviderQuote(client, route, privateKey, requesterPubkey, logicalRequestId, amountSat) {
  const now = Math.floor(Date.now() / 1e3);
  const sessionId = digestJson({
    logicalRequestId,
    provider: route.providerPubkey
  });
  const config = {
    session_id: sessionId,
    requester_pubkey: requesterPubkey,
    provider_pubkey: route.providerPubkey,
    offering_address: route.offeringCoordinate
  };
  const offeringContent = JSON.parse(route.offering.content);
  const profile = offeringContent.mkt_swp;
  const signingRequest = await Effect2.runPromise(
    requesterRfq(
      client,
      jsonValue({
        config,
        created_at: now,
        distinct: digestJson({ logicalRequestId, sessionId, kind: "rfq" }),
        expiration: now + 900,
        mkt_swp: {
          constraints: {
            allowed_script_modes: arrayStrings(profile.script_modes),
            asset_pair: [LIGHTNING, CHAIN],
            confirmation_policy: profile.confirmation_policy,
            desired_completion_time: now + 7800,
            destination_commitment_sha256: digestJson({
              logicalRequestId,
              destination: "no-spend"
            }),
            firm_quote_required: true,
            input_amount: String(amountSat),
            maximum_total_fee: String(amountSat),
            payment_hash: logicalRequestId,
            reservation_class: "soft",
            requester_public_keys: [
              {
                leg_id: "destination",
                path: "claim",
                public_key: requesterPubkey
              }
            ],
            swap_type: "reverse"
          }
        }
      })
    )
  );
  const rfq = finalizeEvent(
    {
      kind: signingRequest.kind,
      created_at: signingRequest.created_at,
      tags: signingRequest.tags.map((tag) => [...tag]),
      content: signingRequest.content
    },
    privateKey
  );
  if (rfq.id !== signingRequest.expected_event_id)
    throw new Error("RFQ event id mismatch");
  await Effect2.runPromise(
    verifySignedRequesterRecord(
      client,
      jsonValue({ request: signingRequest, event: rfq })
    )
  );
  const copies = await Effect2.runPromise(
    wrapPrivateRecordCopies(
      serializeSignedEvent(rfq),
      privateKey,
      route.providerPubkey,
      PRIVATE_PROFILES
    )
  );
  const quoteWrap = await publishAndWaitForQuote(
    route.relayUrl,
    privateKey,
    requesterPubkey,
    copies.counterparty,
    copies.senderRecovery,
    sessionId
  );
  const delivered = await Effect2.runPromise(
    unwrapPrivateRecord(quoteWrap, privateKey, PRIVATE_PROFILES, {
      receivedAt: Math.floor(Date.now() / 1e3),
      sourceProvenance: ["nip42_authenticated", "nip59_verified"]
    })
  );
  const quote = delivered.event;
  if (quote.kind !== 39605 || quote.pubkey !== route.providerPubkey) {
    throw new Error("provider returned a non-Quote or wrong signer");
  }
  const localDelivery = {
    raw_signed_event_hex: Buffer.from(
      serializeSignedEvent(rfq),
      "utf8"
    ).toString("hex"),
    observed_at: now,
    provenance: "locally_signed"
  };
  const quoteDelivery = {
    raw_signed_event_hex: Buffer.from(delivered.raw, "utf8").toString("hex"),
    observed_at: Math.floor(Date.now() / 1e3),
    provenance: "direct"
  };
  await Effect2.runPromise(
    validateImmortalDelivery(client, jsonValue(localDelivery))
  );
  await Effect2.runPromise(
    validateImmortalDelivery(client, jsonValue(quoteDelivery))
  );
  const session = await Effect2.runPromise(
    createRequesterSession(
      client,
      jsonValue({
        config,
        records: [rfq, quote],
        exit_packages: [],
        deliveries: [localDelivery, quoteDelivery]
      })
    )
  );
  const view = session.view.quote;
  if (view.rfq_id !== rfq.id || view.provider_pubkey !== route.providerPubkey || view.input_amount !== String(amountSat) || view.input_asset_id !== LIGHTNING || view.output_asset_id !== CHAIN || view.quote_id !== quote.id || view.quote_class !== "firm" || Math.floor(Date.now() / 1e3) >= view.effective_acceptance_deadline) {
    throw new Error("signed Quote failed requester binding checks");
  }
  return {
    providerPubkey: route.providerPubkey,
    sessionId,
    rfqId: rfq.id,
    quoteId: quote.id,
    outputAmount: view.output_amount,
    maximumTotalFee: view.fees.maximum_total_fee,
    feeBps: view.fees.fee_bps,
    expiresAt: view.effective_acceptance_deadline,
    rawQuote: quote
  };
}
function authenticatedSnapshot(relayUrl, privateKey, kinds) {
  return withAuthenticatedRelay(
    relayUrl,
    privateKey,
    async (socket, sendAndAck) => {
      const subscription = `mcp-heads-${randomBytes(8).toString("hex")}`;
      const events = [];
      socket.send(JSON.stringify(["REQ", subscription, { kinds, limit: 512 }]));
      await waitFor(socket, (message) => {
        if (message[0] === "EVENT" && message[1] === subscription) {
          const event = message[2];
          if (kinds.includes(event?.kind) && verifyEvent3(event))
            events.push(event);
          return false;
        }
        return message[0] === "EOSE" && message[1] === subscription;
      });
      socket.send(JSON.stringify(["CLOSE", subscription]));
      void sendAndAck;
      return events;
    }
  );
}
function publishAndWaitForQuote(relayUrl, privateKey, requesterPubkey, counterparty, recovery, sessionId) {
  return withAuthenticatedRelay(
    relayUrl,
    privateKey,
    async (socket, sendAndAck) => {
      const subscription = `mcp-quotes-${randomBytes(8).toString("hex")}`;
      socket.send(
        JSON.stringify([
          "REQ",
          subscription,
          { kinds: [1059], "#p": [requesterPubkey], limit: 128 }
        ])
      );
      await waitFor(
        socket,
        (message) => message[0] === "EOSE" && message[1] === subscription
      );
      const quotePromise = waitForValue(socket, async (message) => {
        if (message[0] !== "EVENT" || message[1] !== subscription)
          return void 0;
        const wrap = message[2];
        if (!verifyEvent3(wrap)) return void 0;
        try {
          const delivery = await Effect2.runPromise(
            unwrapPrivateRecord(wrap, privateKey, PRIVATE_PROFILES)
          );
          return delivery.event.kind === 39605 && delivery.event.tags.some(
            (tag) => tag[0] === "session" && tag[1] === sessionId
          ) ? wrap : void 0;
        } catch {
          return void 0;
        }
      });
      await sendAndAck(counterparty);
      await sendAndAck(recovery);
      return quotePromise;
    }
  );
}
async function withAuthenticatedRelay(relayUrl, privateKey, operation) {
  const socket = new WebSocket2(relayUrl, { handshakeTimeout: 5e3 });
  await new Promise((resolveOpen, reject) => {
    socket.once("open", resolveOpen);
    socket.once("error", reject);
  });
  try {
    const challenge = await waitForValue(
      socket,
      async (message) => message[0] === "AUTH" && typeof message[1] === "string" ? message[1] : void 0
    );
    const auth = finalizeEvent(
      {
        kind: 22242,
        created_at: Math.floor(Date.now() / 1e3),
        tags: [
          ["relay", relayUrl],
          ["challenge", challenge]
        ],
        content: ""
      },
      privateKey
    );
    socket.send(JSON.stringify(["AUTH", auth]));
    await waitFor(
      socket,
      (message) => message[0] === "OK" && message[1] === auth.id && message[2] === true
    );
    const sendAndAck = async (event) => {
      socket.send(JSON.stringify(["EVENT", event]));
      await waitFor(socket, (message) => {
        if (message[0] !== "OK" || message[1] !== event.id) return false;
        if (message[2] !== true)
          throw new Error(
            `relay rejected ${event.id}: ${String(message[3] ?? "")}`
          );
        return true;
      });
    };
    return await operation(socket, sendAndAck);
  } finally {
    socket.close();
  }
}
function waitFor(socket, predicate) {
  return waitForValue(
    socket,
    async (message) => predicate(message) ? true : void 0
  ).then(() => void 0);
}
function waitForValue(socket, project) {
  return new Promise((resolveValue, reject) => {
    const timer = setTimeout(
      () => finish(new Error("relay response timeout")),
      TIMEOUT_MS2
    );
    const onMessage = (data) => {
      let message;
      try {
        message = JSON.parse(data.toString());
      } catch {
        return;
      }
      if (!Array.isArray(message)) return;
      void project(message).then((value) => {
        if (value !== void 0) finish(void 0, value);
      }).catch(
        (cause) => finish(cause instanceof Error ? cause : new Error(String(cause)))
      );
    };
    const onError = (cause) => finish(cause);
    const finish = (error, value) => {
      clearTimeout(timer);
      socket.off("message", onMessage);
      socket.off("error", onError);
      if (error) reject(error);
      else resolveValue(value);
    };
    socket.on("message", onMessage);
    socket.once("error", onError);
  });
}
async function readRequesterWasm() {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const candidate of [
    resolve(here, "../assets/immortal_client_web.wasm"),
    resolve(here, "../../assets/immortal_client_web.wasm")
  ]) {
    try {
      return await readFile3(candidate);
    } catch {
    }
  }
  throw new Error("pinned Immortal requester WASM asset is missing");
}
function publicQuote(quote) {
  return {
    providerPubkey: quote.providerPubkey,
    sessionId: quote.sessionId,
    rfqId: quote.rfqId,
    quoteId: quote.quoteId,
    outputAmountSat: quote.outputAmount,
    maximumTotalFeeSat: quote.maximumTotalFee,
    feeBps: quote.feeBps,
    effectiveAcceptanceDeadline: quote.expiresAt,
    signatureVerified: verifyEvent3(quote.rawQuote)
  };
}
function digestJson(value) {
  return createHash2("sha256").update(canonicalJson2(value)).digest("hex");
}
function canonicalJson2(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson2).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map(
      (key) => `${JSON.stringify(key)}:${canonicalJson2(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}
function compareDecimal(left, right) {
  const a = BigInt(left);
  const b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}
function arrayStrings(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function jsonValue(value) {
  return Schema2.decodeUnknownSync(Schema2.Json)(value);
}

// src/server.ts
var SERVER_NAME = "immortal-mcp";
var SERVER_VERSION = "0.1.0";
var READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  openWorldHint: true
};
var EFFECTFUL = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true
};
var APPROVAL_NOTE = "EFFECTFUL: hosts should require explicit user approval before running this tool. ";
function buildServer() {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  server.registerTool(
    "network_status",
    {
      title: "Immortal network status",
      description: "Read-only. Fetches the public regtest launch manifest envelope JSON, structure-checks it (envelope schema, kind 27237 signature event, content binding, regtest network id) and reports the signing pubkey and canonical manifest sha256 \u2014 signer trust-root pinning is NOT verified here and the result says so. Then fetches each pinned relay's NIP-11 document (Accept: application/nostr+json) and takes one bounded EOSE-terminated REQ snapshot of kinds 39600/39601 per relay (10 s cap). Returns a PanoramaNetwork-shaped JSON: relays (url, software, version, extensions, reachable), providers (pubkey, label, offerings summary, pinned vs discovered relative to the manifest), stats null where unknown. " + HARD_BOUNDARIES,
      inputSchema: {
        manifestUrl: z.string().max(2048).optional().describe(
          "URL serving the raw public regtest manifest envelope JSON (schema openagents.bazaar.public-regtest-envelope.v1), e.g. <origin>/bazaar-public-regtest.json. Defaults to the IMMORTAL_MANIFEST_URL environment variable."
        )
      },
      annotations: { ...READ_ONLY, title: "Immortal network status" }
    },
    async (args) => guarded(() => networkStatus(args))
  );
  server.registerTool(
    "list_offerings",
    {
      title: "List live offerings",
      description: "Read-only. Takes one bounded EOSE-terminated REQ snapshot of kind 39601 offering heads per given relay (10 s cap, signatures verified, newest head per coordinate) and returns normalized offerings: pairs (input/output asset ids), min/max amounts, fee bps, status, provider pubkey. " + HARD_BOUNDARIES,
      inputSchema: {
        relays: z.array(z.string().max(2048)).min(1).max(4).describe(
          "Regtest relay websocket URLs (wss://\u2026), usually from network_status."
        )
      },
      annotations: { ...READ_ONLY, title: "List live offerings" }
    },
    async (args) => guarded(() => listOfferings(args))
  );
  server.registerTool(
    "get_quotes",
    {
      title: "Get competing signed quotes",
      description: "Read-only and no-spend. Loads the pinned zero-import Immortal requester WASM, generates an ephemeral requester identity, authenticates directly to every signed relay with NIP-42, discovers the pinned 39600/39601 heads, publishes separately gift-wrapped RFQs to each eligible provider, validates returned signed Quotes through the Immortal session engine, and selects deterministically by highest output, then lowest maximum fee, then provider key. The ephemeral key is never returned or persisted and no Order or funding action is created. " + HARD_BOUNDARIES,
      inputSchema: {
        manifestUrl: z.string().max(2048).optional().describe(
          "Signed public-regtest manifest envelope URL; defaults to IMMORTAL_MANIFEST_URL."
        ),
        direction: z.enum(["LN->BTC"]).default("LN->BTC").describe(
          "No-spend quote direction. V1 supports reverse LN\u2192BTC previews."
        ),
        amountSat: z.number().int().min(1e4).max(1e6).describe("Offered amount in regtest sats (10,000..1,000,000).")
      },
      annotations: { ...READ_ONLY, title: "Get competing signed quotes" }
    },
    async (args) => guarded(() => getQuotes(args))
  );
  server.registerTool(
    "node_health",
    {
      title: "Local join-kit node health",
      description: "Read-only. Reports the local join-kit stack: `docker compose ps --format json` in the join directory (IMMORTAL_JOIN_DIR, default ~/work/immortal/deploy/join) plus any health/ownership JSON the kit wrote. Returns a clear not_found if the kit is not installed. " + HARD_BOUNDARIES,
      inputSchema: {
        stateDir: z.string().max(1024).optional().describe(
          "Join-kit directory override (defaults to IMMORTAL_JOIN_DIR or ~/work/immortal/deploy/join)."
        )
      },
      annotations: { ...READ_ONLY, title: "Local join-kit node health" }
    },
    async (args) => guarded(() => nodeHealth(args))
  );
  server.registerTool(
    "spin_up_node",
    {
      title: "Spin up a local regtest node",
      description: APPROVAL_NOTE + "Runs the immortal join kit `scripts/join-regtest.sh <role> --network public-regtest` locally (IMMORTAL_DIR, default ~/work/immortal; docker required). The script starts bitcoind/CLN/immortal-provider (or relay + Postgres), generates a FRESH identity owned by the local daemon \u2014 never by this server \u2014 and publishes kind 39600/39601 on start. Output is streamed as progress notifications and the last 200 lines are returned; 15-minute bound. " + HARD_BOUNDARIES,
      inputSchema: {
        role: z.enum(["provider", "relay"]).describe(
          "Node role to bring up: a quoting provider or a public relay."
        ),
        relays: z.array(z.string().max(2048)).max(4).optional().describe(
          "Public regtest relay websocket URLs to join (passed as --relays)."
        ),
        addnode: z.string().max(253).optional().describe(
          "bitcoind regtest addnode peer endpoint host[:port] (passed as --addnode)."
        ),
        gateway: z.string().max(2048).optional().describe("Public regtest gateway base URL (passed as --gateway)."),
        immortalDir: z.string().max(1024).optional().describe(
          "Immortal checkout override (defaults to IMMORTAL_DIR or ~/work/immortal)."
        )
      },
      annotations: { ...EFFECTFUL, title: "Spin up a local regtest node" }
    },
    async (args, extra) => guarded(async () => {
      const progressToken = extra._meta?.progressToken;
      let progress = 0;
      const onLine = progressToken === void 0 ? void 0 : (line) => {
        progress += 1;
        void extra.sendNotification({
          method: "notifications/progress",
          params: { progressToken, progress, message: line }
        }).catch(() => {
        });
      };
      return spinUpNode(args, onLine);
    })
  );
  server.registerTool(
    "join_network",
    {
      title: "Publish the local provider to the network",
      description: APPROVAL_NOTE + "Publishing kind 39600 + 39601 happens inside `join-regtest.sh provider` start. If the installed script exposes a discrete publish entrypoint this tool runs it; otherwise it returns typed guidance pointing at spin_up_node \u2014 it never invents a publish path. The local daemon signs with its own keys. " + HARD_BOUNDARIES,
      inputSchema: {
        immortalDir: z.string().max(1024).optional().describe(
          "Immortal checkout override (defaults to IMMORTAL_DIR or ~/work/immortal)."
        )
      },
      annotations: {
        ...EFFECTFUL,
        title: "Publish the local provider to the network"
      }
    },
    async (args) => guarded(() => joinNetwork(args))
  );
  server.registerTool(
    "faucet_fund",
    {
      title: "Fund a regtest address from the gateway faucet",
      description: APPROVAL_NOTE + "POSTs the gateway faucet capability (request schema openagents.immortal.public-regtest-faucet-request.v1, endpoint <gateway>/v1/public-regtest/faucet) for a LOCAL REGTEST address, then polls the returned status URL until paid or a 60-second bound. The address must have the bcrt1 prefix \u2014 validated client-side before any network effect; bc1/tb1/legacy mainnet addresses and lnbc invoices fail validation. Regtest sats only \u2014 no real value. " + HARD_BOUNDARIES,
      inputSchema: {
        gateway: z.string().max(2048).describe(
          "Gateway base URL from the manifest (network_status \u2192 manifest.gatewayBaseUrl)."
        ),
        address: z.string().min(10).max(96).describe(
          "Regtest bech32 address; MUST start with bcrt1. Mainnet identifiers fail validation."
        ),
        amountSat: z.number().int().min(1).max(1e7).describe("Amount in regtest sats (1..10,000,000).")
      },
      annotations: {
        ...EFFECTFUL,
        title: "Fund a regtest address from the gateway faucet"
      }
    },
    async (args) => guarded(() => faucetFund(args))
  );
  server.registerTool(
    "request_listing",
    {
      title: "Prepare a listing (pin) request",
      description: APPROVAL_NOTE + "Constructs and RETURNS the prefilled GitHub new-issue URL for the OpenAgentsInc/immortal pin request (discovered \u2192 pinned). It does NOT open a browser and does NOT create the issue. Pinning stays a signed human operator decision; the manifest is re-signed by the operator, never by any tool here. " + HARD_BOUNDARIES,
      inputSchema: {
        pubkey: z.string().regex(/^[0-9a-f]{64}$/).describe(
          "Provider pubkey (64-char lowercase hex) from the join kit."
        ),
        offeringCoordinate: z.string().max(200).describe(
          "Offering coordinate `39601:<pubkey>:<d>` bound to the provider pubkey."
        ),
        nip11Url: z.string().max(2048).describe("HTTPS NIP-11 URL of the relay the provider publishes on."),
        healthJson: z.string().max(16384).describe(
          "The join kit's health summary as a JSON string (\u226416 KiB)."
        )
      },
      annotations: { ...EFFECTFUL, title: "Prepare a listing (pin) request" }
    },
    async (args) => guarded(() => requestListing(args))
  );
  return server;
}

// src/index.ts
async function main() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("immortal-mcp: stdio server ready (regtest only)");
}
main().catch((cause) => {
  console.error("immortal-mcp: fatal", cause);
  process.exit(1);
});
