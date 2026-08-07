# Boltz interaction components

These React components adapt the core interaction patterns from the
[Boltz Web App](https://github.com/BoltzExchange/boltz-web-app) for Bazaar's
design tokens and trust model. Both projects use the AGPL-3.0 license.

The implementation is rewritten for React, TypeScript, Next.js, and the local
Base UI primitives; it does not depend on the reference application's SolidJS
runtime or stylesheets.

The port maintains an exact inventory of the reference app's 76 component
modules, 15 lifecycle status modules, and 23 complete screens. The interactive
primitives live beside a Bazaar-native reference catalog in
`reference-catalog.ts` and `reference-showcase.tsx`. Every entry is rendered in
Storybook and on the app's `/boltz` route.

Protocol execution, hardware access, wallet adapters, and external network
effects remain in Bazaar's application layer. Their catalog representations
show the interaction boundary and states without simulating custody or implying
that an unavailable integration is live.
