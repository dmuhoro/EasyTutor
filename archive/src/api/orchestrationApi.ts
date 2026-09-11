import { getLearningOrchestrator, OrchestrationResult } from '../intelligence';
import { GovernedApiGateway } from './governedApiGateway';
import { TenantIsolationGovernor } from '../infrastructure/platform/tenantIsolationGovernor';
import { TenantContextResolver } from '../infrastructure/platform/tenantContextResolver';

/**
 * ORCHESTRATION API
 * 
 * Exposes deterministic learning orchestration as a platform service.
 */
export class OrchestrationApi {
  static async generateLesson(
    headers: Record<string, string>, 
    payload: any
  ): Promise<OrchestrationResult> {
    return GovernedApiGateway.handleRequest(
      'orchestration:generate_lesson',
      headers,
      'student',
      async () => {
        const tenantCtx = TenantContextResolver.getContext();
        await TenantIsolationGovernor.validateOwnership(tenantCtx, payload.topic_id || payload.canonical_id);
        return getLearningOrchestrator().generateLesson(payload);
      }
    );
  }

  static async assembleQuiz(
    headers: Record<string, string>, 
    payload: any
  ): Promise<OrchestrationResult> {
    return GovernedApiGateway.handleRequest(
      'orchestration:assemble_quiz',
      headers,
      'student',
      async () => {
        const tenantCtx = TenantContextResolver.getContext();
        await TenantIsolationGovernor.validateOwnership(tenantCtx, payload.topic_id || payload.canonical_id);
        return getLearningOrchestrator().assembleQuiz(payload);
      }
    );
  }

  static async generateRoadmap(
    headers: Record<string, string>, 
    payload: any
  ): Promise<OrchestrationResult> {
    return GovernedApiGateway.handleRequest(
      'orchestration:generate_roadmap',
      headers,
      'student',
      async () => {
        const tenantCtx = TenantContextResolver.getContext();
        await TenantIsolationGovernor.validateOwnership(tenantCtx, payload.topic_id || payload.canonical_id);
        return getLearningOrchestrator().generateRoadmap(payload);
      }
    );
  }
}
