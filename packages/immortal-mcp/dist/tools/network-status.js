// network_status: verified-structure manifest + NIP-11 + a bounded 39600/39601
// discovery snapshot, folded into a PanoramaNetwork-shaped JSON document
// (the same shape the bazaar /network map renders). Stats that require 39603
// receipt aggregation are reported as null, never fabricated.
import { BoundaryError, assertHttpUrl } from "../boundaries.js";
import { fetchManifestSummary } from "../manifest.js";
import { fetchNip11, fetchRelaySnapshot, foldHeads } from "../nostr.js";
import { normalizeOffering, normalizeProviderProfile, } from "../offerings.js";
import { ok, toolError } from "../result.js";
export async function networkStatus(args) {
    const manifestUrl = args.manifestUrl ?? process.env.IMMORTAL_MANIFEST_URL;
    if (!manifestUrl) {
        return toolError("manifest_url_required", "Provide manifestUrl (a URL serving the raw public regtest manifest envelope JSON, e.g. <origin>/bazaar-public-regtest.json) or set IMMORTAL_MANIFEST_URL. No default production origin is baked into this server.");
    }
    assertHttpUrl(manifestUrl, "manifestUrl");
    let manifest;
    try {
        manifest = await fetchManifestSummary(manifestUrl);
    }
    catch (cause) {
        if (cause instanceof BoundaryError)
            throw cause;
        return toolError("manifest_unavailable", `Could not fetch or parse the manifest envelope: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    const pinnedPubkeys = new Set(manifest.providers.map((provider) => provider.pubkey));
    const relayResults = await Promise.all(manifest.relays.map(async (relay) => {
        const [nip11, snapshot] = await Promise.all([
            fetchNip11(relay.websocketUrl),
            fetchRelaySnapshot(relay.websocketUrl, [39_600, 39_601], 10_000),
        ]);
        return { relay, nip11, snapshot };
    }));
    const allEvents = relayResults.flatMap((entry) => [...entry.snapshot.events]);
    const heads = [...foldHeads(allEvents).values()];
    const profiles = heads
        .filter((event) => event.kind === 39_600)
        .map(normalizeProviderProfile);
    const offerings = heads
        .filter((event) => event.kind === 39_601)
        .map(normalizeOffering);
    const offeringsByProvider = new Map();
    for (const offering of offerings) {
        const list = offeringsByProvider.get(offering.providerPubkey) ?? [];
        list.push(offering);
        offeringsByProvider.set(offering.providerPubkey, list);
    }
    const providerPubkeys = new Set([
        ...profiles.map((profile) => profile.pubkey),
        ...offerings.map((offering) => offering.providerPubkey),
        ...pinnedPubkeys,
    ]);
    const relayIdsFor = (pubkey) => relayResults
        .filter((entry) => entry.snapshot.events.some((event) => event.pubkey === pubkey))
        .map((entry) => entry.relay.websocketUrl);
    const providers = [...providerPubkeys].map((pubkey) => {
        const profile = profiles.find((candidate) => candidate.pubkey === pubkey);
        const providerOfferings = offeringsByProvider.get(pubkey) ?? [];
        return {
            id: pubkey,
            pubkey,
            label: profile?.label ?? `provider ${pubkey.slice(0, 12)}…`,
            trust: pinnedPubkeys.has(pubkey)
                ? "pinned"
                : "discovered",
            state: profile
                ? profile.status === "active"
                    ? "ready"
                    : "degraded"
                : "offline",
            profileStatus: profile?.status ?? null,
            relayIds: relayIdsFor(pubkey),
            offerings: providerOfferings.map((offering) => ({
                coordinate: offering.coordinate,
                status: offering.status,
                swapTypes: offering.swapTypes,
                sides: offering.sides,
                parseError: offering.parseError ?? null,
            })),
            // 39603 receipt aggregation is not implemented in this server yet.
            feeBps: null,
            swaps24h: null,
            volumeSat24h: null,
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
            verification: manifest.verification,
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
            error: snapshot.error ?? null,
        })),
        providers,
        clientCount: null,
        stats: {
            swaps24h: null,
            volumeSat24h: null,
            operatorFeeSat24h: null,
            note: "39603 public-market-receipt aggregation is not implemented in this server; stats are null, not zero.",
        },
        activity: null,
    });
}
