# Boltz Parity Gap Analysis and Roadmap

Status: analysis of record, 2026-08-07
Scope: everything live in the Boltz ecosystem (`~/work/projects/repos/boltz/`,
31 repos; web app v2.2.1, backend v3.13.0, client v2.12.5) versus everything
built, in flight, or planned for Bazaar + Immortal (bazaar#1–#18,
immortal#1–#45, `docs/network-visualization-spec.md`,
`docs/network-map-and-onboarding.md`).
Design baseline: `immortal/docs/inspiration/boltz.md` (the borrow/reject
thesis). License note: the AGPL backend/web-app are behavior references only;
nothing here proposes copying code.

## 1. Framing

Boltz was a centrally operated noncustodial swap service; it got pulled
offline, which is precisely the failure mode Immortal exists to remove. We
rebuilt the *coordination* layer decentralized (Nostr market, competing
providers, custody-free relays, client verification). What we have not yet
rebuilt is most of the *product* that sat on top: the asset breadth, the
recovery UX, the operator ecosystem, and the integration surface. This
document is the honest ledger of that difference.

Two kinds of "gap" appear below and must not be confused:

- **Parity gaps** — things users/operators had that we must replace
  (sometimes in a different, market-native shape).
- **Deliberate rejections** — things that only make sense with one central
  operator and that we refuse on principle (they carry the single point of
  failure that killed the original service).

## 2. Where we already stand

Have (built or landing this week via the public-regtest program):

- Submarine and reverse swaps, BTC ↔ Lightning, with full client-side
  verification (scripts, trees, amounts, payment hash, timelocks, refund
  paths) — the "don't trust, verify" law Boltz documented, enforced harder.
