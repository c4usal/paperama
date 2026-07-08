import type { FeedCard } from "@/types/card";
import type { PaperFeedItem } from "@/types/paper";
import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";

import { feedCardsToPaperFeedItems } from "@/lib/cards/feed-item";
import { enrichCardWithHeroImage, type EnrichHeroOptions } from "@/lib/figures/enrich";
import { getWorksByTopic } from "@/lib/feed/cache";
import { shortOpenAlexId } from "@/lib/openalex/client";
import type { OpenAlexWork } from "@/lib/openalex/types";
import {
  decodeSavedListCursor,
  decodeTopicStreamCursor,
  encodeSavedListCursor,
  encodeTopicStreamCursor,
} from "@/lib/feed/cursor";
import {
  cardMatchesEntityFilter,
  cardMatchesSearch,
  cardMatchesSelectedTopics,
  dedupeCards,
} from "@/lib/feed/filters";
import { fetchWorksByOpenAlexIds } from "@/lib/openalex/works";
import { TOPICS, getTopic } from "@/lib/topics";

export const DEFAULT_FEED_LIMIT = 16;
const OPENALEX_PER_PAGE = 50;
const MAX_FETCH_ROUNDS = 8;
const ENRICH_CONCURRENCY = 12;
const SLOW_ENRICH_CAP = 4;
const PUBLICATION_YEAR_GTE = 2015;

export type AssembleFeedInput = {
  tab: FeedNavTab;
  cursor?: string | null;
  limit?: number;
  fields?: string[];
  searchQuery?: string;
  entityFilter?: FeedEntityFilter | null;
  savedIds?: string[];
  selectedTopicSlugs?: string[];
};

