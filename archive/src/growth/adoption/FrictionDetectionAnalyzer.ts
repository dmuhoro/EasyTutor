import { CustomerActivationJourneyEngine } from './CustomerActivationJourneyEngine';
import { Telemetry } from '../../observability/telemetry';

/**
 * FRICTION DETECTION ANALYZER
 * 
 * Identifies blockers in the customer onboarding flow, allowing the platform 
 * to preemptively resolve issues and prevent early-stage churn.
 */
export class FrictionDetectionAnalyzer {
  static async detectFrictionPoints(tenantId: string): Promise<string[]> {
    const journey = await CustomerActivationJourneyEngine.evaluateJourney(tenantId);
    const frictionPoints: string[] = [];

    if (journey.activation_score < 40) {
      frictionPoints.push('low_engagement');
      console.warn(`[FRICTION] Low engagement detected for ${tenantId}`);
    }

    if (!journey.milestones_completed.includes('billing_setup')) {
      frictionPoints.push('billing_incomplete');
    }

    Telemetry.emit({
      event: 'FRICTION_DETECTED',
      source: 'platform',
      operationType: 'growth',
      payload: { tenant_id: tenantId, points: frictionPoints }
    });

    return frictionPoints;
  }
}
