import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runMathJourney, type JourneyEvidence } from '../src/domain/mathematics/learningJourney';
import type { MathDiagnosticResponse } from '../src/domain/mathematics/diagnosticBank';

export type DiagnosticAnswer = MathDiagnosticResponse;
export type PracticeEvidence = JourneyEvidence;

interface MathJourneyState {
  learnerId: string | null;
  targetSkill: string | null;
  diagnostic: DiagnosticAnswer[];
  evidence: PracticeEvidence[];
  recommendation: string | null;
  masteryConfidence: number;
  reviewDue: boolean;
  recordDiagnostic: (learnerId: string, targetSkill: string, answers: DiagnosticAnswer[]) => void;
  recordPractice: (e: PracticeEvidence) => void;
  reset: () => void;
}

export const useMathJourneyStore = create<MathJourneyState>()(
  persist(
    (set, get) => ({
      learnerId: null,
      targetSkill: null,
      diagnostic: [],
      evidence: [],
      recommendation: null,
      masteryConfidence: 0,
      reviewDue: false,
      recordDiagnostic: (learnerId, targetSkill, answers) => {
        const j = runMathJourney(targetSkill, answers, get().evidence);
        set({ learnerId, targetSkill, diagnostic: answers, recommendation: j.recommendation.action, masteryConfidence: j.masteryConfidence, reviewDue: j.reviewDue });
      },
      recordPractice: (e) => {
        const s = get();
        if (!s.targetSkill) return;
        const evidence = [...s.evidence, e];
        const j = runMathJourney(s.targetSkill, s.diagnostic, evidence);
        set({ evidence, recommendation: j.recommendation.action, masteryConfidence: j.masteryConfidence, reviewDue: j.reviewDue });
      },
      reset: () => set({ learnerId: null, targetSkill: null, diagnostic: [], evidence: [], recommendation: null, masteryConfidence: 0, reviewDue: false }),
    }),
    { name: 'easytutor-math-journey', storage: createJSONStorage(() => AsyncStorage) }
  )
);
