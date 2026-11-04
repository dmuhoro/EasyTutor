# Route Code-Splitting and Startup Deferral — EasyTutor

Slice 5 of the web-performance directive. Before this slice every expo-router
screen was statically reachable from the entry chunk: first paint downloaded
and parsed the marketing-free but still large app surface (AI literacy,
learning dashboard, study/markdown, quizzes, roadmaps, settings, profile).

**Date:** 2026-11-04
**Base:** `7029ca7` (entry gzip **825,345 B**)
**Baseline:** `a15dfff` (entry gzip **957,419 B**)

---

## What changed

### Per-route chunks

29 non-home screens moved from `app/**` to `screens/**` with `git mv`; each
original route file is now a thin `React.lazy` + `Suspense` wrapper. Directory
depth is preserved one-for-one, so every existing relative import inside the
moved screens still resolves to the same module.

```tsx
// app/(tabs)/study.tsx
import { lazy, Suspense } from 'react';
import { RouteFallback } from '../../components/RouteFallback';

const Screen = lazy(() => import('../../screens/tabs/study'));

export default function TabsStudyRoute() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Screen />
    </Suspense>
  );
}
```

Kept eager (first paint): `app/index.tsx` (CommandCenter home),
`app/(auth)/login.tsx`, `app/onboarding.tsx`, and all `_layout.tsx` files.
Heavy dependencies now travel with their route: `study` alone emits a 156 KB
chunk (markdown renderer + entities), `learning-dashboard` 23 KB, AI literacy
26 KB.

### Startup work deferred

- `data/knowledgeStore` initialization and the startup sync were already
  deferred through a `setTimeout` + dynamic `import()`; they remain off the
  critical path.
- Analytics (`flushAnalyticsQueue`, `track`) is now imported inside the
  `AppState` handler instead of at module scope.
- The one-time Ollama embedding-model probe is now a dynamic `import()` inside
  its effect, so `lib/ollamaModels` no longer ships in the entry chunk for
  users who never enable local AI.

## Impact (entry chunk)

| Metric | Baseline | Before slice | After slice | vs baseline |
|---|---:|---:|---:|---:|
| Entry JS raw | 3,949,700 B | 3,525,044 B | **1,636,116 B** | **−58.6%** |
| Entry JS gzip −9 | 957,419 B | 825,345 B | **425,628 B** | **−55.5%** |
| Entry source-map modules | 1,744 | 1,694 | **1,014** | −730 |
| Route chunks | 0 | 0 | **35** | — |

The −40% gzip target is met at this slice. Slice 6 keeps the entry work but
makes the *perceived* first paint faster (no blank splash while fonts/profile
resolve).

## Risk and verification

- Route modules keep their default export; no route exports anything else
  (verified by grep before the move).
- No test or script imported an `app/**` screen (verified by grep).
- Every moved file keeps its import depth; `tsc --noEmit` is clean.
- `npx expo export --platform web --source-maps` emits 35 chunks and the entry.

Evidence: 50 test files / 239 tests pass, lint 0 errors, boundary audit and
0-cycle check pass.
