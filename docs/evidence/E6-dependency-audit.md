# E6 slice — production dependency audit (GT-12)

Branch `fix/e6-dependency-audit` from `origin/main` @ `859b9dc`. No PR opened (two open: #19 R0,
#20 E1). No audit level, threshold, timeout or assertion was weakened; no test skipped.

## Red → green

Before: `npm audit --omit=dev --json` → **34 advisories (1 critical, 18 high, 13 moderate,
2 low)**; `npm audit --omit=dev --audit-level=critical` exit 1.

Actions (smallest safe steps only):
1. `npm audit fix --omit=dev` — semver-compatible lockfile updates only. Reduced to **12**
   advisories (6 high, 6 moderate), **0 critical**. Note: this pruned dev packages from the local
   `node_modules`; `npm ci` restored the full tree from the updated lockfile before any gate ran.
2. `dependencies.zod` 4.3.6 → 4.6.7 (non-major, `fixAvailable.isSemverMajor: false`) — reduced to
   **11** advisories (5 high, 6 moderate), 0 critical.
3. Added a fail-closed CI step `npm audit --omit=dev --audit-level=critical` immediately after
   `npm ci`.

After: `npm audit --omit=dev --audit-level=critical` **exit 0**.

## Gates after the change

| Command | Result |
|---|---|
| `npm ci` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | 92 files / 515 tests, exit 0 |
| `npm run build` | exit 0, `Exported: dist` |
| `npm audit --omit=dev --audit-level=critical` | exit 0 |
| `.github/workflows/ci.yml` YAML | parses |

Logs: `/tmp/work/audit-prod.json`, `audit-after.json`, `audit-after-zod.json`,
`e6-tc3.log`, `e6-lint3.log`, `e6-test3.log`, `e6-build.log`.

## Honest handover

DONE: critical-level production audit is green and enforced in CI; 23 of 34 advisories removed
without breaking a gate. **11 advisories remain** (5 high, 6 moderate): `expo`/`expo-router`/
`minimatch`/`@expo/fingerprint` need a semver-major change, and `@expo/ngrok`/`uuid`,
`linkify-it`/`markdown-it` and `react-native-markdown-display` have no published fix. The gate is
`--audit-level=critical` exactly as the roadmap specifies — it is **not** a claim that zero
advisories remain. No `VERIFIED-IN-CI` claimed: no PR slot. The governance/cost parts of E6 are
not in this slice and remain open. Daniel-only: none for this proof.
