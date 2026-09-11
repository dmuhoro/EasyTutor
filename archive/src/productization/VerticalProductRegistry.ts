import { VerticalProduct, ProductId } from './productContracts';

/**
 * VERTICAL PRODUCT REGISTRY
 * 
 * The central authority for all vertical products available on the platform.
 */
export class VerticalProductRegistry {
  private static products: Map<ProductId, VerticalProduct> = new Map();

  static register(product: VerticalProduct): void {
    this.products.set(product.id, product);
    console.log(`[PRODUCT REGISTRY] Registered: ${product.name} v${product.version}`);
  }

  static getProduct(id: ProductId): VerticalProduct | undefined {
    return this.products.get(id);
  }

  static listProducts(): VerticalProduct[] {
    return Array.from(this.products.values());
  }

  static initialize(): void {
    // Seed initial products
    this.register({
      id: 'easytutor',
      name: 'EasyTutor',
      version: '1.0.0',
      capabilities: ['inference', 'retrieval', 'curriculum'],
      default_portal: 'high_school',
      description: 'Cognitive learning and tutoring platform'
    });

    this.register({
      id: 'freelanceros',
      name: 'FreelancerOS',
      version: '0.1.0',
      capabilities: ['crm', 'billing', 'inference'],
      default_portal: 'professional',
      description: 'AI-native operating system for freelancers'
    });

    this.register({
      id: 'garageos',
      name: 'GarageOS',
      version: '0.2.0',
      capabilities: ['diagnostics', 'crm', 'billing'],
      default_portal: 'operational',
      description: 'Intelligent automotive workshop management'
    });
  }
}
