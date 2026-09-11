import { Database } from '../../infrastructure/database';
import { Telemetry } from '../../observability/telemetry';

/**
 * PROPOSAL FOLLOW-UP ENGINE
 * 
 * Manages the follow-up lifecycle for institutional proposals.
 */
export class ProposalFollowupEngine {
  static async scheduleFollowup(opportunityId: string, days: number): Promise<void> {
    const followupDate = new Date(Date.now() + days * 86400000).toISOString();
    
    await Database.governedWrite('sales_opportunities', {
      id: opportunityId,
      metadata: { next_followup_at: followupDate }
    }, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: 'high_school'
    });

    Telemetry.emit({
      event: 'FOLLOWUP_SCHEDULED',
      source: 'platform',
      operationType: 'sales_ops',
      payload: { opportunity_id: opportunityId, date: followupDate }
    });
  }
}
