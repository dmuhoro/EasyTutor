import { ServiceContract } from './stabilizationContracts';

/**
 * SERVICE CONTRACT REGISTRY
 * 
 * The authoritative registry for all cross-layer service contracts, ensuring 
 * that modules interact only through governed interfaces.
 */
export class ServiceContractRegistry {
  private static contracts: Map<string, ServiceContract> = new Map();

  static register(contract: ServiceContract): void {
    this.contracts.set(contract.id, contract);
    console.log(`[STABILIZATION] Registered Contract: ${contract.id} v${contract.version}`);
  }

  static getContract(id: string): ServiceContract | undefined {
    return this.contracts.get(id);
  }

  static validateInteroperability(sourceId: string, targetId: string): boolean {
    const source = this.contracts.get(sourceId);
    const target = this.contracts.get(targetId);
    
    if (!source || !target) return false;
    
    // Check if target is a known dependency of source
    return source.dependencies.includes(targetId);
  }
}
