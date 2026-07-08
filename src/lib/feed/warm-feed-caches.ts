import { fetchFeed } from "@/lib/api/feed";
import type { FeedApiRequest, FeedApiResponse } from "@/lib/api/feed-types";
import {
  buildFeedCacheKey,
  buildFeedPageCacheKey,
  clearFeedPagePrefetchInFlight,
  getFeedCache,
  getFeedPageCache,
  isFeedPagePrefetchInFlight,
  markFeedPagePrefetchInFlight,
  setFeedCache,
  setFeedPageCache,
} from "@/lib/feed/client-cache";
import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

/** Cards returned per pagination request while scrolling. */
export const FEED_PAGE_LIMIT = 12;

/** Cards shown on first paint — small random slice, not the full inventory. */
export const FIRST_LOAD_LIMIT = 12;

/** Target scroll buffer — filled silently in the background after first load. */
export const FEED_BUFFER_TARGET = 48;

const warmedKeys = new Set<string>();
const inFlightFetches = new Map<string, Promise<FeedApiResponse>>();
const inFlightStacks = new Map<string, Promise<void>>();

function normalizeTopicSlugs(slugs: string[]): string[] {
  return [...new Set(slugs)].sort();
}

function buildInitialFeedRequest(input: {
  tab: FeedNavTab;
  entityFilter?: FeedEntityFilter | null;
  searchQuery?: string;
  savedSeedIds?: string[];
  selectedTopicSlugs?: string[];
}): FeedApiRequest {
  return {
    tab: input.tab,
    limit: FIRST_LOAD_LIMIT,
    cursor: null,
    searchQuery: input.searchQuery,
    entityFilter: input.entityFilter,
    ...(input.tab === "saved" ? { savedIds: input.savedSeedIds ?? [] } : {}),
    selectedTopicSlugs: input.selectedTopicSlugs,
  };
}

function buildInitialFetchKey(request: FeedApiRequest): string {
  return buildFeedCacheKey({
    tab: request.tab,
    entityFilter: request.entityFilter,
    searchQuery: request.searchQuery,
    savedSeedIds: request.tab === "saved" ? request.savedIds : undefined,
    selectedTopicSlugs: request.selectedTopicSlugs,
  });
}

export function getInFlightFeedFetch(feedKey: string): Promise<FeedApiResponse> | undefined {
  return inFlightFetches.get(feedKey);
}

export function getInFlightFeedStack(feedKey: string): Promise<void> | undefined {
  return inFlightStacks.get(feedKey);
}

function prefetchFeedPageInternal(
  feedKey: string,
  request: FeedApiRequest,
  maxChain = 1,
): void {
  const cursor = request.cursor;
  if (!cursor) return;

  const pageKey = buildFeedPageCacheKey(feedKey, cursor);
  const cached = getFeedPageCache(pageKey);
  if (cached) {
    if (cached.nextCursor && maxChain > 1) {
      prefetchFeedPageInternal(
        feedKey,
        { ...request, cursor: cached.nextCursor },
        maxChain - 1,
      );
    }
    return;
  }
  if (isFeedPagePrefetchInFlight(pageKey)) return;

  markFeedPagePrefetchInFlight(pageKey);

  void fetchFeed(request)
    .then((data) => {
      if (data.items.length === 0) return;

      setFeedPageCache(pageKey, {
        papers: data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        emptyMessage: null,
      });

      if (data.nextCursor && data.hasMore && maxChain > 1) {
        prefetchFeedPageInternal(
          feedKey,
          { ...request, cursor: data.nextCursor },
          maxChain - 1,
        );
      }
    })
    .catch(() => {
      // best-effort prefetch
    })
    .finally(() => {
      clearFeedPagePrefetchInFlight(pageKey);
    });
}

export function prefetchFeedPage(feedKey: string, request: FeedApiRequest): void {
  prefetchFeedPageInternal(feedKey, request, 1);
}

