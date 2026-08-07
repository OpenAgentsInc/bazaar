// Bounded, read-only Nostr access: NIP-11 identity fetch over HTTPS and a
// single EOSE-terminated REQ per relay over WebSocket. No events are ever
// published from this module.
import WebSocket from "ws";
import { verifyEvent } from "@openagentsinc/nip-mkt";
export async function fetchNip11(websocketUrl) {
    let httpUrl;
    try {
        httpUrl = new URL(websocketUrl);
    }
    catch {
        return { reachable: false, error: "invalid relay URL" };
    }
    httpUrl.protocol = httpUrl.protocol === "ws:" ? "http:" : "https:";
    try {
        const response = await fetch(httpUrl, {
            headers: { accept: "application/nostr+json" },
            signal: AbortSignal.timeout(5_000),
        });
        if (!response.ok) {
            return { reachable: false, error: `HTTP ${response.status}` };
        }
        const body = (await response.json());
        return {
            reachable: true,
            name: typeof body.name === "string" ? body.name : undefined,
            software: typeof body.software === "string" ? body.software : undefined,
            version: typeof body.version === "string" ? body.version : undefined,
            supportedNips: Array.isArray(body.supported_nips)
                ? body.supported_nips.filter((nip) => typeof nip === "number")
                : undefined,
            extensions: body.extensions ?? undefined,
        };
    }
    catch (cause) {
        return {
            reachable: false,
            error: cause instanceof Error ? cause.message : String(cause),
        };
    }
}
const MAXIMUM_EVENTS_PER_RELAY = 500;
/**
 * Opens one WebSocket, sends one REQ for the given kinds, collects verified
 * events until EOSE (or the timeout), then closes. Never publishes.
 */
export function fetchRelaySnapshot(url, kinds, timeoutMs = 10_000) {
    return new Promise((resolve) => {
        const events = [];
        const notices = [];
        let droppedInvalidSignatures = 0;
        let closedReason;
        let settled = false;
        const subscription = `immortal-mcp-${Math.random().toString(36).slice(2, 10)}`;
        let socket;
        try {
            socket = new WebSocket(url, { handshakeTimeout: 5_000 });
        }
        catch (cause) {
            resolve({
                url,
                reachable: false,
                events: [],
                droppedInvalidSignatures: 0,
                notices: [],
                error: cause instanceof Error ? cause.message : String(cause),
            });
            return;
        }
        const finish = (reachable, error) => {
            if (settled)
                return;
            settled = true;
            clearTimeout(timer);
            try {
                if (socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify(["CLOSE", subscription]));
                }
                socket.close();
            }
            catch {
                // best-effort close
            }
            resolve({
                url,
                reachable,
                events,
                droppedInvalidSignatures,
                closedReason,
                notices,
                error,
            });
        };
        const timer = setTimeout(() => finish(events.length > 0, "timeout"), timeoutMs);
        socket.on("open", () => {
            socket.send(JSON.stringify([
                "REQ",
                subscription,
                { kinds: [...kinds], limit: MAXIMUM_EVENTS_PER_RELAY },
            ]));
        });
        socket.on("message", (data) => {
            let message;
            try {
                message = JSON.parse(data.toString());
            }
            catch {
                return;
            }
            if (!Array.isArray(message))
                return;
            const [verb, ...rest] = message;
            if (verb === "EVENT" && rest[0] === subscription) {
                const event = rest[1];
                if (events.length < MAXIMUM_EVENTS_PER_RELAY &&
                    kinds.includes(event?.kind)) {
                    try {
                        if (verifyEvent(event))
                            events.push(event);
                        else
                            droppedInvalidSignatures += 1;
                    }
                    catch {
                        droppedInvalidSignatures += 1;
                    }
                }
            }
            else if (verb === "EOSE" && rest[0] === subscription) {
                finish(true);
            }
            else if (verb === "CLOSED" && rest[0] === subscription) {
                closedReason = typeof rest[1] === "string" ? rest[1] : "closed";
                finish(true);
            }
            else if (verb === "NOTICE") {
                if (notices.length < 8)
                    notices.push(String(rest[0] ?? ""));
            }
        });
        socket.on("error", (cause) => {
            finish(false, cause instanceof Error ? cause.message : String(cause));
        });
        socket.on("close", () => finish(events.length > 0 || settled, undefined));
    });
}
export function tagValue(tags, name) {
    const matches = tags.filter((tag) => tag.length >= 2 && tag[0] === name);
    return matches.length === 1 ? matches[0][1] : "";
}
/** Keeps the newest replaceable head per kind:pubkey:d coordinate. */
export function foldHeads(events) {
    const heads = new Map();
    for (const event of events) {
        const distinct = tagValue(event.tags, "d");
        if (!distinct)
            continue;
        const key = `${event.kind}:${event.pubkey}:${distinct}`;
        const current = heads.get(key);
        if (!current ||
            event.created_at > current.created_at ||
            (event.created_at === current.created_at && event.id < current.id)) {
            heads.set(key, event);
        }
    }
    return heads;
}
