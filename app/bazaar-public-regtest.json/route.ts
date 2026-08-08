import { readPublicRegtestEnvelope } from "@/lib/immortal/public-manifest"

export const dynamic = "force-dynamic"

export async function GET(): Promise<Response> {
  const envelope = await readPublicRegtestEnvelope()
  if (envelope === null) {
    return Response.json(
      { error: "public_regtest_manifest_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    )
  }
  return new Response(envelope, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
    },
  })
}
