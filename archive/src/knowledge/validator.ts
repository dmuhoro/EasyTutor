import { KnowledgeNode, ServiceResponse } from "../types/canonical";
import { validateCanonicalID } from "./taxonomies";

/**
 * KNOWLEDGE VALIDATION PIPELINE
 * 
 * Rejects malformed content automatically before persistence.
 */

export class KnowledgeValidator {
  static validate(node: KnowledgeNode): ServiceResponse<KnowledgeNode> {
    // 1. Validate Portal Ownership
    if (!['high_school', 'university', 'knowledge_explorer'].includes(node.portal_type)) {
      return { success: false, error: `[GOVERNANCE] Invalid portal_type: ${node.portal_type}` };
    }

    // 2. Validate Canonical ID
    if (!validateCanonicalID(node.id, node.portal_type)) {
      return { 
        success: false, 
        error: `[GOVERNANCE] ID ${node.id} does not match taxonomy for ${node.portal_type}` 
      };
    }

    // 3. Validate Title
    if (!node.title || node.title.length < 3) {
      return { success: false, error: '[GOVERNANCE] Node title missing or too short' };
    }

    return { success: true, data: node };
  }
}
