export class AutomatedBusinessAuditEngine {
  audit(ctx: { tenantId: string; activeChannels: string[]; hasFollowupAutomation: boolean }): {
    tenantId: string;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];

    if (ctx.activeChannels.length < 2) {
      issues.push('Acquisition channel mix is too narrow for resilient pipeline growth');
    }

    if (!ctx.hasFollowupAutomation) {
      issues.push('Missing automated proposal follow-up sequence');
    }

    return {
      tenantId: ctx.tenantId,
      issues,
      score: Math.max(0, 1 - issues.length * 0.25),
    };
  }
}
