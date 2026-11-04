import { PortalType, RetrievalContext } from "../types/canonical";
import { getActivePortalContext, requireActivePortalType } from "./portalContext";
import { normalizePortalType } from "./database/portalFilters";

/**
 * PORTAL CONTEXT RESOLVER
 *
 * Mandated middleware for resolving the active educational ecosystem.
 * Prevents cross-contamination between portals.
 *
 * The active context is published by the store into `portalContext`; this
 * module never imports `store/*`. That inversion removes the database ↔ store
 * dependency cycle while preserving fail-closed behaviour when no portal has
 * been resolved.
 */

export class PortalContextResolver {
  /**
   * Resolves the current context from the process portal context.
   */
  static resolve(): RetrievalContext {
    const state = getActivePortalContext();
    const activeMode = requireActivePortalType();

    if (!activeMode) {
      throw new Error('[GOVERNANCE ERROR] No active portal context resolved.');
    }

    return {
      portal_type: activeMode,
      curriculum_scope: this.getCurriculumScope(activeMode),
      knowledge_scope: this.getKnowledgeScope(activeMode),
      user_context: state.userId
    };
  }

  private static getCurriculumScope(mode: PortalType): string {
    switch (mode) {
      case 'high_school': return 'KICD_KCSE';
      case 'university': return 'HEB_UNIV';
      case 'knowledge_explorer': return 'GLOBAL_OPEN';
      default: return 'NONE';
    }
  }

  private static getKnowledgeScope(mode: PortalType): string {
    // Isolated namespaces for vector retrieval
    return `namespace:${mode}`;
  }
}

// Keep `normalizePortalType` reachable for callers that historically imported
// it through this module.
export { normalizePortalType };

/**
 * Mandated Query Filter Generator
 */
export const getPortalFilter = (context: RetrievalContext) => {
  return {
    portal_type: context.portal_type,
    scope: context.curriculum_scope || context.knowledge_scope
  };
};
