# M1 T5 — citation integrity

`lib/citations.ts` now extracts explicit bracketed markers with
`/\[[^\]]+\]/g` and compares them as exact normalized tokens against the
references supplied by the retrieved-source list. A bare substring is not a
citation; a near-miss marker such as `[Bird Ch15 p.1710]` does not credit
`[Bird Ch15 p.171]`; an unretrieved source cannot be invented by the answer.

`tests/screens/study-citations.test.ts` gained two tests (4 total in the file):
one rejects an unbracketed substring, one rejects both a near-miss marker and
an unretrieved source. The original two assertions were left intact.

## Hook-caught defect

The first T2 commit attempt ran the repository lint hook against the whole
working tree and failed with two `no-useless-escape` errors in this then-unstaged
T5 file. The marker regexes were simplified from `/\[[^\[\]]+\]/g` to
`/\[[^\]]+\]/g` (and the anchored equivalent); exact-marker comparison against
the retrieved-source list is unchanged. The hook was not bypassed.

## Commands run this session

- `npm run typecheck` → 0 errors.
- `npx vitest run tests/screens/study-citations.test.ts` → 1 file / 4 tests passed.
