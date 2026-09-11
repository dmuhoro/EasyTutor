import { PilotStage } from './contracts';

export class LivePilotCoordinator {
  coordinate(tenants: Array<{ tenantId: string; stage: PilotStage }>): { activePilots: number; total: number } {
    return { activePilots: tenants.filter((t) => t.stage === 'active' || t.stage === 'stabilized').length, total: tenants.length };
  }
}

export class TenantRolloutSequencer {
  sequence(tenants: Array<{ tenantId: string; readiness: number }>): { order: string[] } {
    return { order: [...tenants].sort((a, b) => b.readiness - a.readiness || a.tenantId.localeCompare(b.tenantId)).map((t) => t.tenantId) };
  }
}

export class PilotExecutionTimelineManager {
  build(events: Array<{ id: string; timestamp: string }>): { orderedEvents: string[] } {
    return { orderedEvents: [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)).map((e) => e.id) };
  }
}

export class RealWorldDeploymentTracker {
  track(input: { deployed: number; blocked: number; rolledBack: number }): { completionRate: number } {
    const total = input.deployed + input.blocked + input.rolledBack;
    return { completionRate: total === 0 ? 0 : input.deployed / total };
  }
}

export class OperatorEngagementMonitor {
  monitor(input: { invited: number; activated: number; weeklyActive: number }): { engagementHealth: 'low' | 'medium' | 'high' } {
    if (input.invited === 0) return { engagementHealth: 'low' };
    const activationRate = input.activated / input.invited;
    const weeklyRate = input.weeklyActive / Math.max(1, input.activated);
    const score = activationRate * 0.6 + weeklyRate * 0.4;
    if (score > 0.75) return { engagementHealth: 'high' };
    if (score > 0.45) return { engagementHealth: 'medium' };
    return { engagementHealth: 'low' };
  }
}
