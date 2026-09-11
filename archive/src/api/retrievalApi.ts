import { GovernedRetriever } from '../intelligence/retrieval/governedRetriever';
import { RetrievalContext, CanonicalContentNode } from '../types/canonical';
import { GovernedApiGateway } from './governedApiGateway';
import { TenantIsolationGovernor } from '../infrastructure/platform/tenantIsolationGovernor';
import { TenantContextResolver } from '../infrastructure/platform/tenantContextResolver';

/**
 * RETRIEVAL API
 * 
 * Exposes governed semantic retrieval as a platform service.
 */
export class RetrievalApi {
  static async retrieve(
    headers: Record<string, string>, 
    context: RetrievalContext
  ): Promise<CanonicalContentNode[]> {
    return GovernedApiGateway.handleRequest(
      'retrieval:search',
      headers,
      'student',
      async () => {
        const tenantCtx = TenantContextResolver.getContext();
        
        // Ensure subject/topic is owned by tenant portal
        // (Basic validation before calling lower-level retriever)
        if (context.active_path && context.active_path.length > 0) {
          await TenantIsolationGovernor.validateOwnership(tenantCtx, context.active_path[0]);
        }
        
        return GovernedRetriever.retrieve(context);
      }
    );
  }
}
