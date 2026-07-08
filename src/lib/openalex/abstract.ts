/**
 * Reconstruct plain-text abstract from OpenAlex inverted index.
 * @see https://docs.openalex.org/api-entities/works/work-object#abstract_inverted_index
 */
export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
): string {
  if (!invertedIndex) return "";

  const tokens: Array<{ word: string; position: number }> = [];

  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const position of positions) {
      tokens.push({ word, position });
    }
  }

  if (tokens.length === 0) return "";

  tokens.sort((a, b) => a.position - b.position);
  const raw = tokens.map((token) => token.word).join(" ").replace(/\s+([,.;:!?])/g, "$1").trim();
  return stripMarkup(raw);
}

function stripMarkup(text: string): string {
  return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** First ~maxChars of abstract for card tldr until sumy enrichment runs. */
export function abstractToSnippet(abstract: string, maxChars = 200): string {
  const normalized = stripMarkup(abstract);
  if (!normalized) return "";

  if (normalized.length <= maxChars) return normalized;

  const slice = normalized.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed}…`;
}
