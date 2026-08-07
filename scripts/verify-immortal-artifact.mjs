import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"

const paths = {
  artifact: new URL("../public/immortal/artifact.json", import.meta.url),
  wasm: new URL("../public/immortal/immortal_client_web.wasm", import.meta.url),
  boundary: new URL("../vendor/mkt-swp/immortal-browser-abi.ts", import.meta.url),
  fixture: new URL("../vendor/mkt-swp/swp-browser-abi-v1.json", import.meta.url),
}

const expected = {
  sourceRevision: "d62a4f7c6c34a11d191fe78316fd8d4ce4da1d34",
  requesterApiSha256:
    "bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8",
  wasmSha256: "aee4e846a1bfb331ab3896c246e6d93ea1fcb2ef82adb4caf229760fc9cbc088",
  wasmBytes: 3_735_499,
  boundarySha256:
    "bf881d40b212367ac54186b3405169dae32b5985c0fa9b4e02d397c505cc0942",
  fixtureSha256:
    "2a25819d6277f7e182ff5a10c80f00c403fe61ccbc98f20e7971e527b8ac4400",
}

const [artifactBytes, wasm, boundary, fixtureBytes] = await Promise.all([
  readFile(paths.artifact),
  readFile(paths.wasm),
  readFile(paths.boundary),
  readFile(paths.fixture),
])
const artifact = JSON.parse(artifactBytes.toString("utf8"))
const fixture = JSON.parse(fixtureBytes.toString("utf8"))

assert(artifact.schema === "openagents.bazaar.immortal-browser-artifact.v1", "artifact schema")
assert(artifact.source_revision === expected.sourceRevision, "source revision")
assert(artifact.requester_api_sha256 === expected.requesterApiSha256, "requester API digest")
assert(artifact.sha256 === expected.wasmSha256, "manifest WASM digest")
assert(artifact.bytes === expected.wasmBytes, "manifest WASM size")
assert(wasm.byteLength === expected.wasmBytes, "WASM size")
assert(sha256(wasm) === expected.wasmSha256, "WASM digest")
assert(!wasm.toString("latin1").includes("/Users/"), "WASM local build path privacy")
assert(sha256(boundary) === expected.boundarySha256, "browser boundary digest")
assert(sha256(fixtureBytes) === expected.fixtureSha256, "browser fixture digest")
assert(fixture.abi_version === 1, "fixture ABI version")
assert(fixture.requester_api_sha256 === expected.requesterApiSha256, "fixture requester digest")

const wasmModule = await WebAssembly.compile(wasm)
assert(WebAssembly.Module.imports(wasmModule).length === 0, "WASM import authority")
const instance = await WebAssembly.instantiate(wasmModule, {})
for (const name of [
  "immortal_mkt_swp_browser_abi_version",
  "immortal_mkt_swp_browser_max_request_bytes",
  "immortal_mkt_swp_browser_max_response_bytes",
  "immortal_mkt_swp_browser_request_reset",
  "immortal_mkt_swp_browser_request_push",
  "immortal_mkt_swp_browser_invoke",
  "immortal_mkt_swp_browser_response_len",
  "immortal_mkt_swp_browser_response_byte",
]) {
  assert(typeof instance.exports[name] === "function", `WASM export ${name}`)
}
assert(instance.exports.immortal_mkt_swp_browser_abi_version() === 1, "WASM ABI version")

console.log(
  `verify-immortal-artifact: ${expected.sourceRevision.slice(0, 8)} ${expected.wasmSha256.slice(0, 12)} zero-import ABI v1 passed`
)

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function assert(condition, label) {
  if (!condition) throw new Error(`Immortal artifact verification failed: ${label}`)
}
