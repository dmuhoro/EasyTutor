import { KnowledgeValidator } from "../../src/knowledge/validator";
import { KnowledgeNode, PortalType } from "../../src/types/canonical";
import { Database, GovernedPayload } from "../../src/infrastructure/database";
import { Telemetry } from "../../src/observability/telemetry";

/**
 * CANONICAL INGESTION PROCESSOR
 * 
 * Industrial-grade pipeline for loading validated content into the EasyTutor OS.
 */

export class IngestionProcessor {
  /**
   * Processes a raw content bundle, validates it against canonical rules,
   * and persists it to the governed knowledge layer.
   */
  static async ingest(nodes: readonly Record<string, unknown>[], portal: PortalType): Promise<void> {
    console.log(`[INGESTION] [START] Processing ${nodes.length} nodes for ${portal}...`);
    const startTime = Date.now();

    let successCount = 0;
    let failureCount = 0;

    for (const rawNode of nodes) {
      if (typeof rawNode.id !== 'string' || typeof rawNode.title !== 'string') {
        console.error('[INGESTION] [REJECTED] Raw node missing id or title');
        failureCount++;
        continue;
      }

      const node: KnowledgeNode = {
        ...rawNode,
        id: rawNode.id,
        title: rawNode.title,
        metadata: typeof rawNode.metadata === 'object' && rawNode.metadata !== null
          ? rawNode.metadata as Record<string, unknown>
          : undefined,
        portal_type: portal
      };

      // 1. Governance Validation
      const validation = KnowledgeValidator.validate(node);
      
      if (!validation.success) {
        console.error(`[INGESTION] [REJECTED] ${node.id}: ${validation.error}`);
        failureCount++;
        continue;
      }

      // 2. Persistence (Governed Write)
      try {
        // In a real ingestion, this would handle chunking and vector embedding
        // For this foundation, we demonstrate the governed write flow
        const payload: GovernedPayload = {
          canonical_id: node.id,
          title: node.title,
          portal_type: node.portal_type,
          metadata: node.metadata,
        };
        await Database.governedWrite('knowledge_nodes', payload, { portalType: portal });
        successCount++;
      } catch (err) {
        console.error(`[INGESTION] [FAILED] ${node.id}:`, err);
        failureCount++;
      }
    }

    const latency = Date.now() - startTime;

    // 3. Telemetry Emission
    Telemetry.emit({
      event: 'CONTENT_INGESTED',
      source: 'knowledge',
      latency,
      payload: {
        portal,
        successCount,
        failureCount,
        totalAttempted: nodes.length
      }
    });

    console.log(`[INGESTION] [COMPLETE] Success: ${successCount}, Failures: ${failureCount} (${latency}ms)`);
  }
}
