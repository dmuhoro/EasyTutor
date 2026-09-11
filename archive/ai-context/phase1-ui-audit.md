# Phase 1 — UI Integration Audit Report
**Generated:** 2026-05-12  
**Status:** Complete Scan

## Executive Summary

All direct API calls from UI screens have been catalogued. Most Supabase access has been moved to lib/ layer already. Primary refactor targets are the lib/api functions being called directly by screens.

---

## SCREEN-BY-SCREEN AUDIT

### ✅ Tab Navigation: `app/(tabs)/quiz.tsx`

**Current Pattern:**
```typescript
import { generateQuizQuestion } from "../../lib/api";
```

**Direct Calls:**
- Line 77: `generateQuizQuestion(subjectName, topicName)` in `startInitialQuiz()`
- Line 110: `generateQuizQuestion(subjectName, topicName)` in `preFetchNext()`

**State Management Issues:**
- Uses local useState for question data
- Fetches randomly selected subject/topic (not from context)
- No runtime governance or telemetry ownership

**Migration Target:**
- Replace with `useGovernedQuiz()` hook
- Assemble RuntimeContext from Roadmap/Progress stores
- Emit telemetry through orchestrator

**Difficulty:** Medium (randomization logic needs to respect context)

---

### ✅ Tab Navigation: `app/(tabs)/study.tsx`

**Current Pattern:**
```typescript
import { askTutor } from "../../lib/api";
```

**Direct Calls:**
- Line 228: `askTutor(sysPrompt, contextMessages)` in `handleSend()`

**State Management Issues:**
- Chat history in StudyStore (uncontrolled)
- System prompt built manually via `buildSystemPrompt()`
- Voice queries handled via separate `handleVoiceQuery()` function
- Caching happens at lib/cache layer (not orchestrated)

**Migration Target:**
- Replace with `useLearningSession()` or orchestrator.tutor()
- Move system prompt generation into orchestrator context
- Integrate voice tutor into orchestration pipeline

**Difficulty:** High (complex chat state + voice integration)

---

### ❓ Dashboard: `app/(tabs)/index.tsx`

**Current Pattern:**
```typescript
import { getXPTrend, getMasteryDistribution, getStreak } from "../../lib/dashboard";
import { getWeakTopics, getWeakTopicWithExplanation } from "../../lib/adaptive";
```

**Direct Calls:**
- Line 55: `getMasteryDistribution(user.id)`
- Line 18-17: Various dashboard aggregation functions

**State Management Issues:**
- Dashboard computes mastery trends independently
- No connection to learner state governance
- XP/streak calculations happen outside orchestration

**Migration Target:**
- Replace with `useMasteryProgress()` hook
- Dashboard should subscribe to orchestration recommendations
- Display should reflect adaptive engine state

**Difficulty:** Medium (mostly read-only, but needs state connection)

---

### 📚 Roadmap Screens

**File:** `app/(high_school)/[subject]/roadmap.tsx`  
**Current Pattern:**
```typescript
import { generateStudyRoadmap } from "../../../lib/api";
```

**Direct Calls:**
- Generates roadmaps via lib/api directly

**Migration Target:**
- Use `useRoadmapFlow()` hook
- Orchestrator controls roadmap progression logic

**File:** `app/(university)/[course]/roadmap.tsx`  
**Same pattern as high school**

**Difficulty:** Medium

---

### 🎯 Self-Directed Portal: `app/(self_directed)/index.tsx`

**Current Pattern:**
- Document upload + semantic retrieval
- Likely uses retrieval.ts functions directly

**Migration Target:**
- Route through governed retrieval
- Integrate with orchestrator's prefetch system

**Difficulty:** High (semantic indexing + ingestion pipeline)

---

### 🔐 Auth & Settings: `app/(auth)/login.tsx`, `app/(shared)/settings.tsx`

**Status:** ✅ Low priority  
These don't call learning flows directly. Auth can stay as-is. Settings should emit telemetry through orchestrator when preferences change.

---

## LIBRARY FUNCTIONS ANALYSIS

### Direct Calls in `lib/api.ts`

**Functions being called from UI:**
1. `generateQuizQuestion(subject, topic)` → Should route through orchestrator.assembleQuiz()
2. `askTutor(sysPrompt, messages)` → Should route through orchestrator.tutor()
3. `generateStudyRoadmap(topic, depth)` → Should route through orchestrator.progressRoadmap()

**Status:** These should become internal to orchestrator, NOT public UI callables.

---

### `lib/dashboard.ts`

**Functions being called from UI:**
- `getMasteryDistribution(userId)` → Should come from orchestrator.updateMastery()
- `getXPTrend()`, `getStreak()` → Should come from RuntimeContext mastery_state

---

### `lib/adaptive.ts`

**Functions being called from UI:**
- `getWeakTopics()` → Should come from orchestrator recommendations
- `getWeakTopicWithExplanation()` → Should route through orchestrator.tutor()

---

## MIGRATION MAP: OLD → NEW

| OLD PATTERN | NEW PATTERN | FILE | PRIORITY |
|---|---|---|---|
| `generateQuizQuestion(s, t)` direct call | `useGovernedQuiz().assembleQuiz(context)` | quiz.tsx | P1 |
| `askTutor(prompt, msgs)` direct call | orchestrator.tutor(context) | study.tsx | P1 |
| `getMasteryDistribution(uid)` direct call | `useMasteryProgress().updateMastery(context)` | index.tsx | P2 |
| `generateStudyRoadmap()` direct call | `useRoadmapFlow().progressRoadmap(context)` | roadmap.tsx | P2 |
| Raw retrieval access | Governed retrieval via orchestrator | self-directed | P3 |
| Voice tutor direct calls | Integrate into orchestrator.tutor() | study.tsx | P3 |

---

## KNOWN BLOCKERS

1. **Random Topic Selection in Quiz:** Currently picks random subject/topic. Should respect learner's adaptive plan.
2. **Chat History State:** Study tab maintains independent chat history. Should be part of session state.
3. **System Prompt Construction:** Hard-coded via `buildSystemPrompt()`. Should be orchestrator responsibility.
4. **Cache Layer:** Currently lives in lib/cache. Should be integrated into orchestrator's predictive prefetch.
5. **Voice Integration:** Separate from text tutor. Should be unified in orchestrator pipeline.

---

## SUCCESS CRITERIA FOR PHASE 1 COMPLETION

- [ ] All screens import orchestrator hooks, not lib/api functions
- [ ] No direct `supabase.` calls in app/
- [ ] All learning flow calls route through RuntimeContext
- [ ] Governance audit passes (no warning on raw access)
- [ ] Telemetry shows orchestrator ownership (not ambient portal state)
- [ ] TypeScript strict mode: no errors
- [ ] Vitest flow suites: all pass
- [ ] QA suite validation: no regressions
