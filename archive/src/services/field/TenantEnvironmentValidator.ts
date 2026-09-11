import { FieldDeploymentRequest } from './types';

export class TenantEnvironmentValidator {
  async validate(request: FieldDeploymentRequest): Promise<{ ok: boolean; errors: string[] }> {
    const errors: string[] = [];
    if (!/^[a-z0-9-]+$/i.test(request.tenantId)) errors.push('Invalid tenantId format');
    if (!/^[a-z0-9-]+$/i.test(request.siteId)) errors.push('Invalid siteId format');
    if (!/^v?\d+\.\d+\.\d+$/i.test(request.version)) errors.push('Version must follow semver');
    if (request.modules.length === 0) errors.push('At least one module is required');
    return { ok: errors.length === 0, errors };
  }
}
