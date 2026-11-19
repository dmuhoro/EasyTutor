import { generateEmbedding } from './embeddings';
import { rankAndFilterChunks, RetrievalChunk } from './retrieval/ranking';
import {
  Database,
  assertRetrievalContext,
  buildRetrievalPolicy,
  GovernedRetrievalContext,
} from '../src/infrastructure/database';

interface RetrievalRow {
  content: string;
  similarity: number;
  metadata?: Record<string, unknown>;
}

interface FtsRow {
  id?: string;
  content: string;
  metadata?: Record<string, unknown>;
  rank?: number;
}

export interface ChapterRef {
  chapter_no: number | string;
  chapter_title: string;
}

/** Build a citation string like [Bird Ch15 p.171] from chunk metadata. */
export const buildCitation = (metadata?: Record<string, unknown>): string => {
  if (!metadata) return '';
  const source = metadata.source;
  const chapter = metadata.chapter_no;
  const page = metadata.page;
  if (!source && chapter == null && page == null) return '';
  const parts: string[] = [];
  if (source) parts.push(String(source));
  if (chapter != null) parts.push(`Ch${chapter}`);
  if (page != null) parts.push(`p.${page}`);
  return parts.length ? `[${parts.join(' ')}]` : '';
};

/** Distinct chapters (chapter_no + chapter_title) imported for a subject, used
 *  to scope retrieval via the chapter picker. */
export const getAvailableChapters = async (
  taxonomyScope: string | null
): Promise<ChapterRef[]> => {
  if (!taxonomyScope) return [];
  // Governed read: active portal + authenticated owner are resolved inside the
  // infrastructure boundary, never guessed here.
  const { data } = await Database.governedChapters(taxonomyScope);
  const seen = new Set<string>();
  const chapters: ChapterRef[] = [];
  for (const row of (data ?? [])) {
    const meta = row?.metadata as Record<string, unknown> | null;
    if (!meta) continue;
    const cn = meta.chapter_no;
    const ct = meta.chapter_title;
    if (cn == null || ct == null) continue;
    const key = `${String(cn)}|${String(ct)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    chapters.push({ chapter_no: String(cn), chapter_title: String(ct) });
  }
  chapters.sort((a, b) => {
    const na = Number(a.chapter_no), nb = Number(b.chapter_no);
    if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
    return String(a.chapter_no).localeCompare(String(b.chapter_no));
  });
  return chapters;
};

export const retrieveRelevantChunks = async (
  query: string,
  context: GovernedRetrievalContext,
  options: { minSimilarity?: number; maxChunks?: number } = {}
): Promise<RetrievalChunk[]> => {
  const retrievalContext = assertRetrievalContext(context);
  const policy = buildRetrievalPolicy(retrievalContext, options);
    
  try {
    const embedding = await generateEmbedding(query);

    if (embedding && embedding.length > 0) {
      // Vector similarity path (requires Ollama embedding model).
      const { data, error } = await Database.governedRetrieval<RetrievalRow[]>(
        'match_document_chunks',
        {
          query_embedding: embedding,
          match_count: Math.max(policy.matchCount, 15),
          min_similarity: policy.minSimilarity,
          portal_type: policy.portalType,
          taxonomy_scope: policy.taxonomyScope ?? null,
          curriculum_scope: policy.curriculumScope ?? null,
          school_scope: policy.schoolScope ?? null,
          vector_namespace: policy.vectorNamespace ?? null
        },
        policy
      );

      if (error) {
        throw error;
      }

      const rawRows = (data ?? []) as RetrievalRow[];
      const rawChunks: RetrievalChunk[] = rawRows.map((row) => ({
        content: row.content,
        similarity: row.similarity,
        metadata: row.metadata
      }));

      const results = rankAndFilterChunks(rawChunks, options.minSimilarity, options.maxChunks);
      return results;
    }

    // FTS-first path (ADR-009): no local embedding model is needed. The ranked
    // RPC runs under RLS and an explicit auth.uid() filter, so a learner only
    // ever sees their own imported chunks. Fail closed: an empty query or no
    // matching rows returns [], never a fabricated match.
    const { data: ftsData, error: ftsError } = await Database.governedRetrieval<FtsRow[]>(
      'search_document_chunks_fts',
      {
        query_text: query,
        portal_type_filter: policy.portalType,
        taxonomy_scope_filter: policy.taxonomyScope ?? null,
        curriculum_scope_filter: policy.curriculumScope ?? null,
        school_scope_filter: policy.schoolScope ?? null,
        match_count: Math.max(policy.matchCount, 15),
      },
      policy
    );

    if (ftsError) {
      throw ftsError;
    }

    const rawChunks: RetrievalChunk[] = ((ftsData ?? []) as FtsRow[]).map((row) => ({
      content: row.content,
      // ts_rank orders matches; map it into the [0.75, 1] band so the ranked
      // FTS result survives the governance similarity gate (default 0.7)
      // while preserving rank order. This is a match score, not a cosine.
      similarity: 0.75 + 0.25 * Math.min(Math.max(Number(row.rank) || 0, 0), 1),
      metadata: row.metadata
    }));

    const results = rankAndFilterChunks(rawChunks, options.minSimilarity, options.maxChunks);
    return results;

  } catch (err) {
    console.error('[RETRIEVAL ERROR]', err);
    return [];
  }
};
