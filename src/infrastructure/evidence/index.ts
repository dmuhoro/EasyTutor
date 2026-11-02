// Application wiring for the evidence boundary.
// The only place where the domain/infrastructure contracts meet the real Supabase client.

import { supabase } from '../../../lib/supabase';
import type { EvidenceClient } from './evidenceClient';
import { createSupabaseEvidenceWriter } from './supabaseEvidenceWriter';
import { createSupabaseEvidenceRepository } from './supabaseEvidenceRepository';

export function getEvidenceClient(): EvidenceClient | null {
  return (supabase as unknown as EvidenceClient | null) ?? null;
}

export const supabaseEvidenceWriter = createSupabaseEvidenceWriter(getEvidenceClient);
export const supabaseEvidenceRepository = createSupabaseEvidenceRepository(getEvidenceClient);

export * from './evidenceClient';
export * from './supabaseEvidenceWriter';
export * from './supabaseEvidenceRepository';
