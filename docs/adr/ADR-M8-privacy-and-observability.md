# ADR M8: Cross-system privacy and observability

## Problem
Data flows between StashMind and EasyTutor via EasyTutor's server holding StashMind service credentials; privacy sign-off (H6) and cross-system traceability are required.

## Decision
Correlation IDs propagated from EasyTutor's server into StashMind requests and logged on both sides; updated data-processor list in both repos' privacy documents (StashMind: Appwrite + Gemini; EasyTutor: Supabase + Ollama + Anthropic + Groq); consent required before lesson summaries enter pgvector RAG; deletion-propagation endpoint removes linked data. No StashMind service credentials in the mobile bundle, repos, logs, or reports. See StashMind `docs/adr/ADR-M8-privacy-and-observability.md`.

## Reasoning
Traceable, auditable cross-system data flows; deletion honoured; processor lists current; secret boundary preserved.

## Consequences
Correlation-ID plumbing across service boundaries; consent UI/state management; H6 privacy sign-off required before cross-system data flows go live.

## Cross-reference
StashMind `docs/adr/ADR-M8-privacy-and-observability.md`
