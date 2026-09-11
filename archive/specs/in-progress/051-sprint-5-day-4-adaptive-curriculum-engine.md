# Sprint 5 Day 4 – Adaptive Curriculum Engine

**Objective**: Determine the optimal next learning path for a learner, explain why it is recommended, and provide alternative routes (recovery / acceleration).

## Model
```ts
export interface AdaptiveLearningPath {
  learnerId: string;
  current_position: KnowledgeNode[]; // ordered list of completed nodes
  destination: KnowledgeNode; // target mastery node
  recommended_path: KnowledgeNode[]; // optimal forward path
  recovery_path?: KnowledgeNode[]; // fallback if obstacles occur
  acceleration_path?: KnowledgeNode[]; // fast‑track alternatives
  skippable_nodes?: KnowledgeNode[]; // nodes that can be safely omitted
  prerequisite_gaps: KnowledgeNode[]; // missing prerequisites
  estimated_completion: {
    days: number;
    confidence: number; // 0‑1
  };
  explanation: string; // human‑readable narrative
}

export interface KnowledgeNode {
  id: string;
  title: string;
  level: number; // difficulty/grade
}
```

## Public API
| Function | Description |
|----------|-------------|
| `determineCurrentKnowledgePosition(learnerId: string): Promise<KnowledgeNode[]>` | Reads learner progress from Supabase / AsyncStorage and returns ordered list of completed nodes. |
| `determineTargetDestination(learnerId: string): Promise<KnowledgeNode>` | Uses the Learning Identity and Knowledge Graph to select the next mastery target. |
| `computeOptimalLearningPath(current: KnowledgeNode[], target: KnowledgeNode): Promise<KnowledgeNode[]>` | Runs a shortest‑path / prerequisite‑aware algorithm to produce the forward path. |
| `detectMissingPrerequisites(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]>` | Checks Supabase for any prerequisite nodes the learner has not yet completed. |
| `buildRecoveryPath(path: KnowledgeNode[], gaps: KnowledgeNode[]): Promise<KnowledgeNode[]>` | Generates an alternative path that inserts prerequisite remediation steps. |
| `buildAccelerationPath(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]>` | Suggests optional fast‑track nodes based on learner strength signals. |
| `estimateTimeToGoal(path: KnowledgeNode[], learnerId: string): Promise<{days: number; confidence: number}>` | Predicts days to completion using historical performance and retention data. |
| `recommendSkippableNodes(path: KnowledgeNode[], learnerId: string): Promise<KnowledgeNode[]>` | Identifies nodes that can be safely skipped because the learner already demonstrates mastery. |
| `explainReasoning(adaptivePath: AdaptiveLearningPath): string` | Generates a narrative explanation combining all the above signals. |

## Persistence
- **AsyncStorage key**: `ADAPTIVE_PATH_CACHE_<learnerId>` (JSON serialized `AdaptiveLearningPath`).
- **Supabase table**: `adaptive_learning_paths` (see migration).

## Integration Points
- Imported by `lib/recommendations.ts` to augment the `StudentLearningDashboard` payload.
- UI components under `app/(shared)/learning-dashboard.tsx` will display sections: *Where You Are*, *Where You’re Going*, *Fastest Route*, *Missing Foundations*, *Estimated Completion*, *Why This Recommendation*.

## Acceptance Criteria
- All functions return correct types and handle missing data gracefully.
- Engine runs within 200 ms for a typical learner (≤ 50 nodes).
- Unit tests cover each public function (minimum 80 % line coverage).
- Data is persisted locally and synced to Supabase.

---
*Spec authored by Principal Engineer on 2026‑06‑14.*
