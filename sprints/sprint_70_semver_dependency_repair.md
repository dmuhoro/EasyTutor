# Sprint 70 — Semver-compatible dependency repair

## Spec / real boundary

Row `E5-T2` required targeted upgrades of critical/reachable highs without a
breaking SDK jump. The real boundary was `package.json` / `package-lock.json`
plus the unchanged login-route ratchet and `npm audit --omit=dev`.

## Change

- Upgraded direct `zod` from 4.3.6 to 4.6.7 (non-major, shipped-source high).
- Applied `npm audit fix` **without `--force`**, accepting only semver-compatible
  patch/minor updates.
- Did not apply `expo-router@58` or `expo@52` major moves; no threshold, retry,
  timeout or budget was loosened.

## Outcome

Advisories fell from 41 (0 critical / 19 high / 20 moderate / 2 low) to 9
(0 critical / 5 high / 4 moderate / 0 low). The remaining nine are the already
classified major-only or no-fix chains. Login transfer is **666,553 / 733,000 B
PASS**. E5-T2 is `VERIFIED-LOCAL`.

Evidence: `docs/evidence/E5-T2.md`.
