export class WorkflowAdaptationEngine {
  adapt(input: { frictionScore: number; dominantAction: string }): { mode: 'streamlined' | 'guided' | 'standard'; recommendations: string[] } {
    if (input.frictionScore > 0.7) {
      return {
        mode: 'guided',
        recommendations: ['increase onboarding hints', 'surface one-tap recovery actions'],
      };
    }
    if (input.dominantAction === 'ticketing') {
      return { mode: 'streamlined', recommendations: ['pin support queues', 'prefetch ticket context'] };
    }
    return { mode: 'standard', recommendations: ['keep baseline workflow'] };
  }
}
