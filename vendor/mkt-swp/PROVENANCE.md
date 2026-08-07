# Vendored Immortal browser boundary

`immortal-browser-abi.ts` is the framework-neutral browser boundary from
`OpenAgentsInc/openagents` commit
`9843df74c3577a8ba1a326692ec69011bf1d0931`. Its SHA-256 is
`bf881d40b212367ac54186b3405169dae32b5985c0fa9b4e02d397c505cc0942`.

The boundary pins Immortal source revision
`d62a4f7c6c34a11d191fe78316fd8d4ce4da1d34`, browser ABI version 1, and
requester API digest
`bf52fda5f4d349fbbe195e4cff58af59a3930e1ee8ab1f1413b6338ba44fb3a8`.
It is vendored because the OpenAgents package is not published to npm. Bazaar
does not implement MKT-SWP verification itself.

`swp-browser-abi-v1.json` is copied from that exact Immortal revision. Its
SHA-256 is
`2a25819d6277f7e182ff5a10c80f00c403fe61ccbc98f20e7971e527b8ac4400`.
