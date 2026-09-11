import { ProductId } from './productContracts';
import { ProductDeploymentProfileManager } from './ProductDeploymentProfile';

/**
 * VERTICAL CONFIGURATION RESOLVER
 * 
 * Resolves product configurations by merging global defaults with tenant-specific overrides.
 */
export class VerticalConfigurationResolver {
  static async resolveConfig<T>(
    tenantId: string, 
    productId: ProductId, 
    configPath: string, 
    defaultValue: T
  ): Promise<T> {
    const profile = await ProductDeploymentProfileManager.getTenantProfile(tenantId, productId);
    if (!profile) return defaultValue;

    // Simplified deep path resolution
    const value = profile.configuration[configPath];
    return (value as T) ?? defaultValue;
  }
}
