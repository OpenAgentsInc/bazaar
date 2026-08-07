#!/usr/bin/env bash
set -euo pipefail

repo_root="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd -P)"
immortal_repo="${IMMORTAL_REPO:-${repo_root}/../immortal}"
receipt_path="${BAZAAR_FUNDED_RECEIPT:-${repo_root}/target/funded-regtest-receipt.json}"
launcher_pid=""
acceptance_root="$(mktemp -d "${TMPDIR:-/tmp}/bazaar-funded-acceptance.XXXXXX")"
launch_manifest="${acceptance_root}/launch.json"
launcher_log="${acceptance_root}/immortal.log"

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  if test -n "${launcher_pid}" && kill -0 "${launcher_pid}" >/dev/null 2>&1; then
    kill -TERM "${launcher_pid}" >/dev/null 2>&1 || true
    wait "${launcher_pid}" >/dev/null 2>&1 || true
  fi
  rm -rf -- "${acceptance_root}"
  exit "${status}"
}
trap cleanup EXIT INT TERM

if ! test -x "${immortal_repo}/scripts/test-provider-funded.sh"; then
  echo "run-funded-regtest-acceptance: IMMORTAL_REPO is not a compatible checkout" >&2
  exit 1
fi
if curl --silent --max-time 1 http://127.0.0.1:3000 >/dev/null 2>&1; then
  echo "run-funded-regtest-acceptance: port 3000 is already in use" >&2
  exit 1
fi
adapter_status="$(curl --silent --max-time 1 --output /dev/null --write-out '%{http_code}' \
  --header 'Origin: http://127.0.0.1:3000' http://127.0.0.1:19336/v1/session || true)"
if test "${adapter_status}" != 000; then
  echo "run-funded-regtest-acceptance: port 19336 is already in use" >&2
  exit 1
fi

(
  cd "${immortal_repo}"
  exec env \
    IMMORTAL_PROVIDER_FUNDED_BROWSER_DEMO=1 \
    IMMORTAL_PROVIDER_FUNDED_BROWSER_DEMO_CLIENT=external \
    IMMORTAL_PROVIDER_FUNDED_RESTART_AT= \
    scripts/test-provider-funded.sh
) >"${launcher_log}" 2>&1 &
launcher_pid=$!

echo "run-funded-regtest-acceptance: provisioning disposable Immortal topology"
for _ in $(seq 1 1800); do
  if ! kill -0 "${launcher_pid}" >/dev/null 2>&1; then
    echo "run-funded-regtest-acceptance: Immortal launcher exited" >&2
    tail -80 "${launcher_log}" >&2
    exit 1
  fi
  adapter_status="$(curl --silent --max-time 1 --output /dev/null --write-out '%{http_code}' \
    --header 'Origin: http://127.0.0.1:3000' http://127.0.0.1:19336/v1/session || true)"
  if test "${adapter_status}" = 200 || test "${adapter_status}" = 404; then break; fi
  sleep 1
done
if test "${adapter_status}" != 200 && test "${adapter_status}" != 404; then
  echo "run-funded-regtest-acceptance: funded adapter did not become ready" >&2
  tail -80 "${launcher_log}" >&2
  exit 1
fi

immortal_revision="$(git -C "${immortal_repo}" rev-parse HEAD)"
bazaar_revision="$(git -C "${repo_root}" rev-parse HEAD)"
node "${repo_root}/scripts/create-funded-launch-manifest.mjs" \
  --output "${launch_manifest}" \
  --adapter http://127.0.0.1:19336 \
  --origin http://127.0.0.1:3000 \
  --immortal-revision "${immortal_revision}" \
  --bazaar-revision "${bazaar_revision}" >/dev/null

echo "run-funded-regtest-acceptance: driving Bazaar through both funded journeys"
cd "${repo_root}"
IMMORTAL_FUNDED_DEMO_MANIFEST="${launch_manifest}" \
BAZAAR_FUNDED_RECEIPT="${receipt_path}" \
  pnpm exec playwright test --config playwright.funded.config.ts

test -s "${receipt_path}"
echo "run-funded-regtest-acceptance: public receipt ${receipt_path}"
