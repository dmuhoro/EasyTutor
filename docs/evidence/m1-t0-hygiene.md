# M1 T0 — generated-artifact hygiene

## Commands and observations

- `git ls-files playwright-report test-results deno.lock` returned only
  `playwright-report/index.html`. Therefore that single file is tracked;
  `test-results/` and `deno.lock` are currently untracked.
- `git ls-files playwright-report test-results | wc -l` returned `1`.
- `git rm --cached playwright-report/index.html` removes that one generated
  report from the index while leaving the file on disk.
- A repository search for `deno.lock` found no generator script in
  `package.json`. The relevant source is
  `supabase/functions/ai-proxy/index.ts:6`, which imports
  `https://deno.land/std@0.224.0/http/server.ts`. Prior verified evidence in
  `docs/evidence/wave1-final.md:109` records `deno.lock` as untracked by a Deno
  tool invocation; `docs/evidence/wave1-2-boundary.md:252` records a
  `deno check supabase/functions/ai-proxy/index.ts` invocation. The lock file is
  therefore a local artifact of Deno checks against the Supabase Edge Function,
  not an application source file, and is ignored rather than committed.

## Change

- `.gitignore`: add `playwright-report/`, `test-results/`, and `deno.lock`.
- Index: untrack `playwright-report/index.html` with `git rm --cached`; the
  file stays on disk. No source, test, or product configuration is changed.

No other files were touched in T0.
