import { SupabaseClient } from '@supabase/supabase-js';
import { PortalType } from '../../types/canonical';
import { assertPortalType } from './portalFilters';
import { assertPayloadOwnership, GovernedPayload } from './taxonomyGuards';

export interface GovernedWriteInput {
  table: string;
  portalType: PortalType;
  userId: string;
  payload: GovernedPayload | readonly GovernedPayload[];
  action?: 'insert' | 'upsert';
  matchFields?: Record<string, unknown>;
}

interface WriteResult<T> {
  data: T | null;
  error: { message: string } | null;
}

interface SelectableMutation<T> {
  select: () => {
    single: () => Promise<WriteResult<T>>;
  };
}

const isSelectableMutation = <T>(value: unknown): value is SelectableMutation<T> => (
  typeof value === 'object'
  && value !== null
  && 'select' in value
  && typeof (value as { select?: unknown }).select === 'function'
);

const stampPayload = (
  payload: GovernedPayload | readonly GovernedPayload[],
  portalType: PortalType,
  userId: string,
): GovernedPayload | GovernedPayload[] => {
  const rows = Array.isArray(payload) ? payload : [payload];
  const stamped = rows.map((row) => ({
    ...row,
    user_id: row.user_id ?? userId,
    portal_type: portalType,
    updated_at: new Date().toISOString(),
  }));

  return Array.isArray(payload) ? stamped : stamped[0];
};

export const executeGovernedWrite = async <T>(
  client: SupabaseClient,
  input: GovernedWriteInput,
): Promise<T> => {
  const portalType = assertPortalType(input.portalType);
  assertPayloadOwnership(portalType, input.payload);

  const payload = stampPayload(input.payload, portalType, input.userId);
  const action = input.action ?? 'upsert';
  const builder = client.from(input.table);
  const mutation = action === 'insert'
    ? builder.insert(payload)
    : builder.upsert(payload, input.matchFields
      ? { onConflict: Object.keys(input.matchFields).join(',') }
      : undefined);
  const result = isSelectableMutation<T>(mutation)
    ? await mutation.select().single()
    : await mutation as WriteResult<T>;

  if (result.error) {
    throw new Error(`[DB WRITE FAILURE] [${input.table}] ${result.error.message}`);
  }

  return result.data as T;
};
