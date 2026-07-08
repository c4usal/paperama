import type { AssembleFeedInput, AssembleFeedResult } from "@/lib/feed/assemble";
import { DEFAULT_FEED_LIMIT } from "@/lib/feed/assemble";
import { feedCardToPaperFeedItem } from "@/lib/cards/feed-item";
import { decodeSavedListCursor, encodeSavedListCursor } from "@/lib/feed/cursor";
import { FIRST_LOAD_LIMIT, FEED_BUFFER_TARGET } from "@/lib/feed/warm-feed-caches";
import { getTopic } from "@/lib/topics";
import type { FeedCard } from "@/types/card";
import type { OaSource, PaperType } from "@/types/paper";

type D1FirstRow = { count?: number | string | null };

type D1Prepared = {
  bind: (...args: unknown[]) => {
    all: <T>() => Promise<{ results: T[] }>;
    first: <T>() => Promise<T | null>;
  };
};

export type D1Like = {
  prepare: (sql: string) => D1Prepared;
};

type EnrichedPaperRow = {
  openalex_id: string;
  topic_slug: string;
  title: string;
  tldr: string;
  published_at: string;
  citation_count: number;
  hero_image_url: string;
  oa_url: string;
  oa_source: string;
  paper_type: string;
  journal: string;
  authors_json: string;
  match_label: string | null;
  abstract: string | null;
};

function resolveTopicSlugs(selectedTopicSlugs?: string[]): string[] {
  if (selectedTopicSlugs === undefined) return [];
  return selectedTopicSlugs.filter((slug) => Boolean(getTopic(slug)));
}

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function pickRandomStartOffset(total: number, pageSize: number): number {
  if (total <= pageSize) return 0;
  // Prefer leaving runway ahead; wrap-around still covers edge starts.
  const runway = Math.min(FEED_BUFFER_TARGET, Math.max(pageSize, total - pageSize));
  const maxStart = Math.max(0, total - runway);
  return Math.floor(Math.random() * (maxStart + 1));
}

function parseAuthors(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((name): name is string => typeof name === "string");
  } catch {
    return [];
  }
}

function formatAuthors(names: string[]): string {
  if (names.length === 1) return names[0]!;
  const lead = names[0]!;
  const surname = lead.split(" ").at(-1) ?? lead;
  return `${surname} et al.`;
}

function rowToFeedItem(row: EnrichedPaperRow) {
  const authorNames = parseAuthors(row.authors_json);
  const card: FeedCard = {
    openAlexId: row.openalex_id,
    title: row.title,
    tldr: row.tldr,
    authors: authorNames.length > 0 ? formatAuthors(authorNames) : "Unknown author",
    authorNames,
    journal: row.journal,
    year: row.published_at,
    citationCount: toNumber(row.citation_count),
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

async function countForTopics(db: D1Like, topicSlugs: string[]): Promise<number> {
  if (topicSlugs.length === 0) return 0;
  const placeholders = topicSlugs.map(() => "?").join(", ");
  const row = await db
    .prepare(`SELECT COUNT(*) AS count FROM enriched_papers WHERE topic_slug IN (${placeholders})`)
    .bind(...topicSlugs)
    .first<D1FirstRow>();
  return toNumber(row?.count ?? 0);
}

async function queryRows(input: {
  db: D1Like;
  topicSlugs: string[];
  limit: number;
  offset: number;
}): Promise<EnrichedPaperRow[]> {
  if (input.topicSlugs.length === 0) return [];
  const placeholders = input.topicSlugs.map(() => "?").join(", ");
  const { results } = await input.db
    .prepare(
      `SELECT openalex_id, topic_slug, title, tldr, published_at, citation_count, hero_image_url,
              oa_url, oa_source, paper_type, journal, authors_json, match_label, abstract
       FROM enriched_papers
       WHERE topic_slug IN (${placeholders})
       ORDER BY score DESC, openalex_id ASC
       LIMIT ? OFFSET ?`,
    )
    .bind(...input.topicSlugs, input.limit, input.offset)
    .all<EnrichedPaperRow>();

  return results;
}

export async function assembleFeedFromD1Index(
  db: D1Like,
  input: AssembleFeedInput,
): Promise<AssembleFeedResult> {
  const topicSlugs = resolveTopicSlugs(input.selectedTopicSlugs);
  if (topicSlugs.length === 0) return { items: [], nextCursor: null, hasMore: false };

  const total = await countForTopics(db, topicSlugs);
  if (total === 0) return { items: [], nextCursor: null, hasMore: false };

  const isFirstPage = input.cursor == null;
  const limit = isFirstPage
    ? Math.min(input.limit ?? FIRST_LOAD_LIMIT, FIRST_LOAD_LIMIT)
    : (input.limit ?? DEFAULT_FEED_LIMIT);
  const offset = isFirstPage
    ? pickRandomStartOffset(total, limit)
    : decodeSavedListCursor(input.cursor ?? null).offset;

  const rows = await queryRows({ db, topicSlugs, limit, offset });
  let items = rows.map(rowToFeedItem);
  let wrapCount = 0;

  // Near end of inventory: wrap from the start so scrolling doesn't dead-end.
  if (items.length < limit && total > items.length) {
    const wrapRows = await queryRows({
      db,
      topicSlugs,
      limit: limit - items.length,
      offset: 0,
    });
    const seen = new Set(items.map((item) => item.openAlexId));
    for (const row of wrapRows) {
      const item = rowToFeedItem(row);
      if (seen.has(item.openAlexId)) continue;
      seen.add(item.openAlexId);
      items.push(item);
      wrapCount += 1;
    }
  }

  const advanced = offset + rows.length;
  const nextOffset = wrapCount > 0 ? wrapCount % total : advanced % total;
  // Keep paging forever when we have enough inventory to keep scrolling.
  const hasMore = total > Math.min(limit, total);

  return {
    items,
    nextCursor: hasMore ? encodeSavedListCursor({ offset: nextOffset }) : null,
    hasMore,
  };
}
