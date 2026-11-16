import { SupabaseClient } from '@supabase/supabase-js';
import { PortalType } from '../../types/canonical';
import { assertPortalType } from './portalFilters';
import { assertCanonicalOwnership, TaxonomyScope } from './taxonomyGuards';
import { governanceFor, isPortalScoped, ownerColumnFor } from './tableGovernance';

export interface PortalScopedQueryInput {
  table: string;
  columns: string;
  portalType: PortalType;
  userId?: string;
  taxonomyScope?: TaxonomyScope;
}

export const buildPortalScopedQuery = (
  client: SupabaseClient,
  input: PortalScopedQueryInput,
) => {
  const portalType = assertPortalType(input.portalType);
  assertCanonicalOwnership(portalType, input.taxonomyScope);

  let query = client.from(input.table).select(input.columns);

  // Unknown tables are not governed: a caller that passes a userId expects an
  // owner filter, and silently returning every row would be a data leak.
  if (input.userId && !governanceFor(input.table)) {
    throw new Error(
      `[GOVERNANCE ERROR] Table "${input.table}" has no owner mapping; refusing to query it with a user filter.`,
    );
  }

  if (input.userId) {
    const ownerColumn = ownerColumnFor(input.table);
    if (!ownerColumn) {
      throw new Error(
        `[GOVERNANCE ERROR] Table "${input.table}" is shared and has no owner column; refusing to filter it by user.`,
      );
    }
    query = query.eq(ownerColumn, input.userId);
  }

  // Only tables that actually carry portal_type may be filtered by it.
  if (isPortalScoped(input.table)) {
    query = query.eq('portal_type', portalType);
  }

  const scope = input.taxonomyScope;
  if (scope?.curriculumScope) query = query.eq('curriculum_scope', scope.curriculumScope);
  if (scope?.schoolScope) query = query.eq('school_scope', scope.schoolScope);
  if (scope?.departmentScope) query = query.eq('department_scope', scope.departmentScope);
  if (scope?.subjectScope) query = query.eq('subject_scope', scope.subjectScope);
  if (scope?.knowledgeDomainScope) {
    query = query.eq('knowledge_domain_scope', scope.knowledgeDomainScope);
  }

  return query;
};
