import { supabase } from './supabase';
import { SUBJECTS } from '../constants/subjects';
import { TOPICS } from '../constants/topics';

/**
 * Seed subjects table idempotently.
 * Requires UNIQUE(name, level) constraint on subjects table.
 * Safe to run multiple times — duplicates are ignored.
 */
export const seedSubjects = async (): Promise<void> => {
  console.log('[SEED] Seeding subjects...');

  const rows = SUBJECTS.map((s) => ({
    id: s.id,
    name: s.name,
    level: s.level,
    icon: s.icon,
    description: s.description,
    ...(s.kicd_ref ? { kicd_ref: s.kicd_ref } : {}),
  }));

  const { error } = await supabase!
    .from('subjects')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('[SEED] [ERROR] subjects upsert failed:', error.message);
    throw error;
  }

  console.log(`[SEED] [SUBJECT] ${rows.length} subjects upserted`);
};

/**
 * Seed topics table idempotently.
 * Requires subjects to already exist.
 * Requires UNIQUE(subject_id, title) constraint on topics table.
 * Safe to run multiple times — duplicates are ignored.
 */
export const seedTopics = async (): Promise<void> => {
  console.log('[SEED] Seeding topics...');

  const rows = TOPICS.map((t) => ({
    subject_id: t.subject_id,
    title: t.title,
    sort_order: t.sort_order,
    ...(t.form_level ? { form_level: t.form_level } : {}),
    ...(t.subtopics ? { subtopics: t.subtopics } : {}),
  }));

  const { error } = await supabase!
    .from('topics')
    .upsert(rows, { onConflict: 'subject_id,title' });

  if (error) {
    console.error('[SEED] [ERROR] topics upsert failed:', error.message);
    throw error;
  }

  console.log(`[SEED] [SUBJECT] ${rows.length} topics upserted`);
};

/**
 * Run all seeds in dependency order.
 * Subjects must be inserted before topics (FK constraint).
 */
export const runSeeds = async (): Promise<void> => {
  console.log('[SEED] Start');
  await seedSubjects();
  await seedTopics();
  console.log('[SEED] Complete');
};
