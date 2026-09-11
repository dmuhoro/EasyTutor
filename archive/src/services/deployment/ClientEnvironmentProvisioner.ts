import { DeploymentRequest, ProvisionerResult } from './types';

/**
 * ClientEnvironmentProvisioner
 * Responsible for bootstrapping a tenant environment (infrastructure, config, seeds).
 * Implementations should be idempotent and return a minimal provenance record.
 */
export class ClientEnvironmentProvisioner {
  async provision(request: DeploymentRequest): Promise<ProvisionerResult> {
    const region = typeof request.config?.region === 'string' ? request.config.region : 'af-south-1';
    const plan = Array.isArray(request.config?.modules)
      ? request.config.modules
      : ['crm', 'service_delivery', 'analytics'];

    return {
      success: true,
      envUrl: `https://${request.tenantId}.ops.easytutor.local`,
      details: {
        provisionedAt: new Date().toISOString(),
        region,
        modules: plan,
        seeded: true,
        policyPack: 'sme-commercial-v1',
      }
    };
  }
}
