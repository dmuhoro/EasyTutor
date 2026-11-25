# Sprint 68 — Audit reachability classification

## Spec / real boundary

Row `E5-T1` required every current npm advisory to be classified by real
reachability before any upgrade was attempted. The real boundary is the
dependency graph (`npm audit`, `npm ls --omit=dev`) plus direct imports in
shipped source; no app code, gate or budget was changed.

## Work

- Captured the current audit: 41 advisories (0 critical / 19 high / 20 moderate
  / 2 low).
- Classified each package as direct app import, runtime dependency tree with no
  direct import, direct dev dependency, or dev transitive.
- Identified the only non-major shipped-source fix (`zod@4.6.7`), the three
  major-only fixes (`expo-router@58.0.32` chain), and the three advisories npm
  cannot fix in range (`linkify-it`, `markdown-it`,
  `react-native-markdown-display`).
- Wrote `docs/evidence/E5-T1.md` with the full 41-row table and method.

## Decision

`E5-T1` is promoted to `VERIFIED-LOCAL`, not `VERIFIED-IN-CI`: the acceptance
command is a local file check and no CI-only claim is made. No upgrade was
applied in this sprint; `E5-T2` is the next, separate layer.

No test, threshold or budget was loosened. The login ratchet remains
732,972 / 733,000 B.
