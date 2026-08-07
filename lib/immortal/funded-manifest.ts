import "server-only"

import { lstat, readFile } from "node:fs/promises"

import {
  FundedConfigError,
  parseFundedRegtestLaunchManifest,
  type FundedRegtestConfigResult,
} from "./funded-config"

const MAXIMUM_FUNDED_MANIFEST_BYTES = 16_384

export async function readFundedRegtestConfig(): Promise<FundedRegtestConfigResult> {
  const manifestPath = process.env.IMMORTAL_FUNDED_DEMO_MANIFEST
  if (!manifestPath) {
    return {
      state: "unavailable",
      code: "funded_manifest_not_configured",
      detail: "Start the local funded-regtest lab to enable this mode.",
    }
  }
  try {
    const metadata = await lstat(manifestPath)
    if (
      !metadata.isFile() ||
      metadata.isSymbolicLink() ||
      metadata.size < 2 ||
      metadata.size > MAXIMUM_FUNDED_MANIFEST_BYTES
    ) {
      throw new FundedConfigError(
        "The funded launch manifest is not a bounded regular file."
      )
    }
    const value: unknown = JSON.parse(await readFile(manifestPath, "utf8"))
    return { state: "ready", config: parseFundedRegtestLaunchManifest(value) }
  } catch (cause) {
    return {
      state: "unavailable",
      code:
        cause instanceof FundedConfigError
          ? "funded_manifest_incompatible"
          : "funded_manifest_unavailable",
      detail:
        cause instanceof FundedConfigError
          ? cause.message
          : "The funded launch manifest could not be read.",
    }
  }
}
