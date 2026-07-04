import type { FeedCard } from "@/types/card";
import type { PaperFeedItem } from "@/types/paper";
import type { FeedEntityFilter, FeedNavTab, FollowingState } from "@/types/feed";

import { feedCardsToPaperFeedItems } from "@/lib/cards/feed-item";
import { enrichCardWithHeroImage } from "@/lib/figures/enrich";
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
  cardMatchesFollowing,
  cardMatchesSearch,
  cardMatchesTopicsTab,
  dedupeCards,
} from "@/lib/feed/filters";
import { fetchWorksByOpenAlexIds } from "@/lib/openalex/works";
import { TOPICS, getTopic } from "@/lib/topics";

export const DEFAULT_FEED_LIMIT = 8;
const OPENALEX_PER_PAGE = 25;
const MAX_FETCH_ROUNDS = 8;
const PUBLICATION_YEAR_GTE = 2020;

export type AssembleFeedInput = {
  tab: FeedNavTab;
  cursor?: string | null;
  limit?: number;
  fields?: string[];
  searchQuery?: string;
  entityFilter?: FeedEntityFilter | null;
  savedIds?: string[];
  following?: FollowingState;
};

export type AssembleFeedResult = {
  items: PaperFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

function resolveTopicSlugs(
  fields: string[] | undefined,
  entityFilter: FeedEntityFilter | null | undefined,
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

  return TOPICS.map((topic) => topic.slug);
}

function passesTabFilters(
  card: FeedCard,
  input: AssembleFeedInput,
): boolean {
  if (input.searchQuery && !cardMatchesSearch(card, input.searchQuery)) return false;
  if (input.entityFilter && !cardMatchesEntityFilter(card, input.entityFilter)) return false;

  if (input.tab === "following" && input.following) {
    return cardMatchesFollowing(card, input.following);
  }

  if (input.tab === "topics" && input.following) {
    return cardMatchesTopicsTab(card, input.following);
  }

  return true;
}

async function fetchTopicBatch(
  slug: string,
  openAlexCursor: string | null,
): Promise<{ cards: FeedCard[]; works: OpenAlexWork[]; nextOpenAlexCursor: string | null }> {
  const result = await getWorksByTopic(slug, openAlexCursor, OPENALEX_PER_PAGE);

  return {
    cards: result.cards,
    works: result.works,
    nextOpenAlexCursor: result.nextCursor,
  };
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

  while (collected.length < limit && rounds < MAX_FETCH_ROUNDS) {
    rounds += 1;

    if (topicSlugs.length === 0) break;

    const slug = topicSlugs[topicIndex % topicSlugs.length];
    const batch = await fetchTopicBatch(slug, openAlexCursor);
    const workById = new Map(batch.works.map((work) => [shortOpenAlexId(work.id), work]));
    const candidates = batch.cards.filter((card) => passesTabFilters(card, input));

    await Promise.all(
      candidates.map(async (card) => {
        const work = workById.get(card.openAlexId);
        if (work && !card.heroImageUrl) {
          await enrichCardWithHeroImage(work, card);
        }
      }),
    );

    for (const card of candidates) {
      if (!card.heroImageUrl) continue;
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

    if (openAlexCursor) {
      continue;
    }

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
    cards: dedupeCards(collected),
    nextCursor: hasMore
      ? encodeTopicStreamCursor({ topicIndex, openAlexCursor })
      : null,
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
  const topicSlugs = resolveTopicSlugs(input.fields, input.entityFilter);
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
