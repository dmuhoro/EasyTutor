import { OperationalTask, TaskStatus } from './businessContracts';
import { Database } from '../infrastructure/database';
import { TenantContext } from '../infrastructure/platform/tenantContracts';

/**
 * OPERATIONAL TASK GRAPH
 * 
 * Manages the dependencies and execution state of tasks within a workflow.
 */
export class OperationalTaskGraph {
  static async addTask(context: TenantContext, taskData: Partial<OperationalTask>): Promise<OperationalTask> {
    const task: OperationalTask = {
      id: `task_${Date.now()}`,
      tenant_id: context.tenant_id,
      workflow_id: taskData.workflow_id || '',
      name: taskData.name || 'Untitled Task',
      status: 'pending',
      priority: taskData.priority || 'normal',
      assigned_to: taskData.assigned_to,
      due_at: taskData.due_at,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata: taskData.metadata || {},
    };

    await Database.governedWrite('operational_tasks', task, {
      portalType: context.portal_type,
      userId: context.user_id
    });

    return task;
  }

  static async updateTaskStatus(context: TenantContext, taskId: string, status: TaskStatus): Promise<void> {
    const update: any = { id: taskId, status, updated_at: new Date().toISOString() };
    if (status === 'completed') update.completed_at = new Date().toISOString();

    await Database.governedWrite('operational_tasks', update, {
      action: 'upsert',
      matchFields: { id: true },
      portalType: context.portal_type,
      userId: context.user_id
    });
  }

  static async getWorkflowTasks(context: TenantContext, workflowId: string): Promise<OperationalTask[]> {
    const query = Database.governedQuery({
      table: 'operational_tasks',
      columns: '*',
      portalType: context.portal_type,
      userId: context.user_id
    });

    const { data, error } = await (query as any).eq('workflow_id', workflowId);
    return error ? [] : data;
  }
}
