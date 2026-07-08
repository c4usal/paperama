import type { FeedCard } from "@/types/card";
import type { OaSource, PaperFeedItem, PaperType } from "@/types/paper";

import { feedCardToPaperFeedItem } from "@/lib/cards/feed-item";
import { getEnrichedIndexDb } from "@/lib/feed/index/db";

export type EnrichedPaperRow = {
  id: number;
  openalex_id: string;
  topic_slug: string;
  title: string;
  tldr: string;
  published_at: string;
  publication_year: number | null;
  citation_count: number;
  score: number;
  hero_image_url: string;
  oa_url: string;
  oa_source: string;
  paper_type: string;
  journal: string;
  authors_json: string;
  match_label: string | null;
  abstract: string | null;
  enriched_at: string;
};

const INSERT_SQL = `
INSERT OR IGNORE INTO enriched_papers (
  openalex_id,
  topic_slug,
  title,
  tldr,
  published_at,
  publication_year,
  citation_count,
  score,
  hero_image_url,
  oa_url,
  oa_source,
  paper_type,
  journal,
  authors_json,
  match_label,
  abstract
) VALUES (
  @openalex_id,
  @topic_slug,
  @title,
  @tldr,
  @published_at,
  @publication_year,
  @citation_count,
  @score,
  @hero_image_url,
  @oa_url,
  @oa_source,
  @paper_type,
  @journal,
  @authors_json,
  @match_label,
  @abstract
)
`;

export function insertEnrichedCard(card: FeedCard, topicSlug: string): boolean {
  if (!card.heroImageUrl || !card.title.trim()) return false;

  const db = getEnrichedIndexDb();
  const year = Number(card.year);
  const publicationYear = Number.isFinite(year) && year > 0 ? year : null;

  const result = db.prepare(INSERT_SQL).run({
    openalex_id: card.openAlexId,
    topic_slug: topicSlug,
    title: card.title,
    tldr: card.tldr,
    published_at: card.year,
    publication_year: publicationYear,
    citation_count: card.citationCount,
    score: card.citationCount,
    hero_image_url: card.heroImageUrl,
    oa_url: card.oaUrl,
    oa_source: card.oaSource,
    paper_type: card.type,
    journal: card.journal,
    authors_json: JSON.stringify(card.authorNames),
    match_label: card.matchLabel ?? null,
    abstract: card.abstract ?? null,
  });

  return result.changes > 0;
}

export function countEnrichedByTopic(topicSlug: string): number {
  const db = getEnrichedIndexDb();
  const row = db
    .prepare("SELECT COUNT(*) AS count FROM enriched_papers WHERE topic_slug = ?")
    .get(topicSlug) as { count: number };
  return row.count;
}

export function countEnrichedForTopics(topicSlugs: string[]): number {
  if (topicSlugs.length === 0) return 0;

  const db = getEnrichedIndexDb();
  const placeholders = topicSlugs.map(() => "?").join(", ");
  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM enriched_papers WHERE topic_slug IN (${placeholders})`,
    )
    .get(...topicSlugs) as { count: number };
  return row.count;
}

export function queryEnrichedPapers(input: {
  topicSlugs: string[];
  limit: number;
  offset: number;
}): EnrichedPaperRow[] {
  if (input.topicSlugs.length === 0) return [];

  const db = getEnrichedIndexDb();
  const placeholders = input.topicSlugs.map(() => "?").join(", ");

  return db
    .prepare(
      `SELECT *
       FROM enriched_papers
       WHERE topic_slug IN (${placeholders})
       ORDER BY score DESC, openalex_id ASC
       LIMIT ? OFFSET ?`,
    )
    .all(...input.topicSlugs, input.limit, input.offset) as EnrichedPaperRow[];
}

function parseAuthorNames(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

export function rowToPaperFeedItem(row: EnrichedPaperRow): PaperFeedItem {
  const authorNames = parseAuthorNames(row.authors_json);
  const card: FeedCard = {
    openAlexId: row.openalex_id,
    title: row.title,
    tldr: row.tldr,
    authors: authorNames.length > 0 ? formatAuthors(authorNames) : "Unknown author",
    authorNames,
    journal: row.journal,
    year: row.published_at,
    citationCount: row.citation_count,
    matchLabel: row.match_label ?? undefined,
    topicSlug: row.topic_slug,
    oaUrl: row.oa_url,
    oaSource: row.oa_source as OaSource,
    heroImageUrl: row.hero_image_url,
    type: row.paper_type as PaperType,
    abstract: row.abstract ?? undefined,
  };

  return feedCardToPaperFeedItem(card);
}

function formatAuthors(names: string[]): string {
  if (names.length === 1) return names[0]!;
  const lead = names[0]!;
  const surname = lead.split(" ").at(-1) ?? lead;
  return `${surname} et al.`;
}