/** Prefetch multiple pages ahead — used after each page merge. */
export function prefetchFeedPageChain(
  feedKey: string,
  request: FeedApiRequest,
  maxChain = 4,
): void {
  const cursor = request.cursor;
  if (!cursor) return;

  prefetchFeedPageInternal(
    feedKey,
    { ...request, limit: FEED_PAGE_LIMIT, cursor },
    maxChain,
  );
}

function prefetchPagesForBuffer(
  feedKey: string,
  request: FeedApiRequest,
  cursor: string | null,
): void {
  if (!cursor) return;

  const pagesNeeded = Math.ceil(
    Math.max(0, FEED_BUFFER_TARGET - FIRST_LOAD_LIMIT) / FEED_PAGE_LIMIT,
  );
  if (pagesNeeded <= 0) return;

  prefetchFeedPageInternal(
    feedKey,
    { ...request, limit: FEED_PAGE_LIMIT, cursor },
    pagesNeeded,
  );
}

export function fetchInitialFeedPage(request: FeedApiRequest): Promise<FeedApiResponse> {
  const key = buildInitialFetchKey(request);
  const existing = inFlightFetches.get(key);
  if (existing) return existing;

  const promise = fetchFeed({
    ...request,
    limit: FIRST_LOAD_LIMIT,
    cursor: null,
  }).finally(() => {
    inFlightFetches.delete(key);
  });
  inFlightFetches.set(key, promise);
  return promise;
}

/** First random slice + chained page prefetch to fill the scroll buffer. */
export async function warmFeedCacheEntry(
  feedKey: string,
  request: FeedApiRequest,
): Promise<void> {
  const data = await fetchInitialFeedPage(request);
  if (data.items.length === 0) return;

  setFeedCache(feedKey, {
    papers: data.items,
    nextCursor: data.nextCursor,
    hasMore: data.hasMore,
    emptyMessage: null,
  });

  prefetchPagesForBuffer(feedKey, request, data.nextCursor);
}

function startFeedWarm(feedKey: string, request: FeedApiRequest): void {
  if (inFlightStacks.has(feedKey)) return;

  const promise = warmFeedCacheEntry(feedKey, request)
    .catch(() => {
      warmedKeys.delete(feedKey);
    })
    .finally(() => {
      inFlightStacks.delete(feedKey);
    });

  inFlightStacks.set(feedKey, promise);
}

export function warmForYouFeedCache(selectedTopicSlugs: string[]): void {
  const normalized = normalizeTopicSlugs(selectedTopicSlugs);
  if (normalized.length === 0) return;

  const key = buildFeedCacheKey({
    tab: "for-you",
    selectedTopicSlugs: normalized,
  });

  const cached = getFeedCache(key);
  if (cached && cached.papers.length >= FIRST_LOAD_LIMIT) return;
  if (inFlightStacks.has(key)) return;

  warmedKeys.add(key);

  startFeedWarm(key, {
    tab: "for-you",
    limit: FIRST_LOAD_LIMIT,
    cursor: null,
    selectedTopicSlugs: normalized,
  });
}

export function warmFeedTabCache(input: {
  tab: FeedNavTab;
  entityFilter?: FeedEntityFilter | null;
  searchQuery?: string;
  savedSeedIds?: string[];
  selectedTopicSlugs?: string[];
}): void {
  if (input.tab === "for-you" && input.selectedTopicSlugs?.length) {
    warmForYouFeedCache(input.selectedTopicSlugs);
    return;
  }

  const key = buildFeedCacheKey({
    tab: input.tab,
    entityFilter: input.entityFilter,
    searchQuery: input.searchQuery,
    savedSeedIds: input.tab === "saved" ? input.savedSeedIds : undefined,
    selectedTopicSlugs: input.selectedTopicSlugs,
  });

  if (getFeedCache(key) || warmedKeys.has(key) || inFlightFetches.has(key)) return;

  warmedKeys.add(key);

  void fetchInitialFeedPage(buildInitialFeedRequest(input))
    .then((data) => {
      if (data.items.length === 0) {
        warmedKeys.delete(key);
        return;
      }

      setFeedCache(key, {
        papers: data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        emptyMessage: null,
      });
    })
    .catch(() => {
      warmedKeys.delete(key);
    });
}
