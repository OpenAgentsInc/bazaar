# Product

## Register

product

## Users

People, wallets, and agents that need to swap between Bitcoin, Lightning, Liquid, and adjacent rails through independent liquidity providers. They need a fast way to discover a route, understand the quote and trust model, and complete a swap without surrendering custody or relying on one coordinator.

## Product Purpose

Bazaar is the client surface for an open, Nostr-coordinated liquidity market. Providers publish signed offerings, clients negotiate privately, and the wallet verifies scripts, amounts, payment hashes, timelocks, and recovery paths before funding. Success means the swap experience feels as straightforward as a centralized service while the coordinator, relay, and provider remain replaceable and funds remain under user control.

## Brand Personality

Hardened, direct, infrastructure-grade. The product should feel precise and operational, with the compact confidence of a professional market terminal, while remaining approachable enough for a person making a simple swap.

## Anti-references

Avoid speculative crypto marketing, token-casino aesthetics, decorative Web3 effects, custodial ambiguity, unexplained protocol jargon, and claims that imply production readiness before the system has been hardened. Avoid global marketing chrome when the user is in the swap workflow.

## Design Principles

1. Verify before fund: make the amount, route, provider, fees, timing, and recovery conditions legible before money moves.
2. Make trust boundaries explicit: distinguish coordination, liquidity provision, wallet verification, and settlement without forcing users to study the protocol.
3. Keep infrastructure replaceable: the interface must not present one relay or provider as an irreplaceable authority.
4. Prefer operational clarity over spectacle: prioritize dense, calm, actionable information and honest system status.
5. Label maturity honestly: rehearsal, regtest, and mainnet states must never be visually or verbally confused.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support complete keyboard operation, visible focus states, screen-reader labels, high text and control contrast, reduced motion, responsive layouts, and status communication that does not rely on color alone.
