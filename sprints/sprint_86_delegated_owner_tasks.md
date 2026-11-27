# Sprint 86 — delegated owner tasks (spec, written before execution)

**Authority:** owner message in this session delegates the `Daniel-only` rows.
Follow-up answers: create both staging projects; use the proposed defaults as
delegated ratifications; derive ops facts where possible and leave the rest
BLOCKED. `D11` is explicitly deferred.

## Non-negotiable constraints carried into this unit

- I execute actions; I do **not** impersonate the owner. Every evidence file at
  a `daniel-DNN.md` or `DEC-0N.md` path carries a `Delegated execution` header
  naming the owner message, the actor (`agent`) and the exact commands used.
  No secret value, token, password or learner data appears in chat, repo,
  evidence, fixture or shell output. Secrets are referenced by name only.
- No invented console facts. A number that cannot be observed through an
  authenticated read is recorded as UNVERIFIED and the row stays BLOCKED.
- One concern per commit. Spec first. No threshold, budget, matcher, assertion
  or suite ratchet is weakened. Full gate green before each commit.
- No push to `main`, no merge, no force-push. Two PR slots are already open.

## Layer order

1. `D03` — Supabase staging project, migrations, verification.
2. `D04` — Vercel staging project and deployment protection.
3. `D10` — production Auth URLs and Google OAuth callback.
4. `D05` + `D07`/`D08`/`D09` — live hosted AI call and plan/limit facts.
5. `DEC-01`…`DEC-05`, `D12`, `D13`, `D14`, `D16` — delegated ratifications.
6. `D06` + WS5 — device and PWA proof. **Owner plugs in the device only when
   prompted**, after the APK is built and the backend it points to is verified.
7. `D15` — alerting destination; derive where possible, else BLOCKED.
8. `D01` — Stitch key rotation: no rotation tool is available to me; BLOCKED
   and handed back with the exact dashboard action.
9. `D11` — deferred by owner.

## Evidence rule

`test -f docs/evidence/daniel-DNN.md` is a file-existence gate. Under delegation
the file is truthful evidence of **what was actually executed and observed**,
not a claim that the owner personally typed the commands. Each file records:
authority, actor, timestamp, exact read-only or write commands, observed
result, and what remains unverified. This keeps the gate honest under
Constitution Article I.
