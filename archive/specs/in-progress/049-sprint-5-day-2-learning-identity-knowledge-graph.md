# Sprint 5 Day 2: Learning Identity & Knowledge Graph

## Objective
Transform EasyTutor into a universal learning system capable of supporting learners from foundational literacy through university and self-directed mastery. Build the learning identity and knowledge graph substrate.

## Implementation Steps

### 1. Learning Identity Engine
Create `lib/learningIdentityEngine.ts`.
Models:
- `learner_type` (secondary, university, self_directed, professional, researcher)
- `goals` (array of strings)
- `interests` (array of strings)
- `preferred_learning_style` (visual, auditory, kinesthetic, text)
- `target_outcomes` (array of strings)

Functions:
- `createIdentity(userId, partialIdentity)`
- `updateIdentity(userId, partialIdentity)`
- `getIdentity(userId)`
- `persistIdentity(identity)`

### 2. Knowledge Graph Engine
Create `lib/knowledgeGraphEngine.ts`.
Model `KnowledgeNode`:
- `id`
- `title`
- `description`
- `difficulty_level` (number or string)
- `category` (domain/subject/topic/concept)
- `prerequisites` (array of ids)
- `estimated_mastery_time` (minutes)

Functions:
- `generateLearningPath(identity, goals, currentMastery)`
- Graph traversal logic to map prerequisites to target concepts.

### 3. Dashboard Integration
Expose current path, next concept, and prerequisite gaps to the learning dashboard.

### 4. Database Persistence
Create migration for:
- `learning_identities`
- `knowledge_nodes`
- `knowledge_paths`

### 5. Tests
Add:
- `tests/learningIdentityEngine.test.ts`
- `tests/knowledgeGraphEngine.test.ts`
- `tests/learningPathGenerator.test.ts`

### 6. Documentation
Update `ai-context/current_state.md` and `ai-context/architecture.md`.

## Validation
- `npm run typecheck`
- `npm test`
- `node scripts/architecture/validate_boundaries.js`
- `node scripts/qa/qa_runner.js`
