import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { HybridRuntime } from '../../runtime/hybridRuntime';

/**
 * REPAIR KNOWLEDGE GRAPH
 * 
 * Provides cognitive assistance for complex vehicle repairs based on technical patterns and symptoms.
 */
export class RepairKnowledgeGraph {
  static async suggestRepair(
    context: TenantContext, 
    symptoms: string[], 
    vehicleModel: string
  ): Promise<string> {
    const prompt = `
      As an expert mechanic, diagnose the following symptoms for a ${vehicleModel}:
      Symptoms: ${symptoms.join(', ')}
      
      Suggest the most likely cause and the standard repair procedure.
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'garage',
      topic_id: 'diagnostics',
      learning_goal: 'Diagnose vehicle issue',
      prompt_params: { prompt }
    } as any);

    return (result.result as any)?.text || (result.result as string) || '';
  }
}
