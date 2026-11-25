# Sprint 74 — private import wiring proof

## Spec / real boundary

`C05` pointed acceptance at the chunker unit test, which cannot observe the
import's governed write. The real path is `importPrivateNotes` in
`lib/library.ts`.

## Change

- Extended `tests/flows/library.service.test.ts` with two assertions on the
  real import call: a failed `storeChunks` must reject, and a partial result
  must be returned unchanged.
- Repointed C05 acceptance to this real service test and promoted the row to
  `VERIFIED-LOCAL`. No production code changed.

## Outcome

Green `3 passed`; masking the partial result gave `1 failed / 2 passed`;
swallowing the write error gave `1 failed / 2 passed`. The library was restored
clean each time. Evidence: `docs/evidence/C05.md`.
