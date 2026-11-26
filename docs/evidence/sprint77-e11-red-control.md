# Sprint 77 — E11 red control (before implementation)

## Command

```bash
npm run test -- tests/mastery.adapter.test.ts tests/mastery.domain-adapter.test.ts
```

Run on branch `spike/e11-bundle-neutral-adapter` before any production code was
changed. The only working-tree additions were the two adversarial test files and
the Sprint 77 spec/truth-pass documents.

## Result — REJECTED as required

```text
 Test Files  2 failed (2)
      Tests  6 failed (6)
```

No test passed. This is the required red control.

## Observed failures

### Adapter wiring (`tests/mastery.adapter.test.ts`)

1. `delegates band classification to the canonical domain selector`
   - `AssertionError: expected 'strong' to be 'weak'`
   - `lib/mastery.ts::getMasteryBand` returned its own hardcoded band even when
     the canonical `evaluateMasteryBand` mock returned `weak` for input `90`.
2. `uses canonical confidence for weak-topic detection on the real write path`
   - `AssertionError: expected "vi.fn()" to be called with arguments: [ 80 ]`
   - `Number of calls: 0`
   - `updateMastery` did not call `evaluateMasteryPercent` on the real write
     path.
3. `does not emit a weak-topic event when canonical confidence says capable`
   - `AssertionError: expected "vi.fn()" to be called with arguments: [ 40 ]`
   - `Number of calls: 0`
   - The same absence of canonical adapter wiring was proven in the opposite
     direction.

### Canonical domain adapter (`tests/mastery.domain-adapter.test.ts`)

1. `derives confidence through evaluateMastery without changing percent boundaries`
   - `TypeError: evaluateMasteryPercent is not a function`
2. `preserves the existing 40/70 band boundaries exactly`
   - `TypeError: evaluateMasteryBand is not a function`
3. `preserves the fail-closed result for non-finite input`
   - `TypeError: evaluateMasteryBand is not a function`

These failures prove the new domain adapter functions do not yet exist and the
persistence adapter is not yet wired to them.

## Integrity statement

- No threshold, budget, weight, assertion, or acceptance command was changed.
- No production file was edited before this red result was captured.
- The tests exercise the real `updateMastery` write path with mocked storage,
  analytics, Supabase, and canonical helper controls; they do not test a
  test-only helper.

Gate for continuing: implement the minimal adapter, then require all six tests
to pass plus the full unchanged gate and login ratchet.
