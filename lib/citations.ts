export interface CitationSource {
  source: string;
  chapter?: string;
  page?: string;
  excerpt: string;
}

export interface CitableSource extends CitationSource {
  reference: string;
}

const normalizeMarker = (marker: string): string => marker.replace(/\s+/g, ' ').trim();

/**
 * Return only retrieved sources whose exact bracketed marker was rendered in
 * the answer. A bare substring (for example `Bird Ch15 p.171` without the
 * brackets) is not a citation, and a near-miss marker such as
 * `[Bird Ch15 p.1710]` must not credit `[Bird Ch15 p.171]`.
 *
 * The candidate list is the retrieved-source list supplied by the caller, so
 * an answer cannot invent a citation for content that was never retrieved.
 */
export function citedSources(answer: string, sources: CitableSource[]): CitationSource[] {
  const renderedMarkers = new Set(
    (answer.match(/\[[^\]]+\]/g) ?? []).map(normalizeMarker),
  );

  return sources.flatMap(({ reference, ...citation }) => {
    const normalizedReference = normalizeMarker(reference);
    if (!/^\[[^\]]+\]$/.test(normalizedReference)) return [];
    return renderedMarkers.has(normalizedReference) ? [citation] : [];
  });
}
