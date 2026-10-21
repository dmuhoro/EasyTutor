# ADR M6: Portal and preset mapping

## Problem
EasyTutor portals (high_school/KICD, university, knowledge_explorer, professional) must map to StashMind roles (student, learner) in core config with tests.

## Decision
high_school → student (KICD content stays EasyTutor); university → student; knowledge_explorer → learner; professional → optional extra track. Mapping in `@stashmind/core` config with unit tests including a no-unmapped-portal guard. See StashMind `docs/adr/ADR-M6-portal-and-preset-mapping.md`.

## Reasoning
Single source of truth for portal mapping; testable; KICD content ownership unchanged.

## Consequences
New portals require core config change + test + both-repo flagged adoption.

## Cross-reference
StashMind `docs/adr/ADR-M6-portal-and-preset-mapping.md`
