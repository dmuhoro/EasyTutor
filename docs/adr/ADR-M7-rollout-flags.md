# ADR M7: Rollout — flags default OFF, staged rollout, rollback by flag

## Problem
New merge capabilities must not change behaviour for existing users and must be reversible without a code redeploy.

## Decision
Every new capability behind a feature flag defaulting OFF (`stashmind_enabled` plus per-capability flags). Staged rollout: internal → small percentage → everyone. Rollback by flag (flip OFF). All flags OFF = no behaviour change; EasyTutor's existing end-to-end tests pass unchanged; online and offline modes keep working. See StashMind `docs/adr/ADR-M7-rollout-flags.md`.

## Reasoning
Safe reversible rollout; operational kill switch per capability; no regression risk.

## Consequences
Flag debt to retire after full rollout; duplicate code paths during transition.

## Cross-reference
StashMind `docs/adr/ADR-M7-rollout-flags.md`
