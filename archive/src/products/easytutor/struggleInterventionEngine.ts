import { HybridRuntime } from '../../runtime/hybridRuntime';
import { TenantContext } from '../../infrastructure/platform/tenantContracts';

/**
 * STRUGGLE INTERVENTION ENGINE (EasyTutor)
 * 
 * Detects student learning struggles and generates real-time pedagogical interventions.
 */
export class StruggleInterventionEngine {
  static async analyzeStruggle(
    context: TenantContext, 
    studentId: string, 
    topicId: string, 
    recentPerformance: any[]
  ): Promise<string> {
    const prompt = `
      Analyze learning struggle for student ${studentId}:
      Topic: ${topicId}
      Performance History: ${JSON.stringify(recentPerformance)}
      
      Identify the conceptual bottleneck and suggest a specific pedagogical intervention (e.g. analogy, simplified exercise, visual aid).
    `;

    const result = await HybridRuntime.getInstance().execute({
      user_id: context.user_id,
      portal_type: context.portal_type,
      subject_id: 'education',
      topic_id: 'intervention',
      learning_goal: 'Conceptual Remediation',
      prompt_params: { prompt }
    } as any);

    return (result.result as any)?.text || (result.result as string) || 'Pedagogical guidance unavailable';
  }
}
