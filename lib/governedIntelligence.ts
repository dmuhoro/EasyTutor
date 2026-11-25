/**
 * Single boundary for learning-intelligence database access.
 *
 * Feature engines must not call Supabase directly: every read is portal-scoped
 * and every write stamps the resolved owner through the governed layer. When no
 * learning mode is active the conservative high-school portal is used, never
 * an unrestricted query.
 */
import { supabase } from './supabase';
import { portalFromMode } from '../src/domain/learning/portal';
import { getActiveLearningMode } from '../src/infrastructure/portalContext';
import { buildPortalScopedQuery } from '../src/infrastructure/database/governedQueries';
import { executeGovernedWrite } from '../src/infrastructure/database/governedWrites';
import type { GovernedPayload } from '../src/infrastructure/database/taxonomyGuards';

const activePortal = () => portalFromMode(getActiveLearningMode() ?? 'high_school');

function requireClient() {
  if (!supabase) {
    throw new Error('[GOVERNANCE ERROR] No Supabase client.');
  }
  return supabase;
}

export const governedQuery = (table: string, columns: string, userId?: string) =>
  buildPortalScopedQuery(requireClient(), {
    table,
    columns,
    userId,
    portalType: activePortal(),
  });

export const governedWrite = async <T>(
  table: string,
  userId: string,
  payload: object | readonly object[],
  action: 'insert' | 'upsert' = 'upsert',
  matchFields?: Record<string, unknown>,
): Promise<T> => executeGovernedWrite<T>(requireClient(), {
  table,
  userId,
  portalType: activePortal(),
  payload: payload as GovernedPayload | readonly GovernedPayload[],
  action,
  matchFields,
});
