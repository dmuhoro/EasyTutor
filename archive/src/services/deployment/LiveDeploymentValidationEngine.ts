import { DeploymentRequest, ValidationResult } from './types';

/**
 * LiveDeploymentValidationEngine
 * Runs runtime validation checks and health gates for live deployments.
 */
export class LiveDeploymentValidationEngine {
  async validateLiveDeployment(request: DeploymentRequest): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!request.tenantId || !/^[a-z0-9-]+$/i.test(request.tenantId)) {
      errors.push('tenantId must be a non-empty alphanumeric slug');
    }

    if (!/^v\d+\.\d+\.\d+$/i.test(request.version)) {
      errors.push('version must use v<major>.<minor>.<patch> format');
    }

    if (request.config?.skipHealthGates === true) {
      errors.push('skipHealthGates is not allowed for production-grade deployments');
    }

    if (!request.config?.region) {
      warnings.push('region not specified; default deployment region will be used');
    }

    if (!request.config?.modules) {
      warnings.push('modules not specified; default SME commercial modules will be provisioned');
    }

    return {
      ok: errors.length === 0,
      warnings,
      errors,
    };
  }
}
