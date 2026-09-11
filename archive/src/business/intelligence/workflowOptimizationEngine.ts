import { TenantContext } from '../../infrastructure/platform/tenantContracts';
import { HybridRuntime } from '../../runtime/hybridRuntime';
import { OperationalTaskGraph } from '../operationalTaskGraph';

/**
 * WORKFLOW OPTIMIZATION ENGINE
 * 
 * Analyzes historical workflow execution to recommend structural optimizations.
 */
export class WorkflowOptimizationEngine {
  static async analyzeWorkflow(context: TenantContext, workflowId: string): Promise<any> {
    const tasks = await OperationalTaskGraph.getWorkflowTasks(context, workflowId);
    
    const taskData = tasks.map(t => ({
      name: t.name,
      status: t.status,
      duration: t.completed_at ? 
        (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 1000 / 60 : 
        'pending'
    }));

    const prompt = `
      Analyze the following business workflow tasks for inefficiencies:
      ${JSON.stringify(taskData)}
      
      Identify tasks that took too long and suggest structural changes to speed up the workflow.
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'intelligence',
      topic_id: 'optimization',
      learning_goal: 'Optimize workflow',
      prompt_params: { prompt }
    } as any);

    return (result.result as any)?.text || (result.result as string) || '';
  }
}
