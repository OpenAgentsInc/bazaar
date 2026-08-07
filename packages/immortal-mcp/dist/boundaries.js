// Hard boundaries shared by every tool in this server.
//
// - Regtest only. Every tool operates exclusively against the Immortal
//   public regtest network. Mainnet identifiers fail argument validation.
// - This server never holds provider seeds. It drives the local join-kit
//   daemon, which owns its own keys.
// - No tool can alter or sign the launch manifest. Pinning is a signed,
//   human decision made in the immortal repo.
export const REGTEST_NETWORK = "bip122:0f9188f13cb7b2c9e5c72a6b65eeada4";
export const MAINNET_NETWORK = "bip122:000000000019d6689c085ae165831e93";
export const HARD_BOUNDARIES = "HARD BOUNDARIES: regtest only (network " +
    REGTEST_NETWORK +
    "); this server never holds provider seeds (the local daemon owns its keys); " +
    "mainnet identifiers (bc1/1/3 addresses, lnbc invoices, the mainnet chain id) fail argument validation; " +
    "no tool can alter or sign the launch manifest.";
export class BoundaryError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "BoundaryError";
    }
}
const BECH32_CHARSET = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{6,90}$/;
const BASE58_MAINNET = /^[13][1-9A-HJ-NP-Za-km-z]{25,39}$/;
/**
 * Rejects values that look like mainnet Bitcoin/Lightning identifiers.
 * Applied to every free-form string argument before any network effect.
 */
export function rejectMainnetIdentifiers(value, field) {
    const lower = value.toLowerCase();
    if (lower.includes(MAINNET_NETWORK)) {
        throw new BoundaryError("mainnet_identifier_rejected", `${field} contains the mainnet chain id; this server is regtest-only.`);
    }
    if (/^bc1[a-z0-9]+$/.test(lower) || /^tb1[a-z0-9]+$/.test(lower)) {
        throw new BoundaryError("mainnet_identifier_rejected", `${field} looks like a mainnet/testnet bech32 address; only bcrt1 regtest addresses are accepted.`);
    }
    if (BASE58_MAINNET.test(value)) {
        throw new BoundaryError("mainnet_identifier_rejected", `${field} looks like a legacy mainnet address; only bcrt1 regtest addresses are accepted.`);
    }
    if (lower.startsWith("lnbc") && !lower.startsWith("lnbcrt")) {
        throw new BoundaryError("mainnet_identifier_rejected", `${field} looks like a mainnet Lightning invoice; only lnbcrt regtest invoices are accepted.`);
    }
}
/** Requires a lowercase bcrt1 regtest bech32 address. */
export function assertRegtestAddress(address) {
    rejectMainnetIdentifiers(address, "address");
    if (!address.startsWith("bcrt1")) {
        throw new BoundaryError("address_not_regtest", "The address must be a regtest bech32 address with the bcrt1 prefix.");
    }
    const data = address.slice("bcrt1".length);
    if (!BECH32_CHARSET.test(data)) {
        throw new BoundaryError("address_invalid", "The address is not a valid lowercase bech32 string after the bcrt1 prefix.");
    }
}
export function assertHttpUrl(value, field) {
    rejectMainnetIdentifiers(value, field);
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new BoundaryError("url_invalid", `${field} is not a valid URL.`);
    }
    const isLocal = url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname.endsWith(".internal") ||
        url.hostname.endsWith(".local");
    if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
        throw new BoundaryError("url_invalid", `${field} must use https (plain http is allowed only for localhost/private hosts).`);
    }
    return url;
}
export function assertWsUrl(value, field) {
    rejectMainnetIdentifiers(value, field);
    let url;
    try {
        url = new URL(value);
    }
    catch {
        throw new BoundaryError("url_invalid", `${field} is not a valid URL.`);
    }
    if (url.protocol !== "wss:" && url.protocol !== "ws:") {
        throw new BoundaryError("url_invalid", `${field} must be a ws:// or wss:// relay URL.`);
    }
    return url;
}
const LOWER_HEX_32 = /^[0-9a-f]{64}$/;
export function assertHexPubkey(value, field) {
    if (!LOWER_HEX_32.test(value)) {
        throw new BoundaryError("pubkey_invalid", `${field} must be a 64-character lowercase hex Nostr pubkey.`);
    }
}
