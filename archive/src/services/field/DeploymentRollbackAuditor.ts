export class DeploymentRollbackAuditor {
  createRollbackRecord(deploymentId: string, reason: string, steps: string[]): {
    deploymentId: string;
    reason: string;
    steps: string[];
    timestamp: string;
    integrityHash: string;
  } {
    const payload = `${deploymentId}:${reason}:${steps.join('|')}`;
    const integrityHash = Array.from(payload).reduce((acc, c) => acc + c.charCodeAt(0), 0).toString(16);
    return { deploymentId, reason, steps, timestamp: new Date().toISOString(), integrityHash };
  }
}
