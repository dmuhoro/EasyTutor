import { DeploymentState } from './types';

export class RealWorldDeploymentMonitor {
  capture(deploymentId: string, state: DeploymentState, uptimeScore: number): {
    deploymentId: string;
    state: DeploymentState;
    uptimeScore: number;
    observedAt: string;
  } {
    return { deploymentId, state, uptimeScore, observedAt: new Date().toISOString() };
  }
}
