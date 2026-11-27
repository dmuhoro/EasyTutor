import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { PortalContextResolver } from '../contextResolver';
import { PortalType } from '../../types/canonical';
import { buildPortalScopedQuery, PortalScopedQueryInput } from './governedQueries';
import { executeGovernedWrite, GovernedWriteInput } from './governedWrites';
import { ownerColumnFor } from './tableGovernance';
import { GovernedPayload, TaxonomyScope } from './taxonomyGuards';
import type { RetrievalPolicy } from './retrievalPolicies';

export interface GovernedQueryRequest {
  table: string;
  columns: string;
  portalType?: PortalType;
  userId?: string;
  taxonomyScope?: TaxonomyScope;
}

/** Fail-closed signal for a backend that cannot be safely resolved. */
export class BackendUnavailableError extends Error {
  constructor(why = 'backend unavailable') {
    super(`[BACKEND UNAVAILABLE] ${why}`);
    this.name = 'BackendUnavailable';
  }
}

export class Database {
  /**
   * One runtime resolver. A mock is a test seam, never a production fallback:
   * production refuses both a leaked mock and a missing client.
   */
  static getClient(): SupabaseClient {
    const env = process.env.NODE_ENV;
    const prod = env === 'production';
    const test = !prod && (env === 'test' || !!process.env.VITEST);
    const dev = !prod && !test && process.env.EASYTUTOR_ALLOW_MOCK === '1';
    const mock = (globalThis as typeof globalThis & {
      __MOCK_SUPABASE_CLIENT__?: SupabaseClient | null;
    })?.__MOCK_SUPABASE_CLIENT__ ?? null;

    if (!mock && supabase) return supabase;
    if (mock && (test || dev)) return mock;
    throw new BackendUnavailableError();
  }

  static async getAuthenticatedUser(): Promise<User> {
    const client = this.getClient();
    const { data: { user }, error } = await client.auth.getUser();

    if (error || !user) {
      throw new Error('[GOVERNANCE ERROR] User not authenticated');
    }

    return user;
  }

  static async safeGetAuthenticatedUser(): Promise<User | null> {
    try {
      const client = this.getClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user) return null;
      return user;
    } catch {
      return null;
    }
  }

  static governedQuery(request: GovernedQueryRequest) {
    const context = request.portalType ? null : PortalContextResolver.resolve();
    const input: PortalScopedQueryInput = {
      table: request.table,
      columns: request.columns,
      portalType: request.portalType ?? context!.portal_type,
      userId: request.userId,
      taxonomyScope: request.taxonomyScope,
    };

    return buildPortalScopedQuery(this.getClient(), input);
  }

  /**
   * Governed RPC boundary for retrieval. The caller supplies the already-built
   * retrieval policy; this method resolves the active portal, refuses a policy
   * that belongs to a different portal, and asserts an authenticated owner
   * before letting the RPC rely on RLS / auth.uid().
   */
  static async governedRetrieval<T>(
    rpc: 'match_document_chunks' | 'search_document_chunks_fts',
    args: Record<string, unknown>,
    policy: RetrievalPolicy,
  ): Promise<{ data: T | null; error: { message: string } | null }> {
    const active = PortalContextResolver.resolve();
    if (active.portal_type !== policy.portalType) {
      throw new Error(
        `[GOVERNANCE ERROR] Retrieval policy portal ${policy.portalType} does not match active portal ${active.portal_type}.`,
      );
    }
    const user = await this.getAuthenticatedUser();
    if (!user.id) throw new Error('[GOVERNANCE ERROR] Retrieval requires an authenticated owner.');

    const { data, error } = await this.getClient().rpc(rpc, args);
    return { data: data as T | null, error: error as { message: string } | null };
  }

  /** Governed chapter list for the active portal and authenticated learner. */
  static async governedChapters(taxonomyScope: string): Promise<{
    data: Array<{ metadata: unknown }> | null;
    error: unknown;
  }> {
    const context = PortalContextResolver.resolve();
    const user = await this.getAuthenticatedUser();
    const result = await buildPortalScopedQuery(this.getClient(), {
      table: 'document_chunks',
      columns: 'metadata',
      portalType: context.portal_type,
      userId: user.id,
      taxonomyScope: {
        taxonomyScope,
        curriculumScope: context.curriculum_scope,
      },
    }).eq('taxonomy_scope', taxonomyScope);

    return result as unknown as { data: Array<{ metadata: unknown }> | null; error: unknown };
  }

  /**
   * Delete only rows owned by the authenticated learner. The caller cannot
   * supply a user id, so this boundary cannot be used to target another
   * learner's data. Portal filtering is deliberately absent: erasure covers
   * the learner's rows in every portal.
   */
  static async governedDelete(table: string): Promise<void> {
    const user = await this.getAuthenticatedUser();
    const ownerColumn = ownerColumnFor(table);
    if (!ownerColumn) {
      throw new Error(
        `[GOVERNANCE ERROR] Table "${table}" has no owner column; refusing to delete rows.`,
      );
    }
    const { error } = await this.getClient().from(table).delete().eq(ownerColumn, user.id);
    if (error) throw new Error(`[DB DELETE FAILURE] [${table}] ${error.message}`);
  }

  static async governedWrite<T>(
    table: string,
    payload: GovernedPayload | readonly GovernedPayload[],
    options: Partial<Pick<GovernedWriteInput, 'action' | 'portalType' | 'userId' | 'matchFields'>> = {},
  ): Promise<T> {
    const context = options.portalType ? null : PortalContextResolver.resolve();
    const user = options.userId ? { id: options.userId } : await this.getAuthenticatedUser();

    return executeGovernedWrite<T>(this.getClient(), {
      table,
      payload,
      action: options.action,
      matchFields: options.matchFields,
      portalType: options.portalType ?? context!.portal_type,
      userId: user.id,
    });
  }
}

export * from './governedQueries';
export * from './governedWrites';
export * from './portalFilters';
export * from './retrievalPolicies';
export * from './tableGovernance';
export * from './taxonomyGuards';
export { validateCanonicalID } from '../../knowledge/taxonomies';
