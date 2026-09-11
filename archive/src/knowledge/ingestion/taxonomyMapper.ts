import { PortalType } from '../../types/canonical';

export class TaxonomyMapper {
  static mapToTaxonomyPath(portalType: PortalType, subjectId: string, topicId: string): string[] {
    return [portalType, subjectId, topicId];
  }

  static validateOwnership(portalType: PortalType, subjectId: string): boolean {
    if (portalType === 'high_school' && subjectId.startsWith('HS-')) return true;
    if (portalType === 'university' && subjectId.startsWith('UNI-')) return true;
    if (portalType === 'knowledge_explorer' && subjectId.startsWith('KE-')) return true;
    return false;
  }
}
