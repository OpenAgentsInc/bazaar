#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${BAZAAR_PUBLIC_REGTEST_BAZAAR_REVISION:?set the deployed Bazaar revision}"
: "${BAZAAR_PUBLIC_REGTEST_IMMORTAL_REVISION:?set the deployed Immortal revision}"

cd "${repo_root}"
pnpm exec playwright test \
  --config playwright.public-regtest.config.ts \
  tests/public-regtest/live.spec.ts

receipt="${BAZAAR_PUBLIC_REGTEST_RECEIPT:-${repo_root}/target/public-regtest-acceptance.json}"
node scripts/scan-public-regtest-receipt.mjs "${receipt}"
printf 'public-regtest acceptance receipt: %s\n' "${receipt}"
