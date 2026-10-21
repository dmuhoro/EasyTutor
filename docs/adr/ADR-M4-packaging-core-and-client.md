# ADR M4: Packaging — @stashmind/core and @stashmind/client

## Problem
Cross-repo coupling needs a versioned, React Native-safe package plus a typed client generated from StashMind's OpenAPI spec.

## Decision
`@stashmind/core` (ESM + CJS + types, exports map, RN/Metro safe) version 1.1.0 with changelog; published to a private registry (H2) or installed from a tagged git dependency if no token. `@stashmind/client` generated from OpenAPI 3.1. See StashMind `docs/adr/ADR-M4-packaging-core-and-client.md`.

## Reasoning
Explicit versioned coupling; no source duplication between repos.

## Consequences
Publishing requires registry token or tagged-git approval (H2); conformance tests keep schemas honest (ADR-M5).

## Cross-reference
StashMind `docs/adr/ADR-M4-packaging-core-and-client.md`