export type AssembleFeedResult = {
  items: PaperFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function resolveTopicSlugs(
  fields: string[] | undefined,
  entityFilter: FeedEntityFilter | null | undefined,
  selectedTopicSlugs?: string[],
): string[] {
  if (entityFilter?.type === "topic") {
    const value = entityFilter.value.trim().toLowerCase();
    const bySlug = getTopic(entityFilter.value);
    if (bySlug) return [bySlug.slug];

    const byLabel = TOPICS.find((topic) => topic.label.toLowerCase() === value);
    if (byLabel) return [byLabel.slug];

    const fuzzy = TOPICS.find(
      (topic) =>
        topic.label.toLowerCase().includes(value) || value.includes(topic.label.toLowerCase()),
    );
    if (fuzzy) return [fuzzy.slug];
  }

  if (fields?.length) {
    return fields.filter((slug) => Boolean(getTopic(slug)));
  }

  if (selectedTopicSlugs !== undefined) {
    return selectedTopicSlugs.filter((slug) => Boolean(getTopic(slug)));
  }

  return TOPICS.map((topic) => topic.slug);
}

function passesTabFilters(card: FeedCard, input: AssembleFeedInput): boolean {
  if (input.searchQuery && !cardMatchesSearch(card, input.searchQuery)) return false;
  if (input.entityFilter && !cardMatchesEntityFilter(card, input.entityFilter)) return false;

  if (input.tab === "for-you" && input.selectedTopicSlugs !== undefined) {
    return cardMatchesSelectedTopics(card, input.selectedTopicSlugs);
  }

  return true;
}

async function fetchTopicBatch(
  slug: string,
  openAlexCursor: string | null,
  perPage: number,
): Promise<{ cards: FeedCard[]; works: OpenAlexWork[]; nextOpenAlexCursor: string | null }> {
  const result = await getWorksByTopic(slug, openAlexCursor, perPage);

  return {
    cards: result.cards,
    works: result.works,
    nextOpenAlexCursor: result.nextCursor,
  };
}

function heroResolutionScore(work: OpenAlexWork): number {
  let score = 0;
  const doi = work.ids?.doi ?? "";

  if (work.ids?.pmcid) score += 50;
  if (/10\.1371\/journal\.(pone|pbio|pcbi|ppat|pgen)/i.test(doi)) score += 48;
  if (/10\.1038\/|10\.1007\/|10\.1186\//.test(doi)) score += 42;
  if (/10\.3390\//.test(doi)) score += 40;
  if (/10\.3389\//.test(doi)) score += 38;
  if (/10\.7554\/elife\./i.test(doi)) score += 36;
  if (work.ids?.arxiv) score += 20;

  return score;
}

function rankCandidates(
  candidates: FeedCard[],
  workById: Map<string, OpenAlexWork>,
): FeedCard[] {
  return [...candidates].sort((a, b) => {
    const aWork = workById.get(a.openAlexId);
    const bWork = workById.get(b.openAlexId);
    return (
      heroResolutionScore(bWork ?? ({} as OpenAlexWork)) -
      heroResolutionScore(aWork ?? ({} as OpenAlexWork))
    );
  });
}

/** Enrich only as many ranked candidates as needed to reach `target` heroes. */
async function enrichUntilFilled(
  candidates: FeedCard[],
  workById: Map<string, OpenAlexWork>,
  target: number,
  options: EnrichHeroOptions,
): Promise<void> {
  const ranked = rankCandidates(candidates, workById);

  function heroCount(): number {
    return ranked.filter((card) => card.heroImageUrl).length;
  }

  for (let i = 0; i < ranked.length && heroCount() < target; i += ENRICH_CONCURRENCY) {
    const chunk = ranked.slice(i, i + ENRICH_CONCURRENCY);
    await Promise.all(
      chunk.map(async (card) => {
        if (heroCount() >= target || card.heroImageUrl) return;

        const work = workById.get(card.openAlexId);
        if (!work) return;

        try {
          await enrichCardWithHeroImage(work, card, options);
        } catch {
          // try next candidate
        }
      }),
    );
  }

  if (options.fastOnly || heroCount() >= target) return;

  const needsSlow = ranked
    .filter((card) => !card.heroImageUrl)
    .slice(0, Math.min(SLOW_ENRICH_CAP, target - heroCount()));

  if (needsSlow.length === 0) return;

  await Promise.all(
    needsSlow.map(async (card) => {
      if (heroCount() >= target || card.heroImageUrl) return;

      const work = workById.get(card.openAlexId);
      if (!work) return;

      try {
        await enrichCardWithHeroImage(work, card, {
          fastHero: false,
          skipTldr: true,
        });
      } catch {
        // try next candidate
      }
    }),
  );
}

async function collectFromTopicStreams(
  topicSlugs: string[],
  startCursor: { topicIndex: number; openAlexCursor: string | null },
  limit: number,
  input: AssembleFeedInput,
): Promise<{ cards: FeedCard[]; nextCursor: string | null; hasMore: boolean }> {
  const collected: FeedCard[] = [];
  let topicIndex = startCursor.topicIndex;
  let openAlexCursor = startCursor.openAlexCursor;
  let rounds = 0;
  const isPagination = Boolean(input.cursor);
  const enrichOptions: EnrichHeroOptions = {
    fastHero: true,
    skipTldr: true,
    fastOnly: isPagination,
  };

  while (collected.length < limit && rounds < MAX_FETCH_ROUNDS) {
    rounds += 1;

    if (topicSlugs.length === 0) break;

    const slug = topicSlugs[topicIndex % topicSlugs.length]!;
    const batch = await fetchTopicBatch(slug, openAlexCursor, OPENALEX_PER_PAGE);
    const workById = new Map(batch.works.map((work) => [shortOpenAlexId(work.id), work]));
    const candidates = batch.cards.filter((card) => passesTabFilters(card, input));

    const need = limit - collected.length;
    await enrichUntilFilled(candidates, workById, need, enrichOptions);

    for (const card of rankCandidates(candidates, workById)) {
      if (!card.title?.trim() || !card.heroImageUrl) continue;
      collected.push(card);
      if (collected.length >= limit) break;
    }

    openAlexCursor = batch.nextOpenAlexCursor;

    if (collected.length >= limit) {
      return {
        cards: dedupeCards(collected).slice(0, limit),
        nextCursor: encodeTopicStreamCursor({ topicIndex, openAlexCursor }),
        hasMore: true,
      };
    }

    if (openAlexCursor) continue;

    topicIndex += 1;
    openAlexCursor = null;

    if (topicIndex >= topicSlugs.length) {
      return {
        cards: dedupeCards(collected),
        nextCursor: null,
        hasMore: false,
      };
    }
  }

  const hasMore = topicIndex < topicSlugs.length || openAlexCursor !== null;

  return {
    cards: dedupeCards(collected).slice(0, limit),
    nextCursor: hasMore ? encodeTopicStreamCursor({ topicIndex, openAlexCursor }) : null,
    hasMore,
  };
}

async function assembleSavedFeed(input: AssembleFeedInput): Promise<AssembleFeedResult> {
  const savedIds = [...new Set(input.savedIds ?? [])];
  const limit = input.limit ?? DEFAULT_FEED_LIMIT;
  const { offset } = decodeSavedListCursor(input.cursor ?? null);
  const pageIds = savedIds.slice(offset, offset + limit);

  if (pageIds.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const cards = await fetchWorksByOpenAlexIds(pageIds);
  const filtered = cards.filter((card) => passesTabFilters(card, input));
  const nextOffset = offset + pageIds.length;

  return {
    items: feedCardsToPaperFeedItems(filtered),
    nextCursor:
      nextOffset < savedIds.length ? encodeSavedListCursor({ offset: nextOffset }) : null,
    hasMore: nextOffset < savedIds.length,
  };
}

async function assembleStreamFeed(input: AssembleFeedInput): Promise<AssembleFeedResult> {
  const limit = input.limit ?? DEFAULT_FEED_LIMIT;
  const topicSlugs = resolveTopicSlugs(
    input.fields,
    input.entityFilter,
    input.selectedTopicSlugs,
  );

  if (topicSlugs.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const streamCursor = decodeTopicStreamCursor(input.cursor ?? null);
  const { cards, nextCursor, hasMore } = await collectFromTopicStreams(
    topicSlugs,
    streamCursor,
    limit,
    input,
  );

  return {
    items: feedCardsToPaperFeedItems(cards),
    nextCursor,
    hasMore,
  };
}

export async function assembleFeed(input: AssembleFeedInput): Promise<AssembleFeedResult> {
  if (input.tab === "saved") {
    return assembleSavedFeed(input);
  }

  return assembleStreamFeed(input);
}

export { PUBLICATION_YEAR_GTE };
