# ADR M5: Model-router convergence — ModelProvider interface with conformance suite

## Problem
StashMind uses Gemini; EasyTutor routes Anthropic/Groq/Ollama. A shared model contract is needed without forcing migration or breaking existing modes.

## Decision
`ModelProvider` interface in `@stashmind/core` with adapters for Gemini, Anthropic, Groq, Ollama and a conformance suite (shared fixtures, same outputs within tolerance, token accounting). StashMind adopts behind a flag; EasyTutor adopts behind a flag only after parity. The 181 existing tests stay untouched and green. See StashMind `docs/adr/ADR-M5-model-router-convergence.md`.

## Reasoning
Single model contract, parity-tested, gradual strangler adoption, no forced migration.

## Consequences
Conformance suite maintenance; dual routing during transition; duplicates removed only after proven parity.

## Cross-reference
StashMind `docs/adr/ADR-M5-model-router-convergence.md`
