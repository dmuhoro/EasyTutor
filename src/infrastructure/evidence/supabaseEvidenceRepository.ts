// Governed read boundary for persisted learning evidence.
// UI/store code never issues raw queries: it asks this repository for a learner's records,
// and the caller supplies the authenticated learner id (derived from the session at the edge).

import type { EvidenceRecord } from '../../domain/evidence/evidenceService';
import {
  EVIDENCE_TABLE,
  parseLearningEvidenceRow,
  type EvidenceClient,
} from './evidenceClient';

export interface LoadEvidenceOptions {
  /** Maximum rows to return; newest first. */
  limit?: number;
}

export type EvidenceReadResult =
  | { ok: true; records: EvidenceRecord[] }
  | { ok: false; code: 'auth_expired' | 'network' | 'backend'; message: string };

export function createSupabaseEvidenceRepository(getClient: () => EvidenceClient | null) {
  return {
    async listForLearner(userId: string, options: LoadEvidenceOptions = {}): Promise<EvidenceReadResult> {
      const client = getClient();
      if (!client) {
        return { ok: false, code: 'network', message: 'Supabase client is not configured on this device' };
      }

      try {
        const { data: auth } = await client.auth.getUser();
        if (!auth.user?.id) {
          return { ok: false, code: 'auth_expired', message: 'No authenticated learner session' };
        }
        if (auth.user.id !== userId) {
          return { ok: false, code: 'auth_expired', message: 'Requested learner is not the authenticated learner' };
        }

        const { data, error } = await client
          .from(EVIDENCE_TABLE)
          .select('user_id,client_event_id,subject_id,skill_id,activity_id,objective_id,curriculum_ref,item_id,item_version,assessment_version,dimension,response,score,independent,hints,provenance,validation_status,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(options.limit ?? 500);

        if (error) {
          return { ok: false, code: 'backend', message: error.message };
        }

        const records = (data ?? [])
          .map(parseLearningEvidenceRow)
          .filter((record): record is EvidenceRecord => record !== null);

        return { ok: true, records };
      } catch (error) {
        return {
          ok: false,
          code: 'network',
          message: error instanceof Error ? error.message : 'Unable to load evidence',
        };
      }
    },
  };
}

export type EvidenceRepository = ReturnType<typeof createSupabaseEvidenceRepository>;
