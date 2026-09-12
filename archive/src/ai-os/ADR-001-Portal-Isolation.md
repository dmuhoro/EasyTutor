# ADR 001: Portal Isolation Strategy

## Status: ACCEPTED
## Date: 2026-05-12

## Context
EasyTutor has evolved from a single-portal app into a multi-domain educational operating system. Cross-contamination between High School, University, and Self-Directed content is a high-risk failure mode for user trust.

## Decision
1. All database queries MUST include a `portal_type` filter.
2. All retrieval context MUST be resolved via the `PortalContextResolver`.
3. Ingestion pipelines MUST validate `portal_type` ownership before persisting chunks to the vector store.

## Consequences
- Increased boilerplate on new queries (mitigated by `getPortalFilter` utility).
- Strict data separation ensured at the infrastructure layer.
- University students will never see KICD topics.
