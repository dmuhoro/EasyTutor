import { CapabilityId, ProductCapabilityMap } from './productContracts';

/**
 * PRODUCT CAPABILITY MAPPER
 * 
 * Maps high-level product requirements to granular platform infrastructure capabilities.
 */
export class ProductCapabilityMapper {
  private static capabilityMaps: Map<CapabilityId, ProductCapabilityMap> = new Map();

  static registerMapping(map: ProductCapabilityMap): void {
    this.capabilityMaps.set(map.capability_id, map);
  }

  static getMapping(id: CapabilityId): ProductCapabilityMap | undefined {
    return this.capabilityMaps.get(id);
  }

  static getRequiredPolicies(capabilities: CapabilityId[]): string[] {
    const policies = new Set<string>();
    capabilities.forEach(cap => {
      const map = this.getMapping(cap);
      map?.governance_policies.forEach(p => policies.add(p));
    });
    return Array.from(policies);
  }
}
