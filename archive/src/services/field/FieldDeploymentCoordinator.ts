import { FieldDeploymentRequest, FieldDeploymentResult } from './types';
import { SiteProvisioningEngine } from './SiteProvisioningEngine';
import { TenantEnvironmentValidator } from './TenantEnvironmentValidator';
import { DeploymentRollbackAuditor } from './DeploymentRollbackAuditor';
import { RealWorldDeploymentMonitor } from './RealWorldDeploymentMonitor';

export class FieldDeploymentCoordinator {
  private readonly provisioner = new SiteProvisioningEngine();
  private readonly validator = new TenantEnvironmentValidator();
  private readonly rollbackAuditor = new DeploymentRollbackAuditor();
  private readonly monitor = new RealWorldDeploymentMonitor();

  async deploy(request: FieldDeploymentRequest): Promise<FieldDeploymentResult> {
    const deploymentId = `field_${request.tenantId}_${request.siteId}_${request.version.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    const validation = await this.validator.validate(request);
    if (!validation.ok) {
      return { success: false, deploymentId, state: 'failed', telemetry: { validation } };
    }

    const provision = await this.provisioner.provisionSite(request);
    if (!provision.success) {
      const rollback = this.rollbackAuditor.createRollbackRecord(deploymentId, 'provisioning-failure', ['release-locks', 'revert-dns']);
      return { success: false, deploymentId, state: 'rolled_back', telemetry: { provision, rollback } };
    }

    const monitor = this.monitor.capture(deploymentId, 'running', 0.98);
    return { success: true, deploymentId, state: 'healthy', telemetry: { provision, monitor } };
  }
}
