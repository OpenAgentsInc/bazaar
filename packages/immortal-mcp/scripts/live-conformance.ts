import { getQuotes } from "../src/tools/get-quotes.js"
import { networkStatus } from "../src/tools/network-status.js"

const manifestUrl = process.env.IMMORTAL_MANIFEST_URL
if (!manifestUrl) throw new Error("IMMORTAL_MANIFEST_URL is required")

const networkResult = await networkStatus({ manifestUrl })
if (networkResult.isError)
  throw new Error(networkResult.content[0]?.text ?? "network status failed")
const networkText = networkResult.content.find(
  (entry) => entry.type === "text"
)?.text
if (!networkText) throw new Error("network_status returned no JSON text")
const network = JSON.parse(networkText) as {
  providers?: { pubkey?: string; state?: string; trust?: string }[]
  relays?: { snapshotEvents?: number; closedReason?: string | null }[]
}
if (
  !network.relays?.every(
    (relay) => (relay.snapshotEvents ?? 0) > 0 && relay.closedReason == null
  ) ||
  (network.providers?.filter((provider) => provider.state === "ready").length ??
    0) < 2
) {
  throw new Error("authenticated network_status snapshot failed conformance")
}
const expectedDiscovered = process.env.IMMORTAL_EXPECT_DISCOVERED_PROVIDER
if (
  expectedDiscovered &&
  !network.providers?.some(
    (provider) =>
      provider.pubkey === expectedDiscovered &&
      provider.state === "ready" &&
      provider.trust === "discovered"
  )
) {
  throw new Error("expected discovered provider is not ready")
}
console.log("PASS network_status: authenticated live relay snapshots")
if (expectedDiscovered)
  console.log("PASS network_status: expected discovered provider is ready")

const result = await getQuotes({
  manifestUrl,
  direction: "LN->BTC",
  amountSat: 100_000,
})
if (result.isError) throw new Error(result.content[0]?.text ?? "quote failed")
const text = result.content.find((entry) => entry.type === "text")?.text
if (!text) throw new Error("get_quotes returned no JSON text")
const value = JSON.parse(text) as {
  schema?: string
  quotes?: { signatureVerified?: boolean }[]
  selected?: { quoteId?: string }
}
if (
  value.schema !== "openagents.immortal-mcp.signed-quotes.v1" ||
  value.quotes?.length !== 2 ||
  value.quotes.some((quote) => quote.signatureVerified !== true) ||
  !value.selected?.quoteId
) {
  throw new Error("live competitive Quote result failed conformance")
}
console.log("PASS get_quotes: two engine-validated signed Quotes")
console.log("PASS get_quotes: deterministic winner selected")
console.log("live conformance: all checks passed")
