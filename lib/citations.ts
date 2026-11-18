export interface CitationSource {
  source: string;
  chapter?: string;
  page?: string;
  excerpt: string;
}

export interface CitableSource extends CitationSource {
  reference: string;
}

export function citedSources(answer: string, sources: CitableSource[]): CitationSource[] {
  return sources.flatMap(({ reference, ...citation }) =>
    answer.includes(reference) ? [citation] : [],
  );
}
