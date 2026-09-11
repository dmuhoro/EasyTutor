import {
  DeploymentRequest,
  DeploymentResult,
  ValidationResult,
  RollbackPlan,
  DeploymentCheckpoint,
} from './types';
import { ClientEnvironmentProvisioner } from './ClientEnvironmentProvisioner';
import { LiveDeploymentValidationEngine } from './LiveDeploymentValidationEngine';
import { TenantMigrationAssistant } from './TenantMigrationAssistant';
import { OperationalRollbackManager } from './OperationalRollbackManager';

/**
 * DeploymentExecutionCoordinator
 * Orchestrates end-to-end tenant onboarding and deployment flows.
 */
export class DeploymentExecutionCoordinator {
  private provisioner: ClientEnvironmentProvisioner;
  private validator: LiveDeploymentValidationEngine;
  private migrationAssistant: TenantMigrationAssistant;
  private rollbackManager: OperationalRollbackManager;

  constructor() {
    this.provisioner = new ClientEnvironmentProvisioner();
    this.validator = new LiveDeploymentValidationEngine();
    this.migrationAssistant = new TenantMigrationAssistant();
    this.rollbackManager = new OperationalRollbackManager();
  }

  async validate(request: DeploymentRequest): Promise<ValidationResult> {
    return this.validator.validateLiveDeployment(request);
  }

  async orchestrateDeployment(request: DeploymentRequest): Promise<DeploymentResult> {
    const deploymentId = `deploy_${request.tenantId}_${request.version.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
    const checkpoints: DeploymentCheckpoint[] = [
      { step: 'validate-request', status: 'pending' },
      { step: 'provision-environment', status: 'pending' },
      { step: 'prepare-migration', status: 'pending' },
      { step: 'execute-migration', status: 'pending' },
      { step: 'final-health-gate', status: 'pending' },
    ];

    const v = await this.validate(request);
    checkpoints[0] = {
      step: 'validate-request',
      status: v.ok ? 'completed' : 'failed',
      detail: v.ok ? 'All production gates passed' : (v.errors ?? []).join('; '),
    };

    if (!v.ok) {
      return {
        success: false,
        deploymentId,
        details: {
          validation: v,
          checkpoints,
        },
      };
    }

    const p = await this.provisioner.provision(request);
    checkpoints[1] = {
      step: 'provision-environment',
      status: p.success ? 'completed' : 'failed',
      detail: p.envUrl,
    };

    if (!p.success) {
      const rollback = await this.rollbackManager.createPlan('provision-failed');
      await this.rollback(rollback);
      return {
        success: false,
        deploymentId,
        details: {
          provision: p,
          rollback,
          checkpoints,
        },
      };
    }

    const migrationPlan = await this.migrationAssistant.generatePlan(
      `staging-${request.tenantId}`,
      request.tenantId,
    );
    checkpoints[2] = {
      step: 'prepare-migration',
      status: 'completed',
      detail: `${migrationPlan.steps.length} migration steps staged`,
    };

    const migration = await this.migrationAssistant.executeMigration(migrationPlan);
    checkpoints[3] = {
      step: 'execute-migration',
      status: migration.success ? 'completed' : 'failed',
      detail: migration.success ? 'Tenant data promoted successfully' : 'Migration execution failed',
    };

    const healthGate = await this.validator.validateLiveDeployment(request);
    checkpoints[4] = {
      step: 'final-health-gate',
      status: healthGate.ok ? 'completed' : 'failed',
      detail: healthGate.ok ? 'Runtime validation stable' : (healthGate.errors ?? []).join('; '),
    };

    return {
      success: migration.success && healthGate.ok,
      deploymentId,
      details: {
        provision: p,
        migrationPlan,
        migration,
        validation: healthGate,
        checkpoints,
      },
    };
  }

  async rollback(plan: RollbackPlan): Promise<void> {
    await this.rollbackManager.execute(plan);
  }
}
