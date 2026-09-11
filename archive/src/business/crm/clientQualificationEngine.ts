import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { ClientEntityManager } from '../clientEntity';

/**
 * CLIENT QUALIFICATION ENGINE
 * 
 * Uses cognitive execution to qualify and score leads based on business criteria.
 */
export class ClientQualificationEngine {
  static async qualifyLead(context: TenantContext, clientId: string): Promise<any> {
    const client = await ClientEntityManager.getClient(context, clientId);
    if (!client) throw new Error(`Client ${clientId} not found`);

    // AI qualification prompt
    const prompt = `
      Qualify the following lead for a professional services firm:
      Name: ${client.name}
      Interest: ${client.metadata.initial_interest}
      Source: ${client.metadata.source}
      
      Score from 0-100 and provide a status (HOT, WARM, COLD).
      Return as JSON.
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'crm',
      topic_id: 'qualification',
      learning_goal: 'Qualify lead',
      prompt_params: { prompt }
    } as any);

    const qualification = JSON.parse((result.result as string) || '{}');
    
    // Update client status based on qualification
    if (qualification.status === 'HOT' || qualification.status === 'WARM') {
      await ClientEntityManager.updateStatus(context, clientId, 'qualified');
    }

    return qualification;
  }
}
