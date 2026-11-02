import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { runMathJourney } from '../src/domain/mathematics/learningJourney';

export interface DiagnosticAnswer { skillId: string; correct: boolean; independent: boolean; }
export interface PracticeEvidence { dimension: 'recall'|'understanding'|'application'|'analysis'|'reasoning'|'evaluation'|'creation'|'transfer'|'retention'; weight: number; independent: boolean; hints: number; }

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
        set({ learnerId, targetSkill, diagnostic: answers, recommendation: j.recommended, masteryConfidence: j.masteryConfidence, reviewDue: j.reviewDue });
      },
      recordPractice: (e) => {
        const s = get();
        if (!s.targetSkill) return;
        const evidence = [...s.evidence, e];
        const j = runMathJourney(s.targetSkill, s.diagnostic, evidence);
        set({ evidence, recommendation: j.recommended, masteryConfidence: j.masteryConfidence, reviewDue: j.reviewDue });
      },
      reset: () => set({ learnerId: null, targetSkill: null, diagnostic: [], evidence: [], recommendation: null, masteryConfidence: 0, reviewDue: false }),
    }),
    { name: 'easytutor-math-journey', storage: createJSONStorage(() => AsyncStorage) }
  )
);
