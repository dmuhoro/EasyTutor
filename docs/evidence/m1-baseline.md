# M1 baseline evidence

## Environment and merge baseline

Commands run this session, in order:

1. `free -h` — total memory `7.1Gi`, used `5.5Gi`, free `186Mi`, shared `547Mi`,
   buff/cache `2.3Gi`, available `1.6Gi`; swap total `7.6Gi`, used `2.4Gi`,
   free `5.1Gi`.
2. `git status --short --branch` before fetch — `## main...origin/main`;
   modified `playwright-report/index.html`; untracked `deno.lock` and
   `test-results/`.
3. `git fetch origin` — completed with no output.
4. `git merge-base --is-ancestor 4a122930efa18f22750edb741efa6b02828e99fa origin/main && git rev-parse origin/main && git log -1 --format='%H %s' origin/main` —
   exit 0; `origin/main` = `0a667ede665589ec462b476e4d9b9eb791afb31f`;
   subject `Merge pull request #5 from dmuhoro/feat/math-authenticated-evidence-flow`.
   This verifies PR #5 was merged and that `4a12293` is an ancestor of
   `origin/main`.
5. `git rev-parse HEAD && git log -1 --format='%H %s' HEAD` before branching —
   local `HEAD` = `0a667ede665589ec462b476e4d9b9eb791afb31f`.
6. `git switch -c feat/ai-routing-truth origin/main` — created the requested
   branch; the pre-existing generated artifacts were carried in the working
   tree and not altered.

## Baseline test count

`npm test` (`vitest run -c vitest.config.js`) run on this branch before any M1
source or configuration change:

- Test Files: **81 passed (81)**
- Tests: **457 passed (457)**
- Duration: **68.25s**
- Warnings: Browserslist data is 8 months old; this is not a test failure.

No secrets were read or printed. No push, merge, tag, force-push, deploy,
Vercel CLI, or dashboard action has been performed.
