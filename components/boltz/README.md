# Boltz interaction components

These React components adapt the core interaction patterns from the
[Boltz Web App](https://github.com/BoltzExchange/boltz-web-app) for Bazaar's
design tokens and trust model. Both projects use the AGPL-3.0 license.

The implementation is rewritten for React, TypeScript, Next.js, and the local
Base UI primitives; it does not depend on the reference application's SolidJS
runtime or stylesheets.

The port covers asset and amount selection, destination states, fee comparison,
route optimization, payment requests, recovery-key verification, lifecycle
status, settings, history, and pagination. Protocol execution and wallet
adapters remain in Bazaar's application layer rather than these presentation
components.
