import { ProductId } from './productContracts';
import { ProductDeploymentProfileManager } from './ProductDeploymentProfile';
import { VerticalProductRegistry } from './VerticalProductRegistry';

/**
 * TENANT VERTICAL INITIALIZER
 * 
 * Automates the initial setup and configuration of products when a tenant first joins a vertical.
 */
export class TenantVerticalInitializer {
  static async initializeTenantProduct(tenantId: string, productId: ProductId): Promise<void> {
    const product = VerticalProductRegistry.getProduct(productId);
    if (!product) throw new Error(`Unknown product: ${productId}`);

    console.log(`[BOOTSTRAP] Initializing ${product.name} for tenant ${tenantId}...`);

    // 1. Deploy the product profile
    await ProductDeploymentProfileManager.deployProduct(tenantId, productId, {
      onboarding_status: 'pending',
      initial_version: product.version
    });

    // 2. Trigger product-specific bootstrap logic
    // e.g. Provisioning initial curriculum for EasyTutor or default templates for FreelancerOS
  }
}
