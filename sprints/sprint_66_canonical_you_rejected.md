# Sprint 66 — Canonical learner state on You (rejected)

## Spec / real boundary

Capability work: surface the existing canonical projection on the `You` hub,
using only existing translation keys and design tokens. Real boundary was
`screens/tabs/you.tsx`; no endpoint or second domain implementation was added.

## Change attempted

- Red real-screen test rendered the real You tab with a seeded canonical
  projection and asserted mastery percentage plus pending sync state.
- Variant A consumed `useMathJourneyStore` with a selector hook.
- Variant B loaded the store with `import()` inside `useEffect` and subscribed,
  to keep it out of the login bundle.

## Result

Both variants passed the new test (2/2) but failed the unchanged 733,000 B login
ratchet by 6,889 B and 6,887 B respectively. The shared chunk grew by 6,864 B
in both cases. Metro hoists the store into common regardless of lazy import.

Decision: **revert and document**. Budget not raised; no test weakened; no row
promoted. Evidence: `docs/evidence/sprint66-canonical-you-headroom-rejected.md`.

## Follow-up

Any future canonical-state surface on Home or You needs a real reduction in the
shared bundle first. This is the same structural blocker as E11, now measured a
third time. Credential-dependent live verification remains in the final phase
as instructed.
