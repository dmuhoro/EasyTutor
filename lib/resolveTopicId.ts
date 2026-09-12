import { getSupabaseClient, logSupabaseError } from './supabaseOps';

/**
 * Returns true if value is a valid UUID v1-v5.
 */
export const isUUID = (value: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

/**
 * Resolves a topic reference to its DB UUID.
 *
 * Priority:
 *   1. If topicIdOrName is already a valid UUID → return it immediately (no DB call)
 *   2. If topicIdOrName is a string title → query topics WHERE title = ? AND subject_id = ?
 *   3. If nothing resolves → return null (caller decides how to handle)
 *
 * NEVER throws. Returns null on failure so callers can handle gracefully or
 * use assertRequiredWriteFields to block the write path.
 *
 * @param topicIdOrName  A DB UUID, a local stable ID (non-UUID), or a topic title string
 * @param subjectId      The subjects.id this topic belongs to
 */
export const resolveTopicId = async (
  topicIdOrName: string | null | undefined,
  subjectId: string | null | undefined,
): Promise<string | null> => {
  // 1. Short-circuit: already a UUID
  if (topicIdOrName && isUUID(topicIdOrName)) {
    if (__DEV__) console.log('[TOPIC RESOLVED] uuid passthrough', { topicIdOrName });
    return topicIdOrName;
  }

  // 2. Need both a title and a subjectId to do a DB lookup
  const sanitizedTitle = topicIdOrName?.trim();
  if (!sanitizedTitle || !subjectId) {
    console.error('[ERROR] resolveTopicId: missing title or subjectId', { topicIdOrName, subjectId });
    return null;
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from('topics')
      .select('id')
      .eq('subject_id', subjectId)
      .ilike('title', sanitizedTitle)
      .limit(1)
      .maybeSingle();

    if (error) {
      logSupabaseError('topics', 'select', error);
      console.error('[ERROR] resolveTopicId DB error', { title: sanitizedTitle, subjectId, error });
      return null;
    }

    if (data?.id) {
      if (__DEV__) console.log('[TOPIC RESOLVED] db lookup', { title: sanitizedTitle, id: data.id });
      return data.id;
    }

    console.error('[ERROR] resolveTopicId: topic not found in DB', { title: sanitizedTitle, subjectId });
    return null;
  } catch (err) {
    console.error('[ERROR] resolveTopicId: unexpected error', err);
    return null;
  }
};

/**
 * Strict variant: throws [FATAL] if resolution fails.
 * Use this in write paths (quiz_sessions, user_progress) where a null topic_id
 * must hard-stop the operation.
 */
export const resolveTopicIdOrThrow = async (
  topicIdOrName: string | null | undefined,
  subjectId: string | null | undefined,
): Promise<string> => {
  const resolved = await resolveTopicId(topicIdOrName, subjectId);
  if (!resolved) {
    throw new Error(
      `[DB WRITE FAILURE] resolveTopicId: "${topicIdOrName ?? 'unknown topic'}" was not found in the "${subjectId ?? 'unknown'}" curriculum. The write was blocked.`
    );
  }
  return resolved;
};
