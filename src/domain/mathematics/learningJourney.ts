import { MATH_PREREQ_EDGES } from './skillGraph';
import { MATH_DIAGNOSTIC_BANK, scoreMathDiagnostic, type MathDiagnosticResponse } from './diagnosticBank';
import {
  runSubjectJourney,
  type JourneyEvidence,
  type JourneyState,
} from '../learning/canonicalLearnerState';

export type { JourneyEvidence, JourneyAction, JourneyRecommendation, JourneyState } from '../learning/canonicalLearnerState';

/** Mathematics entry point for the shared, subject-independent journey state machine. */
export function runMathJourney(
  target: string,
  diagnosticResponses: MathDiagnosticResponse[],
  masteryEvidence: JourneyEvidence[],
  now: Date = new Date(),
): JourneyState {
  return runSubjectJourney({
    target,
    items: MATH_DIAGNOSTIC_BANK,
    responses: diagnosticResponses,
    score: scoreMathDiagnostic,
    edges: MATH_PREREQ_EDGES,
    evidence: masteryEvidence,
    now,
  });
}