- The Liquid rail in Immortal (elementsd leg, immortal#27) — not yet exposed
  in Bazaar's card beyond asset selection.
- MuSig2/Taproot cooperative paths with unilateral exit packages persisted
  *before funding* (stronger than Boltz's rescue-file-after-the-fact).
- 0-conf acceptance policy parity (immortal#30).
- Hold-invoice reverse mechanics (CLN hold plugin required, like Boltz).
- Multi-provider RFQ → competing signed Quotes → client-side selection —
  Boltz never had this; it *is* our pricing layer.
- Two-relay, two-provider persistent public regtest with signed launch
  manifests, capability-scoped effect gateway, funded browser sessions
  (immortal#41–#44, bazaar#7–#10).
- Sequenced dual Status streams, causal gates, evidence rungs, loss-accounted
  Close records, doomsday drills (relay death, provider death, client death).
- The full viz system + network map/onboarding/MCP plan (bazaar#16–#18,
  immortal#45).
- A Boltz REST/WS compatibility facade already scaffolded (relay 307 handoff
  + provider compat listener) — our single biggest ecosystem lever, see §6.

The decentralization dividend — no operator can take the market offline, no
coordinator holds funds, quotes compete — is real and is not revisited below.
Everything else is.

## 3. Gap matrix

Legend: ✅ have · 🟡 partial / different shape · ❌ gap · 🚫 rejected by design.

### 3.1 Assets and rails

| Boltz (live) | Ours | Notes |
| --- | --- | --- |
| BTC on-chain | ✅ | |
| Lightning BOLT11 | ✅ | |
| Liquid L-BTC (confidential, blinding, covenant claims) | 🟡 | Rail exists in Immortal; Bazaar card lists LBTC but the public demo exercises BTC/LN only. Confidential-tx UX (blinded explorer links, unblinding) absent. |
| Rootstock RBTC (EVM native, RIF Relay gas abstraction) | ❌ | Whole EVM rail class absent. |
| Arbitrum ERC-20 hub: TBTC, WBTC, USDT0, USDC | ❌ | Includes EtherSwap/ERC20Swap contracts, EIP-712 commitment swaps. |
| Bridge fabric: 22 USDT0 (LayerZero OFT) + 16 USDC (CCTP) chains, Solana/Tron transports | 🚫→❌ | This is Boltz-as-aggregator across 31 chains. Not a parity target for the market core; could someday be an individual provider's advertised capability. |
| DEX legs (Uniswap quoter, multi-hop routes) | 🚫→❌ | Same reasoning. |
| Ark / Arkade vHTLCs | 🟡 | Immortal already reserves the asset grammar (`swp:1:…:btc:ark:(arkade|bark):…`), the adversarial lab runs arkd, and doomsday-ark cases exist. No provider rail adapter, no UI. Boltz ships it server-side (ArkClient/ArkNursery) but hides it in the web UI too. **This is our most reachable new rail.** |
| Taproot Assets | — | Neither has it. Our `tap-ldk` work is a beyond-parity option, out of scope here. |

### 3.2 Swap capabilities

| Boltz | Ours | Notes |
| --- | --- | --- |
| Submarine / Reverse | ✅ | |
| Chain swaps (on-chain ↔ on-chain) in product UI | 🟡 | MKT-SWP fully specifies the chain state machine (incl. dual refund branches); lab covers it; Bazaar card does not offer it. |
| Commitment swaps (lock first, invoice later, EIP-712) | ❌ | EVM-dependent; inherits the EVM decision. |
| 0-conf policy (RBF rejection, fee floor, risk budget, auto-trip) | 🟡 | Acceptance policy done (immortal#30); the running per-provider risk accumulator/auto-disable and Liquid quorum question remain. Boltz's Liquid `zeroConfTool` quorum oracle is a centralized dependency — our answer should be requester-side confirmation policy, not an oracle. |
| Zero-amount chain swaps, overpayment protection, quote renegotiation (`/quote` accept-new-amount) | ❌ | Renegotiation needs an MKT-SWP extension (a re-quote record class); today an amount mismatch is a refusal. |
| Batched/deferred claim sweeps (4 trigger strategies) | 🟡 | Per-provider cost optimization; `immortal-provider` watch jobs exist but no batching. Market-native: each provider optimizes its own sweeps; not protocol work. |
| Magic Routing Hints (invoice → BIP-21 direct-pay bypass) | ❌ | High-leverage UX: two Immortal-aware wallets should settle directly instead of swapping. Needs an MKT note (routing-hint equivalent in Offering/Quote). |
| BOLT12 offers, BIP-353 DNS names | ❌ | Boltz: full fetch/resolve path incl. DNSSEC-prover WASM in the browser. |
| LNURL-pay + Lightning addresses | ❌ | |
| Zero-amount BOLT11 | — | Boltz rejects too. Parity by refusal. |

### 3.3 Recovery and rescue UX (Boltz's most developed area)

| Boltz | Ours | Notes |
| --- | --- | --- |
| Rescue key: BIP39 mnemonic, enforced 4-step backup flow before swap | 🟡 | We persist exit packages pre-funding (stronger guarantee) but have **no user-facing backup ceremony, no mnemonic, no download**. |
| `POST /v2/swap/restore` from xpub — recover swaps with zero local state | 🟡 | Our NIP-59 sender-recovery wraps + relay persistence enable restore-from-relay with only the Nostr key; `StoredImmortalSession` restores locally. Nobody has built the "I lost everything, here's my key" page. |
| External rescue: EVM log scanning, gas-abstraction sweeps | ❌ | EVM-dependent. |
| Asset rescue (wrong Liquid asset to lockup address, co-signed recovery) | ❌ | Liquid-rail follow-up. |
| Refund pages for old/failed swaps, refund ETA, `RefundButton` breadth | 🟡 | Funded demo verifies refunds; there is no standalone refund/rescue surface in Bazaar. |
| Swap history page, pagination, JSON export, log viewer | ❌ | Sessions persist in IndexedDB (better provenance than Boltz's) but no history UI at all. |

### 3.4 Client integrations and app UX

| Boltz | Ours | Notes |
| --- | --- | --- |
| WebLN (`makeInvoice`, detection) | ❌ | Cheap, high-value for the reverse flow. |
| QR generate | ✅ | |
| QR scan (camera) | ❌ | |
| EVM wallets (EIP-6963, WalletConnect/Reown, Solana/Tron adapters), Ledger/Trezor | 🚫→❌ | Follows the EVM decision; hardware-wallet signing for BTC/Liquid refunds is a separate, worthwhile question. |
| Settings: denomination, fiat currency, decimal separator, privacy mode, 0-conf toggle | 🟡 | We have a settings popover skeleton; none of these controls. |
| Fiat rates (3-provider failover) + per-line fiat fee display | ❌ | Note: rate *sources* are a client concern, not a coordinator concern — keep it that way. |
| i18n (en, de, es, pt, zh, ja) | ❌ | |
| Embedded/iframe mode + `postMessage` status, URL params (13 documented, test-enforced) | ❌ | Our MCP plan covers agents; embedded mode covers webshops/wallets. Both matter. |
| PWA, Tor `.onion` mirrors, reload guard on pending swaps | ❌ | Tor story is *different* for us: relays are already user-selectable; an onion relay listing beats a mirrored webapp. |
| Landing page with live network stats + integrations wall | 🟡 | Our `/network` map plan (bazaar#16) is the stronger version of this. |

### 3.5 Provider-side and operations

| Boltz | Ours | Notes |
| --- | --- | --- |
| `boltz-client` daemon: **autoswap** (channel rebalancing + wallet-target chain swaps, budgets, dry-run recommendations), embedded BDK/LWK wallets, multi-tenant macaroons, gRPC+REST | ❌ | The biggest product gap on the demand side. Immortal's thesis says autoswap policy is client-owned — correct — but nobody has built the client daemon that *consumes our market* for node runners/merchants. This is also the BTCPay path (§3.6). |
| Referral/partner layer: `feeShare`, per-partner premiums (incl. negative), limits, `hidePair`, HMAC stats API, partner dashboard, Boltz Pro (= referral `pro` with dynamic pricing) | 🟡/🚫 | Central price discrimination is rejected. The market-native equivalents: competing quotes already do price discovery; per-integration affiliate fees need a small MKT primitive (an `ExtraFee`-like declared fee-split tag in RFQ/Quote so wallets can monetize integrations transparently). Negative-fee quotes (provider pays to rebalance) should be legal in the Quote schema — check and, if blocked, amend. |
| Prometheus metrics (20+ gauges), OTLP tracing, Loki, chatops admin, alerting | 🟡 | Provider health snapshot + Prometheus text exist; relay-side and fleet-level dashboards, alerting, and an ops runbook culture do not. |
| gRPC admin (40+ methods, scoped JWT), policy hook streams (6 bidi accept/reject/hold hooks) | 🟡 | Provider daemon has config + contract export; nothing like scoped remote admin or externalized policy hooks. Policy hooks map naturally onto provider-side quote/effect policy plugins. |
| Watchtower/nurseries per chain, rebroadcaster, fee bumper | 🟡 | Provider watch jobs + due-height ledger exist; RBF fee-bumping and stuck-tx rebroadcast discipline unverified at parity depth. |
| hold plugin (CLN) | ✅ | Required and used. |
| cln-backup (SCB → S3/WebDAV), channel-bot (imbalance/zombie ops), canary | ❌ | Operator quality-of-life kit; matters for third-party providers joining via immortal#45. A warrant canary is *more* meaningful for relay operators than it was for Boltz. |
| Webhooks per swap (HTTPS, retries) | ❌ | Provider/gateway-side notification for integrators; also covered differently by Nostr subscriptions. |
| DB posture: Sequelize+Postgres+Redis cache, versioned migrations, encrypted backups | 🟡 | One-Postgres rule + migrations exist; encrypted backup tooling absent. |

### 3.6 Distribution and ecosystem

| Boltz | Ours | Notes |
| --- | --- | --- |
| `boltz-swaps` npm SDK (40 subpath exports; the web app is a thin UI over it) | 🟡 | Immortal ships the WASM requester engine + versioned requester-API fixtures; Bazaar's `lib/immortal/*` is the TS host. Not yet extracted/published as an SDK others can embed. |
| BTCPay plugin (Liquid: rebalance + nodeless modes; ships boltz-client) | ❌ | Two routes: (a) qualify the **Boltz compat facade** so the *existing* BTCPay plugin + boltz-client work against an Immortal provider with minimal changes; (b) native plugin later. (a) is the cheap, huge win. |
| Boltz-compatible third-party wallet ecosystem (Aqua, Breez, LNbits, ~25 integrations) | 🟡 | Same lever: the compat facade inherits this ecosystem if it truly matches API v2 + WS semantics. Qualification corpus needed. |
| Docs: four product doc sites, `llms.txt`, self-hosting guides, products pages | 🟡 | We have deep protocol docs; almost no integrator-facing docs. `llms.txt` is cheap and on-brand. |
| Umbrel packaging, Telegram/SimpleX/Discord presence, fee-comparison marketing | ❌ | Post-mainnet concerns; join-kit (immortal#45) is our packaging story. |

## 4. Deliberate rejections (unchanged from the thesis, restated for this matrix)

- One provider API as market authority; relay custody of anything.
- Central referral/price-discrimination service and HMAC partner accounts as
  *the* pricing layer (replaced by competing quotes + a declared fee-split
  primitive).
- Centralized 0-conf quorum oracle for Liquid (requester confirmation policy
  instead).
- The 31-chain bridge/DEX aggregator as core scope (possible future
  per-provider capability, never coordinator scope).
- Email/Discord/Mattermost internal ops plumbing as product surface.

## 5. Roadmap

Phases assume the current public-regtest program (immortal#44, bazaar#7–#10)
and the map/onboarding epic (bazaar#18, immortal#45) land first. Ordering
optimizes for: user safety parity → market/ecosystem leverage → asset breadth.

### P1 — User-safety and core-UX parity (Bazaar-heavy)

1. **Recovery surface**: backup ceremony (exit-package + Nostr key download,
   verify step), `/rescue` page implementing restore-from-relay with only a
   key, standalone refund page for expired/failed sessions with ETA.
2. **Swap history**: sessions list, detail (reusing session-lanes viz),
   JSON export, log viewer.
3. **Destination parsing breadth**: LNURL-pay, Lightning address, BOLT12
   fetch, BIP-21, network-aware validation, QR camera scan, WebLN.
4. **Chain swaps in the card** (BTC↔L-BTC first) riding the existing MKT-SWP
   chain machine; Liquid confidential UX (blinded explorer links).
5. **Settings parity**: denomination, fiat display (client-side rate
   sources with failover), decimal separator, privacy mode, 0-conf toggle.

### P2 — Market and operator parity (Immortal-heavy)

6. **Compat-facade qualification**: run boltz-client and the BTCPay Liquid
   plugin against an Immortal provider's compat listener; fix to a published
   compatibility statement + corpus. This single item inherits Boltz's
   integration ecosystem.
7. **`immortal-autoswap` client daemon**: the boltz-client replacement that
   consumes the open market — channel-rebalance + wallet-target policies,
   budgets, dry-run recommendations, multi-tenant auth; policy stays
   client-owned per the thesis.
8. **Pricing primitives**: legalize negative-fee quotes; add the declared
   fee-split (affiliate) tag to RFQ/Quote; document the "Pro" equivalent as
   ordinary market behavior (providers publishing aggressive Offerings when
   they need rebalancing).
9. **Operator kit**: relay+fleet Prometheus/alerting/dashboards, encrypted
   backups, SCB backup guidance, RBF bump/rebroadcast hardening, warrant
   canary template for relay operators — folded into the join kit
   (immortal#45) so third-party operators inherit it.
10. **Quote renegotiation** MKT-SWP extension (re-quote record class) +
    overpayment handling.

### P3 — Asset expansion

11. **Ark/Arkade rail to production**: provider adapter over arkd (grammar,
    lab, and doomsday cases already exist), then UI. First new rail; also
    the most differentiating (Boltz ships it server-side but hides it).
12. **Liquid completeness**: asset-rescue equivalent, covclaim-class offline
    receive story (decide: reject as trust-adding, or provider-side option),
    USDT-on-Liquid evaluation.
13. **EVM decision point** (explicit go/no-go): RSK/EtherSwap-class rail
    means contracts, audits, gas abstraction, wallet stacks — a program,
    not a feature. Recommendation: defer until after mainnet BTC/LN/Liquid;
    revisit against demand. Magic-routing-hint equivalent (direct-settle
    between Immortal wallets) lands here regardless of the EVM outcome.

### P4 — Ecosystem and reach

14. **SDK extraction**: publish the requester engine + TS host as an
    embeddable package (our `boltz-swaps` analog), with `llms.txt` and
    integrator docs sites.
15. **Embedded mode**: iframe + `postMessage` status contract + URL params,
    documented and test-enforced.
16. **i18n**, PWA, onion-relay guidance, native BTCPay plugin if the compat
    route shows demand, packaging (Umbrel et al.).

## 6. The one asymmetric bet

Every phase above closes a gap; one item *inverts* one: the Boltz
compatibility facade (§P2.6). Boltz's moat was its integration wall — wallets
and merchants wired to API v2. That service is gone, the clients remain. A
qualified compat surface on every Immortal provider turns each of those
integrations into a doorway onto the open market, at the cost of a
qualification corpus rather than a bizdev campaign. It should be treated as
the highest-leverage single deliverable after the public demo ships.
