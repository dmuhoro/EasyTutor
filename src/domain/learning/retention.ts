// Retention & spaced review foundation (replaceable policy)

export interface ReviewItem { skillId: string; lastReviewedAt: string | null; confidence: number; attempts: number; }

export interface ReviewDecision { skillId: string; priority: number; reason: string; due: boolean; }

export function reviewPriority(item: ReviewItem, now: Date): ReviewDecision {
  const last = item.lastReviewedAt ? new Date(item.lastReviewedAt).getTime() : 0;
  const ageDays = last ? (now.getTime() - last) / 86400000 : 365;
  const base = Math.min(1, ageDays / 30); // older -> higher
  const conf = 1 - item.confidence;
  const priority = Math.min(1, (base + conf) / 2);
  return { skillId: item.skillId, priority, reason: ageDays > 30 ? 'long gap since review' : 'confidence decay risk', due: priority >= 0.5 };
}
