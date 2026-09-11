import { Database } from '../../infrastructure/database';

export class ClientHealthScoringEngine {
  async score(tenantId: string) {
    const deployments = await Database.governedQuery({
      table: 'product_deployments',
      columns: 'id, tenant_id, status',
      portalType: 'high_school',
      userId: 'system',
    }).select();

    const interactions = await Database.governedQuery({
      table: 'workflow_memory',
      columns: 'tenant_id, kind, milestone',
      portalType: 'high_school',
      userId: 'system',
    }).select();

    const deploymentRows = Array.isArray(deployments.data)
      ? deployments.data.filter((row) => row.tenant_id === tenantId)
      : [];
    const interactionRows = Array.isArray(interactions.data)
      ? interactions.data.filter((row) => row.tenant_id === tenantId)
      : [];

    const deploymentCount = deploymentRows.length;
    const activeDeploymentCount = deploymentRows.filter((row) => row.status === 'active').length;
    const interactionCount = interactionRows.length;
    const milestoneCount = interactionRows.filter((row) => Boolean(row.milestone)).length;
    const score = Math.min(
      1,
      0.35 + activeDeploymentCount * 0.2 + deploymentCount * 0.1 + interactionCount * 0.08 + milestoneCount * 0.05,
    );

    return {
      score: Number(score.toFixed(2)),
      details: {
        tenantId,
        deploymentCount,
        activeDeploymentCount,
        interactionCount,
        milestoneCount,
      },
    };
  }
}
