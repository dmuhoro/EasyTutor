import { ProductId } from './productContracts';
import { ProductDeploymentProfileManager } from './ProductDeploymentProfile';

/**
 * PRODUCT FEATURE FLAG ENGINE
 * 
 * Manages the granular availability of features and modules within a vertical product.
 */
export class ProductFeatureFlagEngine {
  static async isFeatureEnabled(
    tenantId: string, 
    productId: ProductId, 
    featureId: string
  ): Promise<boolean> {
    const profile = await ProductDeploymentProfileManager.getTenantProfile(tenantId, productId);
    if (!profile) return false;

    // Direct match or wildcard '*' for all features
    return profile.enabled_features.includes(featureId) || profile.enabled_features.includes('*');
  }

  static async enableFeature(tenantId: string, productId: ProductId, featureId: string): Promise<void> {
    const profile = await ProductDeploymentProfileManager.getTenantProfile(tenantId, productId);
    if (!profile) return;

    if (!profile.enabled_features.includes(featureId)) {
      profile.enabled_features.push(featureId);
      await ProductDeploymentProfileManager.deployProduct(
        tenantId, 
        productId, 
        profile.configuration, 
        profile.enabled_features
      );
    }
  }
}
