# Spec 002: resolveTopicId Refactor

## Goal
Optimize `resolveTopicId` to minimize database hits by implementing a local cache for resolved topic IDs and improving the resolution speed.

## Design
- **Caching:** Implement a simple `Map`-based cache inside the utility to store `title+subjectId -> uuid` mappings.
- **Fail-Fast:** Immediately return null if either `topicIdOrName` or `subjectId` is missing, without triggering logs in non-essential paths.

## Implementation Boundaries
- **File:** `lib/resolveTopicId.ts`.
- **Constraint:** Cache should be cleared on portal switch or after a reasonable TTL (e.g., 1 hour).

## Dependencies
- `lib/supabaseOps.ts`.

## Verification Checklist
- [ ] Topic resolution hits the DB only once for the same title/subject pair in a session.
- [ ] UUID passthrough continues to work without DB calls.
- [ ] Unit tests in `tests/lib/resolveTopicId.test.ts` pass.
