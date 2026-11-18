import { Database } from '../src/infrastructure/database';
import type { PortalType } from '../src/types/canonical';
import type { StoreChunksResult } from './knowledge';
import { stableHashId } from './stableId';

export interface LibraryDocument {
  id: string;
  title: string;
  createdAt: string | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseDocuments(value: unknown): LibraryDocument[] {
  if (!Array.isArray(value)) {
    throw new Error('The library response was not a document list.');
  }

  return value.map((entry, index) => {
    if (
      !isRecord(entry) ||
      typeof entry.id !== 'string' ||
      typeof entry.title !== 'string' ||
      (entry.created_at != null && typeof entry.created_at !== 'string')
    ) {
      throw new Error(`The library response contains an invalid document at row ${index + 1}.`);
    }

    return {
      id: entry.id,
      title: entry.title,
      createdAt: typeof entry.created_at === 'string' ? entry.created_at : null,
    };
  });
}

export async function listPrivateDocuments(
  userId: string,
  portalType: PortalType,
): Promise<LibraryDocument[]> {
  if (!userId) throw new Error('Sign in before opening your library.');

  const { data, error } = await Database.governedQuery({
    table: 'documents',
    columns: 'id,title,created_at',
    userId,
    portalType,
  })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Could not load your library: ${error.message}`);
  }

  return parseDocuments(data);
}

export async function importPrivateNotes(input: {
  userId: string;
  portalType: PortalType;
  subjectId: string;
  title: string;
  text: string;
  onChunkProcessed?: (processed: number, total: number) => void;
}): Promise<StoreChunksResult> {
  const title = input.title.trim();
  const text = input.text.trim();
  if (!input.userId) throw new Error('Sign in before importing notes.');
  if (!title) throw new Error('Add a title for these notes.');
  if (!input.subjectId) throw new Error('Choose a subject for these notes.');
  if (!text) throw new Error('Paste some note text before importing.');

  // Importing notes is the only path that needs the chunker and the store.
  // Load them on demand so browsing the library does not pull the ingestion
  // graph (and so no route pays for it in the shared chunk).
  const [{ chunkText }, { storeChunks }] = await Promise.all([
    import('./chunking'),
    import('./knowledge'),
  ]);

  const chunks = chunkText(text).map((content) => ({
    content,
    metadata: { source: title },
  }));
  if (chunks.length === 0) throw new Error('No readable text was found to import.');

  return storeChunks({
    userId: input.userId,
    portalType: input.portalType,
    documentId: stableHashId(`${input.userId}|${input.subjectId}|${title}|${text}`),
    title,
    chunks,
    subjectId: input.subjectId,
    onChunkProcessed: input.onChunkProcessed,
  });
}
