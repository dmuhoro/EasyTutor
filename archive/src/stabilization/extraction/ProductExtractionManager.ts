import { ExtractionProfile } from '../stabilizationContracts';
import { VerticalProductRegistry } from '../../productization/VerticalProductRegistry';
import { ServiceContractRegistry } from '../ServiceContractRegistry';

/**
 * PRODUCT EXTRACTION MANAGER
 * 
 * Analyzes vertical products for extraction readiness, ensuring they can be 
 * deployed as independent services while fulfilling their shared infrastructure contracts.
 */
export class ProductExtractionManager {
  static async analyzeReadiness(productId: string): Promise<ExtractionProfile> {
    const product = VerticalProductRegistry.getProduct(productId as any);
    if (!product) throw new Error(`Unknown product: ${productId}`);

    console.log(`[EXTRACTION ANALYZER] Analyzing ${product.name}...`);

    const requiredContracts = this.resolveRequiredContracts(product.capabilities);
    const score = this.calculateReadinessScore(requiredContracts);

    return {
      product_id: productId,
      required_contracts: requiredContracts,
      shared_capabilities: product.capabilities,
      readiness_score: score
    };
  }

  private static resolveRequiredContracts(capabilities: string[]): string[] {
    // In a real system, this would map capabilities to specific contract IDs
    return capabilities.map(cap => `contract:${cap}`);
  }

  private static calculateReadinessScore(contracts: string[]): number {
    const verified = contracts.filter(c => ServiceContractRegistry.getContract(c)?.is_extraction_ready).length;
    return contracts.length > 0 ? (verified / contracts.length) * 100 : 100;
  }
}
