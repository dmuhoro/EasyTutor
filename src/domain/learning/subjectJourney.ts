// Compatibility entry point for the shared journey state machine. Its runtime
// lives with the canonical learner-state module already loaded by the app, so
// a second subject does not add a separate login-route chunk wrapper.
export {
  runSubjectJourney,
  type JourneyEvidence,
  type JourneyAction,
  type JourneyRecommendation,
  type JourneyState,
  type DiagnosticItemLike,
  type DiagnosticResponseLike,
  type DiagnosticScore,
  type SubjectJourneyInput,
} from './canonicalLearnerState';
