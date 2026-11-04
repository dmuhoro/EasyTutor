// Concrete, governed Supabase evidence writer.
//
// Guarantees:
//   * ownership always comes from the authenticated session (auth.uid()), never the payload;
//   * a payload whose owner differs from the session is rejected before it reaches the database;
//   * a duplicate (user_id, client_event_id) is acknowledged as an idempotent success;
//   * every failure is classified so the outbox can decide retry vs. permanent failure.

import {
  validateEvidence,
  type EvidenceRecord,
  type EvidenceWriter,
  type EvidenceWriteResult,
} from '../../domain/evidence/evidenceService';
import {
  EVIDENCE_TABLE,
  failureFromError,
  toLearningEvidenceRow,
  type EvidenceClient,
} from './evidenceClient';

export type EvidenceClientProvider = () => EvidenceClient | null;

export function createSupabaseEvidenceWriter(getClient: EvidenceClientProvider): EvidenceWriter {
  return {
    async write(record: EvidenceRecord): Promise<EvidenceWriteResult> {
      const invalid = validateEvidence(record);
      if (invalid) {
        return { ok: false, code: 'validation', message: invalid, retryable: false };
      }

      const client = getClient();
      if (!client) {
        return {
          ok: false,
          code: 'network',
          message: 'Supabase client is not configured on this device',
          retryable: true,
        };
      }

      let userId: string;
      try {
        const { data, error } = await client.auth.getUser();
        if (error) {
          return {
            ok: false,
            code: 'auth_expired',
            message: error.message ?? 'Authentication expired',
            retryable: true,
          };
        }
        if (!data.user?.id) {
          return {
            ok: false,
            code: 'auth_expired',
            message: 'No authenticated learner session',
            retryable: true,
          };
        }
        userId = data.user.id;
      } catch (error) {
        return {
          ok: false,
          code: 'network',
          message: error instanceof Error ? error.message : 'Unable to verify learner session',
          retryable: true,
        };
      }

      if (userId !== record.userId) {
        // Fail closed: never write evidence under an identity the record does not belong to.
        return {
          ok: false,
          code: 'identity_mismatch',
          message: 'Evidence owner does not match the authenticated learner',
          retryable: false,
        };
      }

      try {
        const { error } = await client
          .from(EVIDENCE_TABLE)
          .insert(toLearningEvidenceRow(record, userId));

        if (error) return failureFromError(error);
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          code: 'network',
          message: error instanceof Error ? error.message : 'Evidence submission failed',
          retryable: true,
        };
      }
    },
  };
}
