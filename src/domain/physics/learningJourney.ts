import { PHYSICS_DIAGNOSTIC_BANK, scorePhysicsDiagnostic, type PhysicsDiagnosticResponse } from './diagnosticBank';
import { PHYSICS_PREREQ_EDGES } from './skillGraph';
import {
  runSubjectJourney,
  type JourneyEvidence,
  type JourneyState,
} from '../learning/subjectJourney';

export type { JourneyEvidence, JourneyState } from '../learning/subjectJourney';

/** Physics entry point — same state machine as Mathematics, different fixtures. */
export function runPhysicsJourney(
  target: string,
  diagnosticResponses: PhysicsDiagnosticResponse[],
  masteryEvidence: JourneyEvidence[],
  now: Date = new Date(),
): JourneyState {
  return runSubjectJourney({
    target,
    items: PHYSICS_DIAGNOSTIC_BANK,
    responses: diagnosticResponses,
    score: scorePhysicsDiagnostic,
    edges: PHYSICS_PREREQ_EDGES,
    evidence: masteryEvidence,
    now,
  });
}
