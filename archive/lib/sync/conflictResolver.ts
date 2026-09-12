export interface ProgressState {
  topicId: string;
  mastery: number;
  attempts: number;
  lastUpdated: number;
}

/**
 * Resolves conflicts between local and remote progress states.
 */
export const resolveProgressConflict = (
  local: ProgressState,
  remote: ProgressState
): ProgressState => {
  // Strategy: Prefer higher mastery (student achievement) 
  // or later timestamp if mastery is identical.
  
  if (local.mastery > remote.mastery) return local;
  if (remote.mastery > local.mastery) return remote;
  
  return local.lastUpdated >= remote.lastUpdated ? local : remote;
};

/**
 * Merges a batch of progress updates.
 */
export const mergeProgressBatch = (
  current: ProgressState[],
  updates: ProgressState[]
): ProgressState[] => {
  const merged = new Map<string, ProgressState>();
  
  // Load current
  current.forEach(p => merged.set(p.topicId, p));
  
  // Apply updates with resolution
  updates.forEach(update => {
    const existing = merged.get(update.topicId);
    if (existing) {
      merged.set(update.topicId, resolveProgressConflict(existing, update));
    } else {
      merged.set(update.topicId, update);
    }
  });
  
  return Array.from(merged.values());
};
