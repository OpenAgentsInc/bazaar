// request_listing: constructs the prefilled GitHub new-issue URL for the
// OpenAgentsInc/immortal pin request (discovered → pinned). It returns the
// URL only — it never opens a browser and never creates the issue. Pinning
// remains a signed human decision; no automation ever signs the manifest.
import { assertHexPubkey, assertHttpUrl, BoundaryError, rejectMainnetIdentifiers, } from "../boundaries.js";
import { ok } from "../result.js";
const MAXIMUM_HEALTH_JSON_BYTES = 16 * 1024;
export async function requestListing(args) {
    assertHexPubkey(args.pubkey, "pubkey");
    const coordinatePattern = new RegExp(`^39601:${args.pubkey}:[a-z0-9][a-z0-9._-]{0,127}$`);
    if (!coordinatePattern.test(args.offeringCoordinate)) {
        throw new BoundaryError("offering_coordinate_invalid", "offeringCoordinate must be `39601:<pubkey>:<d>` and bound to the given provider pubkey.");
    }
    assertHttpUrl(args.nip11Url, "nip11Url");
    rejectMainnetIdentifiers(args.healthJson, "healthJson");
    if (new TextEncoder().encode(args.healthJson).byteLength >
        MAXIMUM_HEALTH_JSON_BYTES) {
        throw new BoundaryError("health_json_too_large", "healthJson exceeds the 16 KiB bound; trim it to the join kit's health summary.");
    }
    let healthPretty;
    try {
        healthPretty = JSON.stringify(JSON.parse(args.healthJson), null, 2);
    }
    catch {
        throw new BoundaryError("health_json_invalid", "healthJson must be valid JSON (the join kit's health summary).");
    }
    const title = `Listing request: public regtest provider ${args.pubkey.slice(0, 16)}…`;
    const body = [
        "## Public regtest listing request (discovered → pinned)",
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
        "moves tiers on the next manifest refresh (≤300 s). This issue was prefilled by",
        "`@openagentsinc/immortal-mcp` (regtest only; the server never holds provider seeds and cannot alter",
        "or sign the launch manifest).",
    ].join("\n");
    const url = new URL("https://github.com/OpenAgentsInc/immortal/issues/new");
    url.searchParams.set("title", title);
    url.searchParams.set("body", body);
    url.searchParams.set("labels", "listing-request,public-regtest");
    return ok({
        schema: "openagents.immortal-mcp.request-listing.v1",
        url: url.toString(),
        note: "Open this URL in a browser to file the pin request. This tool did not open a browser and did not " +
            "create the issue.",
    });
}
