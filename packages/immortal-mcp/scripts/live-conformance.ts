import { getQuotes } from "../src/tools/get-quotes.js"

const manifestUrl = process.env.IMMORTAL_MANIFEST_URL
if (!manifestUrl) throw new Error("IMMORTAL_MANIFEST_URL is required")

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
