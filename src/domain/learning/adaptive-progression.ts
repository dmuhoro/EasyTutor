// Adaptive progression policy (transparent, deterministic)

export interface LearnerSignal {
  recall: number; application: number; transfer: number; independence: number; // 0..1
  hintDependence: number; // 0..1
  foundationalGap: boolean;
}

export interface Recommendation { action: string; difficultyDelta: number; reason: string; }

export function recommendNext(s: LearnerSignal): Recommendation {
  if (s.foundationalGap) return { action: 'remediate-prerequisite', difficultyDelta: -1, reason: 'foundational weakness detected' };
  if (s.hintDependence > 0.6) return { action: 'guided-practice-reduce-hints', difficultyDelta: 0, reason: 'assisted performance; build independence' };
  if (s.transfer >= 0.7 && s.independence >= 0.7) return { action: 'harder-transfer-challenge', difficultyDelta: +1, reason: 'strong independent transfer; increase challenge' };
  if (s.recall >= 0.7 && s.application < 0.5) return { action: 'application-practice', difficultyDelta: 0, reason: 'recall strong, application weak' };
  return { action: 'balanced-practice', difficultyDelta: 0, reason: 'mixed profile; maintain level' };
}
