# Vendored Immortal browser boundary

`immortal-browser-abi.ts` is based on the framework-neutral browser boundary
from `OpenAgentsInc/openagents` commit
`9843df74c3577a8ba1a326692ec69011bf1d0931`. That upstream file has SHA-256
`bf881d40b212367ac54186b3405169dae32b5985c0fa9b4e02d397c505cc0942`.

Bazaar's compatibility copy has SHA-256
`5acfcd3e7cccc237cb63874d2d16bc82cfff1aa17626e63fd8191f240840f0f3`.
It advances the pinned Immortal source revision and includes the progressive
session-delivery input required by Bazaar's qualified demo artifact. ABI
version 1 and the requester API digest remain unchanged.

The boundary pins Immortal source revision
`69a78231ffeae5a78fe45de9aba122db00178953`, browser ABI version 1, and
requester API digest
`bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8`.
It is vendored because the OpenAgents package is not published to npm. Bazaar
does not implement MKT-SWP verification itself.

OpenAgents commit `9843df74c3577a8ba1a326692ec69011bf1d0931` pins the older
Immortal revision `d62a4f7c6c34a11d191fe78316fd8d4ce4da1d34`. Do not replace
Bazaar's copy with that older boundary without rebuilding and qualifying the
matching WASM artifact.

`swp-browser-abi-v1.json` is copied from that exact Immortal revision. Its
SHA-256 is
`2a25819d6277f7e182ff5a10c80f00c403fe61ccbc98f20e7971e527b8ac4400`.
