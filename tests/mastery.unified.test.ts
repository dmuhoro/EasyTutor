import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * C18 — DB-backed mastery.
 *
 * The existing `mastery.test.ts` deliberately mocks Supabase as `null`, so it only proves the
 * offline/cache path. This suite supplies a real client spy and asserts that mastery state is
 * read from, and written back to, `subject_mastery` through the governed boundary — including the
 * ownership stamp added by `executeGovernedWrite`.
 */
const h = vi.hoisted(() => {
  const single = vi.fn(async () => ({ data: null, error: null }));
  const select = vi.fn();
  const eq = vi.fn();
  const upsert = vi.fn();
  const insert = vi.fn();
  const from = vi.fn();
  const chain = { select, eq, single, upsert, insert };
  select.mockReturnValue(chain);
  eq.mockReturnValue(chain);
  upsert.mockImplementation((payload: unknown) => {
    (upsert as unknown as { lastPayload?: unknown }).lastPayload = payload;
    return chain;
  });
  from.mockReturnValue(chain);
  return { single, select, eq, upsert, insert, from, chain };
});

vi.mock('../lib/supabase', () => ({ supabase: { from: h.from, auth: { getUser: vi.fn() } } }));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(async () => null), // force the DB read path
    setItem: vi.fn(async () => undefined),
    getAllKeys: vi.fn(async () => []),
  },
}));

vi.mock('../lib/analytics', () => ({ track: vi.fn() }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateMastery } from '../lib/mastery';

describe('DB-backed mastery (C18)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.select.mockReturnValue(h.chain);
    h.eq.mockReturnValue(h.chain);
    h.from.mockReturnValue(h.chain);
    h.single.mockResolvedValue({ data: null, error: null });
  });

  it('reads subject_mastery through the governed boundary when no cache exists', async () => {
    await updateMastery('user-42', 'Mathematics', 'Algebra', 4, 5);

    expect(h.from).toHaveBeenCalledWith('subject_mastery');
    expect(h.select).toHaveBeenCalledWith('*');
    expect(h.eq).toHaveBeenCalledWith('user_id', 'user-42');
    expect(h.eq).toHaveBeenCalledWith('subject', 'Mathematics');
    expect(h.eq).toHaveBeenCalledWith('topic', 'Algebra');
  });

  it('writes the recomputed record back to subject_mastery with an ownership stamp', async () => {
    await updateMastery('user-42', 'Mathematics', 'Algebra', 4, 5);

    expect(h.upsert).toHaveBeenCalledTimes(1);
    const [payload, options] = h.upsert.mock.calls[0] as [Record<string, unknown>, { onConflict?: string } | undefined];
    expect(payload).toEqual(expect.objectContaining({
      user_id: 'user-42',
      subject: 'Mathematics',
      topic: 'Algebra',
      attempts: 1,
      correct_answers: 4,
      total_answers: 5,
      mastery_percent: 80,
    }));
    expect(payload.updated_at).toEqual(expect.any(String));
    expect(options?.onConflict).toBe('user_id,subject,topic');
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
