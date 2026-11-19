import { SupabaseClient, User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase';
import { PortalContextResolver } from '../contextResolver';
import { PortalType } from '../../types/canonical';
import { buildPortalScopedQuery, PortalScopedQueryInput } from './governedQueries';
import { executeGovernedWrite, GovernedWriteInput } from './governedWrites';
import { GovernedPayload, TaxonomyScope } from './taxonomyGuards';
import type { RetrievalPolicy } from './retrievalPolicies';

export interface GovernedQueryRequest {
  table: string;
  columns: string;
  portalType?: PortalType;
  userId?: string;
  taxonomyScope?: TaxonomyScope;
}

export class Database {
  static getClient(): SupabaseClient {
    const mock = typeof globalThis !== 'undefined' ? (globalThis as any).__MOCK_SUPABASE_CLIENT__ : null;
    if (mock) {
      return mock;
    }
    if (!supabase) {
      throw new Error('[INFRASTRUCTURE ERROR] Supabase client unavailable');
    }
    return supabase;
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
