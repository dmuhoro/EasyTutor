import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  governedQuery: vi.fn(),
  order: vi.fn(),
  limit: vi.fn(),
  storeChunks: vi.fn(),
  rows: [] as unknown[],
  error: null as { message: string } | null,
}));

vi.mock('../../src/infrastructure/database', () => ({
  Database: {
    governedQuery: mocks.governedQuery,
  },
}));

vi.mock('../../lib/knowledge', () => ({
  storeChunks: mocks.storeChunks,
}));

import { importPrivateNotes, listPrivateDocuments } from '../../lib/library';

describe('private library service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rows = [{ id: 'doc-1', title: 'Mechanics notes', created_at: '2026-11-17T10:00:00Z' }];
    mocks.error = null;
    mocks.limit.mockImplementation(async () => ({ data: mocks.rows, error: mocks.error }));
    mocks.order.mockReturnValue({ limit: mocks.limit });
    mocks.governedQuery.mockReturnValue({ order: mocks.order });
    mocks.storeChunks.mockResolvedValue({ stored: 1, failed: 0, total: 1 });
  });

  it('lists only the authenticated user’s documents through the governed portal query', async () => {
    await expect(listPrivateDocuments('user-1', 'university')).resolves.toEqual([
      { id: 'doc-1', title: 'Mechanics notes', createdAt: '2026-11-17T10:00:00Z' },
    ]);

    expect(mocks.governedQuery).toHaveBeenCalledWith({
      table: 'documents',
      columns: 'id,title,created_at',
      userId: 'user-1',
      portalType: 'university',
    });
    expect(mocks.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mocks.limit).toHaveBeenCalledWith(100);
  });

  it('rejects malformed or failed reads instead of presenting a success-shaped empty library', async () => {
    mocks.rows = [{ id: 'doc-1' }];
    await expect(listPrivateDocuments('user-1', 'high_school')).rejects.toThrow('invalid document');

    mocks.rows = [];
    mocks.error = { message: 'permission denied' };
    await expect(listPrivateDocuments('user-1', 'high_school')).rejects.toThrow('permission denied');
  });

  it('stores pasted notes under the chosen subject with title metadata', async () => {
    await importPrivateNotes({
      userId: 'user-1',
      portalType: 'knowledge_explorer',
      subjectId: 'auto-eng',
      title: ' Braking notes ',
      text: 'Friction resists motion.',
    });

    expect(mocks.storeChunks).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user-1',
      portalType: 'knowledge_explorer',
      title: 'Braking notes',
      subjectId: 'auto-eng',
      chunks: [expect.objectContaining({
        content: 'Friction resists motion.',
        metadata: { source: 'Braking notes' },
      })],
    }));
  });
});
