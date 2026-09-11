import { ServiceContractRegistry } from '../ServiceContractRegistry';

/**
 * SHARED CAPABILITY RESOLVER
 * 
 * Dynamically resolves the best infrastructure provider for shared platform 
 * capabilities, facilitating portable deployment across different environments.
 */
export class SharedCapabilityResolver {
  static resolveProvider(capabilityId: string): string {
    const contract = ServiceContractRegistry.getContract(`contract:${capabilityId}`);
    
    if (contract) {
      console.log(`[CAPABILITY RESOLVER] Resolved provider for ${capabilityId} via ${contract.id}`);
      return contract.id;
    }

    return 'default_platform_provider';
  }
}
