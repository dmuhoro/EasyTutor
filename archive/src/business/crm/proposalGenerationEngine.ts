import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { WorkflowMemoryEngine } from '../workflowMemoryEngine';

/**
 * PROPOSAL GENERATION ENGINE
 * 
 * Generates tailored business proposals based on client context and operational memory.
 */
export class ProposalGenerationEngine {
  static async generateProposal(
    context: TenantContext, 
    workflowId: string, 
    requirements: string
  ): Promise<string> {
    const memory = await WorkflowMemoryEngine.retrieveMemory(context, workflowId);
    
    const prompt = `
      Generate a professional business proposal based on:
      Context: ${JSON.stringify(memory)}
      Client Requirements: ${requirements}
      
      Structure: Problem Statement, Proposed Solution, Deliverables, Timeline, Pricing.
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'crm',
      topic_id: 'proposals',
      learning_goal: 'Generate proposal',
      prompt_params: { prompt }
    } as any);

    const proposal = (result.result as any)?.text || (result.result as string) || 'Failed to generate proposal';
    
    await WorkflowMemoryEngine.storeFact(context, workflowId, 'generated_proposal', proposal);
    
    return proposal;
  }
}
