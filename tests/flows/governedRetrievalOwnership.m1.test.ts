import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Database, buildRetrievalPolicy, assertRetrievalContext } from '../../src/infrastructure/database';
import { setActivePortalContext } from '../../src/infrastructure/portalContext';
import { getAvailableChapters } from '../../lib/retrieval';
import { mockSupabase, TEST_USER_ID } from '../utils/mockSupabase';

const OTHER_USER_ID = '22222222-2222-4222-8222-222222222222';

const highSchoolPolicy = () => buildRetrievalPolicy(
  assertRetrievalContext({
    portal_type: 'high_school',
    curriculum_scope: 'KICD_KCSE',
    taxonomy_scope: 'HS-MATH',
    mastery_level: 30,
    user_goal: 'Master linear equations',
    active_path: ['HS-MATH-ALG'],
  }),
);

describe('M1 T4 — governed retrieval ownership', () => {
  beforeEach(() => {
    mockSupabase.reset();
    setActivePortalContext({ learningMode: 'high_school', userId: TEST_USER_ID });
  });

  it('scopes chapter reads to the resolved portal and the authenticated learner', async () => {
    mockSupabase.user = { id: TEST_USER_ID, email: 'student@example.com' };

    await getAvailableChapters('HS-MATH');

    const chapterRead = mockSupabase.reads.find((read) => read.table === 'document_chunks');
    expect(chapterRead).toBeDefined();
    const filters = Object.fromEntries(chapterRead!.filters.map((filter) => [filter.column, filter.value]));
    expect(filters.user_id).toBe(TEST_USER_ID);
    expect(filters.portal_type).toBe('high_school');
    expect(filters.curriculum_scope).toBe('KICD_KCSE');
    expect(filters.taxonomy_scope).toBe('HS-MATH');
  });

  it('does not leak one learner\'s scope into another learner\'s read', async () => {
    mockSupabase.user = { id: TEST_USER_ID, email: 'student@example.com' };
    await getAvailableChapters('HS-MATH');
    const firstRead = mockSupabase.reads.find((read) => read.table === 'document_chunks');
    const firstOwner = firstRead!.filters.find((filter) => filter.column === 'user_id')?.value;

    mockSupabase.reads = [];
    mockSupabase.user = { id: OTHER_USER_ID, email: 'other@example.com' };
    setActivePortalContext({ learningMode: 'high_school', userId: OTHER_USER_ID });
    await getAvailableChapters('HS-MATH');

    const secondRead = mockSupabase.reads.find((read) => read.table === 'document_chunks');
    const secondOwner = secondRead!.filters.find((filter) => filter.column === 'user_id')?.value;
    expect(firstOwner).toBe(TEST_USER_ID);
    expect(secondOwner).toBe(OTHER_USER_ID);
    expect(secondOwner).not.toBe(firstOwner);
  });

  it('refuses a retrieval policy that does not match the resolved portal', async () => {
    setActivePortalContext({ learningMode: 'university', userId: TEST_USER_ID });

    await expect(Database.governedRetrieval(
      'search_document_chunks_fts',
      { query_text: 'algebra' },
      highSchoolPolicy(),
    )).rejects.toThrow(/does not match active portal/);
  });

  it('refuses retrieval when there is no authenticated owner', async () => {
    vi.spyOn(mockSupabase.client.auth, 'getUser').mockResolvedValue({
      data: { user: null },
      error: null,
    } as never);

    await expect(Database.governedRetrieval(
      'search_document_chunks_fts',
      { query_text: 'algebra' },
      highSchoolPolicy(),
    )).rejects.toThrow(/User not authenticated/);
  });
});
