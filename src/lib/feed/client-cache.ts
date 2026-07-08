import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

export type FeedClientCacheEntry = {
  papers: PaperFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  emptyMessage: string | null;
  updatedAt: number;
};

const feedCache = new Map<string, FeedClientCacheEntry>();
const feedPageCache = new Map<string, FeedClientCacheEntry>();
const prefetchInFlight = new Set<string>();

export function buildFeedPageCacheKey(feedKey: string, cursor: string): string {
  return `${feedKey}::page::${cursor}`;
}

export function getFeedPageCache(key: string): FeedClientCacheEntry | undefined {
  return feedPageCache.get(key);
}

export function setFeedPageCache(key: string, entry: Omit<FeedClientCacheEntry, "updatedAt">): void {
  feedPageCache.set(key, { ...entry, updatedAt: Date.now() });
}

export function isFeedPagePrefetchInFlight(key: string): boolean {
  return prefetchInFlight.has(key);
}

export function markFeedPagePrefetchInFlight(key: string): void {
  prefetchInFlight.add(key);
}

export function clearFeedPagePrefetchInFlight(key: string): void {
  prefetchInFlight.delete(key);
}

export function clearFeedPageCacheForFeed(feedKey: string): void {
  for (const key of feedPageCache.keys()) {
    if (key.startsWith(`${feedKey}::page::`)) {
      feedPageCache.delete(key);
    }
  }
  for (const key of prefetchInFlight) {
    if (key.startsWith(`${feedKey}::page::`)) {
      prefetchInFlight.delete(key);
    }
  }
}

export function buildFeedCacheKey(input: {
  tab: FeedNavTab;
  entityFilter?: FeedEntityFilter | null;
  searchQuery?: string;
  savedSeedIds?: string[];
  selectedTopicSlugs?: string[];
}): string {
  return [
    "v5",
    input.tab,
    input.entityFilter?.type ?? "none",
    input.entityFilter?.value ?? "",
    input.searchQuery?.trim() ?? "",
    input.tab === "saved" ? [...(input.savedSeedIds ?? [])].sort().join(",") : "",
    [...(input.selectedTopicSlugs ?? [])].sort().join(","),
  ].join("::");
}

export function getFeedCache(key: string): FeedClientCacheEntry | undefined {
  return feedCache.get(key);
}

export function setFeedCache(key: string, entry: Omit<FeedClientCacheEntry, "updatedAt">): void {
  feedCache.set(key, { ...entry, updatedAt: Date.now() });
}

export function clearFeedCache(key: string): void {
  feedCache.delete(key);
  clearFeedPageCacheForFeed(key);
}

export function updateFeedCache(
  key: string,
  updater: (current: FeedClientCacheEntry) => FeedClientCacheEntry,
): void {
  const current = feedCache.get(key);
  if (!current) return;
  feedCache.set(key, updater(current));
}
