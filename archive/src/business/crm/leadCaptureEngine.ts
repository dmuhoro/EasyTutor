import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { ClientEntityManager } from '../clientEntity';
import { Telemetry } from '../../observability/telemetry';

/**
 * LEAD CAPTURE ENGINE
 * 
 * Automates the ingestion and initial processing of business leads.
 */
export class LeadCaptureEngine {
  static async captureLead(
    context: TenantContext, 
    leadData: { name: string; email: string; source: string; initial_interest: string }
  ): Promise<any> {
    // 1. Create client as lead
    const client = await ClientEntityManager.createClient(context, {
      name: leadData.name,
      email: leadData.email,
      metadata: {
        source: leadData.source,
        initial_interest: leadData.initial_interest,
        capture_timestamp: new Date().toISOString()
      }
    });

    Telemetry.emit({
      event: 'LEAD_CAPTURED',
      source: 'platform',
      operationType: 'crm_operation',
      payload: { client_id: client.id, source: leadData.source }
    });

    return client;
  }
}
