import { ProductDeploymentProfile, ProductId } from './productContracts';
import { Database } from '../infrastructure/database';

/**
 * PRODUCT DEPLOYMENT PROFILE MANAGER
 * 
 * Manages the deployment state and configuration of specific products for each tenant.
 */
export class ProductDeploymentProfileManager {
  static async deployProduct(
    tenantId: string, 
    productId: ProductId, 
    config: Record<string, unknown> = {},
    features: string[] = []
  ): Promise<ProductDeploymentProfile> {
    const profile: ProductDeploymentProfile = {
      product_id: productId,
      tenant_id: tenantId,
      enabled_features: features,
      configuration: config,
      deployed_at: new Date().toISOString(),
      status: 'active'
    };

    await Database.governedWrite('product_deployments', profile, {
      action: 'upsert',
      matchFields: { tenant_id: true, product_id: true },
      portalType: 'high_school' // Platform-level write
    });

    return profile;
  }

  static async getTenantProfile(tenantId: string, productId: ProductId): Promise<ProductDeploymentProfile | null> {
    const query = Database.governedQuery({
      table: 'product_deployments',
      columns: '*',
      portalType: 'high_school'
    });

    const { data } = await (query as any).eq('tenant_id', tenantId).eq('product_id', productId).maybeSingle();
    return data;
  }
}
