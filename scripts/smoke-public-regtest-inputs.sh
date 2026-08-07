#!/usr/bin/env bash
set -euo pipefail

gateway="${BAZAAR_PUBLIC_REGTEST_GATEWAY_URL:-https://gateway.34-41-78-122.sslip.io}"
origin="${BAZAAR_PUBLIC_REGTEST_ORIGIN:-https://bazaar.openagents.com}"

for swap_type in reverse submarine; do
  requester="$(openssl rand -hex 32)"
  nonce="$(openssl rand -hex 32)"
  created="$(curl -fsS \
    -H "Origin: ${origin}" \
    -H "Content-Type: application/json" \
    --data "{\"schema\":\"openagents.immortal.public-regtest-session-create.v1\",\"requester_identity\":\"${requester}\",\"client_nonce\":\"${nonce}\"}" \
    "${gateway}/v1/public-regtest/sessions")"
  capability="$(jq -er .capability <<<"${created}")"
  session_id="$(jq -er .signed_manifest.manifest.sandbox_session_id <<<"${created}")"
  input="$(curl -fsS --max-time 40 \
    -H "Origin: ${origin}" \
    -H "Authorization: ImmortalRegtest ${capability}" \
    -H "Content-Type: application/json" \
    --data "{\"schema\":\"openagents.immortal.public-regtest-demo-input-request.v1\",\"sandbox_session_id\":\"${session_id}\",\"swap_type\":\"${swap_type}\",\"amount_sat\":100000}" \
    "${gateway}/v1/public-regtest/sessions/${session_id}/inputs")"

  expected_prefix="bcrt1"
  if test "${swap_type}" = submarine; then expected_prefix="lnbcrt"; fi
  jq -e --arg kind "${swap_type}" --arg prefix "${expected_prefix}" '
    .swap_type == $kind and .amount_sat == 100000 and
    (.destination | startswith($prefix))
  ' <<<"${input}" >/dev/null
  jq -n \
    --arg swap_type "${swap_type}" \
    --arg destination_prefix "$(jq -r .destination <<<"${input}" | cut -c1-12)" \
    --argjson destination_length "$(jq -r '.destination | length' <<<"${input}")" \
    '{swap_type:$swap_type,destination_prefix:$destination_prefix,destination_length:$destination_length,verified:true}'

  curl -fsS -X DELETE \
    -H "Origin: ${origin}" \
    -H "Authorization: ImmortalRegtest ${capability}" \
    "${gateway}/v1/public-regtest/sessions/${session_id}" >/dev/null
done
