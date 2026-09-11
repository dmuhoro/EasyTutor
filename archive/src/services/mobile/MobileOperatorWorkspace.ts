export class MobileOperatorWorkspace {
  build(tenantId: string, operatorId: string): { workspaceId: string; widgets: string[] } {
    return {
      workspaceId: `workspace_${tenantId}_${operatorId}`,
      widgets: ['health', 'tickets', 'offline-sync', 'tasks'],
    };
  }
}
