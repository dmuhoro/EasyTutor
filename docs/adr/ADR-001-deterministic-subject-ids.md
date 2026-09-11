# ADR 001: Deterministic Subject and Topic Identification

## Problem
In a multi-portal system, subjects (e.g., "Mathematics") exist across different levels (High School vs. University). Using purely random UUIDs for subjects and topics makes it difficult to reference them consistently in hardcoded roadmaps, seeds, and cross-portal progress logic.

## Decision
1. **Unique Constraint:** Enforce a composite unique constraint on `subjects(name, level)` and `topics(subject_id, title)`.
2. **Idempotent Seeding:** Use `ON CONFLICT (name, level) DO UPDATE` or `ON CONFLICT (subject_id, title) DO UPDATE` for all seeding operations.
3. **Deterministic ID Resolution:** When a static ID is needed in the client-side code, use a utility that resolves the database ID based on the (name, level) pair, or use a pre-shared mapping of common subject IDs.

## Reasoning
This ensures that the same subject in the same portal always maps to the same identity, preventing "phantom duplicates" and allowing for robust progress tracking and curriculum updates.

## Consequences
- Seeding scripts become slightly more complex with `ON CONFLICT` logic.
- Adding a subject with the same name to the same portal will fail/upsert instead of creating a duplicate.

## Future Implications
Allows for easier global analytics (e.g., "how many users are studying Mathematics across ALL portals") by having a stable identity to group by.
