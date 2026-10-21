# ADR M1: Integration pattern — shared core package plus typed API client

## Problem
StashMind and EasyTutor must integrate without merging data stores or copying source between repos. Cross-repo coupling must be explicit and versioned.

## Decision
Couple the two repos only through `@stashmind/core` (versioned package, React Native / Metro safe) and StashMind's OpenAPI-generated `@stashmind/client`. StashMind owns lessons/cards/audio/ask-the-source; EasyTutor owns learner profiles/curriculum/roadmaps/RAG/progress, linked via the `stashmind_links` ID table. See StashMind `docs/adr/ADR-M1-integration-pattern.md` for the full decision.

## Reasoning
Avoids data-migration risk and keeps each repo's data store sovereign; coupling is visible in package.json / OpenAPI rather than hidden copied code.

## Consequences
Two systems to operate; version drift between core and client must be managed; conformance tests keep schemas in sync (ADR-M5).

## Cross-reference
StashMind `docs/adr/ADR-M1-integration-pattern.md`
