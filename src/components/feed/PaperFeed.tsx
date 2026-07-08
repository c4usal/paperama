"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { fetchFeed, FeedApiError } from "@/lib/api/feed";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { FeedLoadMoreSlide } from "@/components/feed/FeedLoadMoreSlide";
import { FeedLoadingState } from "@/components/feed/FeedLoadingState";
import { PaperFeedCard } from "@/components/feed/PaperFeedCard";
import { useFeed } from "@/contexts/feed-context";
import {
  buildFeedCacheKey,
  buildFeedPageCacheKey,
  clearFeedCache,
  getFeedCache,
  getFeedPageCache,
  setFeedCache,
  setFeedPageCache,
} from "@/lib/feed/client-cache";
import { getEmptyFeedMessage } from "@/lib/feed/messages";
import {
  FEED_BUFFER_TARGET,
  FEED_PAGE_LIMIT,
  fetchInitialFeedPage,
  getInFlightFeedFetch,
  getInFlightFeedStack,
  prefetchFeedPageChain,
} from "@/lib/feed/warm-feed-caches";
import type { PaperFeedItem } from "@/types/paper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const BUFFER_AHEAD_TARGET = FEED_BUFFER_TARGET;
/** Prefetch when this many cards remain ahead — keep the feed continuous. */
const MIN_AHEAD_TO_EXPAND = 18;
const MAX_EXPAND_ROUNDS = 10;
/** Show the end-of-feed loader when this close to the last loaded card. */
const NEAR_END_CARD_THRESHOLD = 2;
/** Avoid loading flash when index responds in a few hundred ms. */
const LOADING_SPINNER_DELAY_MS = 400;

type FeedStatus = "loading" | "ready" | "error";

type PaperFeedProps = {
  className?: string;
  slideClassName?: string;
  onScrollStateChange?: (state: {
    canScrollPrev: boolean;
    canScrollNext: boolean;
  }) => void;
  onScrollApiReady?: (api: { scrollToPrev: () => void; scrollToNext: () => void }) => void;
};

function mergeUniquePapers(current: PaperFeedItem[], incoming: PaperFeedItem[]) {
  const seen = new Set(current.map((paper) => paper.openAlexId));
  const next = [...current];

  for (const paper of incoming) {
    if (seen.has(paper.openAlexId)) continue;
    seen.add(paper.openAlexId);
    next.push(paper);
  }

  return next;
}

export function PaperFeed({
  className,
  slideClassName,
  onScrollStateChange,
  onScrollApiReady,
}: PaperFeedProps) {
  const { activeTab, entityFilter, searchQuery, savedSeedIds, selectedTopicSlugs } = useFeed();
  const [papers, setPapers] = useState<PaperFeedItem[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const [showInitialSpinner, setShowInitialSpinner] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const loadingMoreRef = useRef(false);
  const pendingScrollIndexRef = useRef<number | null>(null);
  const papersRef = useRef(papers);
  const activeIndexRef = useRef(activeIndex);
  const hasMoreRef = useRef(hasMore);
  const nextCursorRef = useRef<string | null>(null);
  const emptyMessageRef = useRef<string | null>(null);
  const cacheKeyRef = useRef("");
  const initialLoadDoneRef = useRef(false);
  const feedRequestInFlightRef = useRef(false);
  const expandingBufferRef = useRef(false);

  const savedIdsKey =
    activeTab === "saved" ? [...savedSeedIds].sort().join(",") : "";

  const selectedTopicsKey = useMemo(
    () => [...selectedTopicSlugs].sort().join(","),
    [selectedTopicSlugs],
  );

  const cacheKey = useMemo(
    () =>
      buildFeedCacheKey({
        tab: activeTab,
        entityFilter,
        searchQuery,
        savedSeedIds: activeTab === "saved" ? [...savedSeedIds] : undefined,
        selectedTopicSlugs: selectedTopicsKey ? selectedTopicsKey.split(",") : [],
      }),
    [activeTab, entityFilter, savedIdsKey, searchQuery, selectedTopicsKey],
  );

  const feedRequest = useMemo(
    () => ({
      tab: activeTab,
      limit: FEED_PAGE_LIMIT,
      searchQuery,
      entityFilter,
      selectedTopicSlugs: selectedTopicsKey ? selectedTopicsKey.split(",") : [],
      ...(activeTab === "saved" ? { savedIds: [...savedSeedIds] } : {}),
    }),
    [activeTab, entityFilter, savedIdsKey, searchQuery, selectedTopicsKey],
  );

  const feedRequestRef = useRef(feedRequest);
  const savedSeedIdsRef = useRef(savedSeedIds);

  useEffect(() => {
    cacheKeyRef.current = cacheKey;
  }, [cacheKey]);

  useEffect(() => {
    papersRef.current = papers;
  }, [papers]);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  useEffect(() => {
    emptyMessageRef.current = emptyMessage;
  }, [emptyMessage]);

  useEffect(() => {
    feedRequestRef.current = feedRequest;
  }, [feedRequest]);

  useEffect(() => {
    savedSeedIdsRef.current = savedSeedIds;
  }, [savedSeedIds]);

  const persistCache = useCallback(
    (
      nextPapers: PaperFeedItem[],
      cursor: string | null,
      more: boolean,
      empty: string | null,
    ) => {
      setFeedCache(cacheKeyRef.current, {
        papers: nextPapers,
        nextCursor: cursor,
        hasMore: more,
        emptyMessage: empty,
      });
    },
    [],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    slideRefs.current[index]?.scrollIntoView({ behavior, block: "start" });
  }, []);

  const applyFeedPage = useCallback(
    (
      incoming: PaperFeedItem[],
      cursor: string | null,
      more: boolean,
      options: { append: boolean; empty: string | null },
    ) => {
      const merged = options.append
        ? mergeUniquePapers(papersRef.current, incoming)
        : incoming;

      papersRef.current = merged;
      nextCursorRef.current = cursor;
      hasMoreRef.current = more;
      emptyMessageRef.current = options.empty;

      setPapers(merged);
      setNextCursor(cursor);
      setHasMore(more);
      setEmptyMessage(options.empty);
      persistCache(merged, cursor, more, options.empty);
    },
    [persistCache],
  );

  const applyFeedPageRef = useRef(applyFeedPage);
  applyFeedPageRef.current = applyFeedPage;

  const schedulePagePrefetch = useCallback((cursor: string | null) => {
    if (!cursor || !hasMoreRef.current) return;

    prefetchFeedPageChain(
      cacheKeyRef.current,
      {
        ...feedRequestRef.current,
        limit: FEED_PAGE_LIMIT,
        cursor,
        ...(feedRequestRef.current.tab === "for-you"
          ? { savedIds: [...savedSeedIdsRef.current] }
          : {}),
      },
      4,
    );
  }, []);

  const schedulePagePrefetchRef = useRef(schedulePagePrefetch);
  schedulePagePrefetchRef.current = schedulePagePrefetch;

  const resetToTop = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      slideRefs.current[0]?.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveIndex(0);
      pendingScrollIndexRef.current = null;
    });
  }, []);

  const resetToTopRef = useRef(resetToTop);
  resetToTopRef.current = resetToTop;

  const drainPrefetchedPages = useCallback((): number => {
    let added = 0;

    while (hasMoreRef.current && nextCursorRef.current) {
      const pageKey = buildFeedPageCacheKey(cacheKeyRef.current, nextCursorRef.current);
      const cachedPage = getFeedPageCache(pageKey);
      if (!cachedPage) break;

      applyFeedPage(cachedPage.papers, cachedPage.nextCursor, cachedPage.hasMore, {
        append: true,
        empty: emptyMessageRef.current,
      });
      added += cachedPage.papers.length;
      schedulePagePrefetchRef.current(cachedPage.nextCursor);
    }

    return added;
  }, [applyFeedPage]);

  const drainPrefetchedPagesRef = useRef(drainPrefetchedPages);
  drainPrefetchedPagesRef.current = drainPrefetchedPages;

  const fetchNextPage = useCallback(async (): Promise<number> => {
    const cursor = nextCursorRef.current;
    if (!cursor || !hasMoreRef.current || emptyMessageRef.current) return 0;

    const pageKey = buildFeedPageCacheKey(cacheKeyRef.current, cursor);
    const cachedPage = getFeedPageCache(pageKey);
    if (cachedPage) {
      applyFeedPage(cachedPage.papers, cachedPage.nextCursor, cachedPage.hasMore, {
        append: true,
        empty: emptyMessageRef.current,
      });
      schedulePagePrefetchRef.current(cachedPage.nextCursor);
      return cachedPage.papers.length;
    }

    const baseRequest = feedRequestRef.current;
    const data = await fetchFeed({
      ...baseRequest,
      limit: FEED_PAGE_LIMIT,
      cursor,
      ...(baseRequest.tab === "for-you"
        ? { savedIds: [...savedSeedIdsRef.current] }
        : {}),
    });

    if (data.items.length > 0) {
      setFeedPageCache(pageKey, {
        papers: data.items,
        nextCursor: data.nextCursor,
        hasMore: data.hasMore,
        emptyMessage: null,
      });
    }

    applyFeedPage(data.items, data.nextCursor, data.hasMore, {
      append: true,
      empty: emptyMessageRef.current,
    });

    schedulePagePrefetchRef.current(data.nextCursor);
    return data.items.length;
  }, [applyFeedPage]);

  const expandBufferAhead = useCallback(async () => {
    if (!initialLoadDoneRef.current) return;
    if (emptyMessageRef.current || expandingBufferRef.current) return;

    expandingBufferRef.current = true;
    setIsBuffering(true);

    try {
      drainPrefetchedPagesRef.current();

      for (let round = 0; round < MAX_EXPAND_ROUNDS; round += 1) {
        const ahead = papersRef.current.length - 1 - activeIndexRef.current;
        if (ahead >= BUFFER_AHEAD_TARGET) break;
        if (!hasMoreRef.current || !nextCursorRef.current) break;

        const pageKey = buildFeedPageCacheKey(cacheKeyRef.current, nextCursorRef.current);
        if (getFeedPageCache(pageKey)) {
          drainPrefetchedPagesRef.current();
          continue;
        }

        try {
          const added = await fetchNextPage();
          if (added === 0) break;
          drainPrefetchedPagesRef.current();
        } catch {
          break;
        }
      }
    } finally {
      expandingBufferRef.current = false;
      setIsBuffering(false);
    }
  }, [fetchNextPage]);

  const expandBufferAheadRef = useRef(expandBufferAhead);
  expandBufferAheadRef.current = expandBufferAhead;

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current || !nextCursorRef.current) return;
    if (emptyMessageRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      await fetchNextPage();
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof FeedApiError
          ? error.message
          : "Unable to load more papers.",
      );
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchNextPage]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const applyCachedEntry = useCallback(
    (cached: NonNullable<ReturnType<typeof getFeedCache>>) => {
      papersRef.current = cached.papers;
      nextCursorRef.current = cached.nextCursor;
      hasMoreRef.current = cached.hasMore;
      emptyMessageRef.current = cached.emptyMessage;

      setPapers(cached.papers);
      setNextCursor(cached.nextCursor);
      setHasMore(cached.hasMore);
      setEmptyMessage(cached.emptyMessage);
      setStatus("ready");
      initialLoadDoneRef.current = true;
    },
    [],
  );

  const applyCachedEntryRef = useRef(applyCachedEntry);
  applyCachedEntryRef.current = applyCachedEntry;

  const kickoffBufferExpansion = useCallback(() => {
    // Prefetch into page cache only — do not merge into the visible list yet.
    // Merging dozens of cards on first paint fights snap scrolling.
    schedulePagePrefetchRef.current(nextCursorRef.current);
  }, []);

  const kickoffBufferExpansionRef = useRef(kickoffBufferExpansion);
  kickoffBufferExpansionRef.current = kickoffBufferExpansion;

  useLayoutEffect(() => {
    const cached = getFeedCache(cacheKey);
    if (cached?.papers.length) {
      applyCachedEntryRef.current(cached);
    }
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;
    if (!getFeedCache(cacheKey)?.papers.length) {
      initialLoadDoneRef.current = false;
    }

    async function run() {
      const cached = getFeedCache(cacheKey);
      if (cached?.papers.length) {
        applyCachedEntryRef.current(cached);
        resetToTopRef.current();
        if (!cancelled) kickoffBufferExpansionRef.current();
        return;
      }

      const inFlightStack = getInFlightFeedStack(cacheKey);
      if (inFlightStack) {
        await inFlightStack;
        if (cancelled) return;
        const stacked = getFeedCache(cacheKey);
        if (stacked?.papers.length) {
          applyCachedEntryRef.current(stacked);
          resetToTopRef.current();
          kickoffBufferExpansionRef.current();
          return;
        }
      }

      const inFlightFetch = getInFlightFeedFetch(cacheKey);
      if (inFlightFetch) {
        try {
          const data = await inFlightFetch;
          if (cancelled) return;
          if (data.items.length > 0) {
            applyFeedPageRef.current(data.items, data.nextCursor, data.hasMore, {
              append: false,
              empty: null,
            });
            setStatus("ready");
            initialLoadDoneRef.current = true;
            resetToTopRef.current();
            kickoffBufferExpansionRef.current();
            return;
          }
        } catch {
          // fall through to fresh fetch
        }
      }

      const hadPapers = papersRef.current.length > 0;
      if (!hadPapers) {
        setStatus("loading");
        setPapers([]);
      }
      setErrorMessage(null);
      setNextCursor(null);
      setHasMore(true);
      setLoadingMore(false);
      setEmptyMessage(null);

      if (
        feedRequestRef.current.tab === "for-you" &&
        feedRequestRef.current.selectedTopicSlugs?.length === 0
      ) {
        const empty = getEmptyFeedMessage({
          tab: "for-you",
          selectedTopicSlugs: [],
        });
        applyFeedPageRef.current([], null, false, { append: false, empty });
        setStatus("ready");
        initialLoadDoneRef.current = true;
        return;
      }

      try {
        feedRequestInFlightRef.current = true;
        const data = await fetchInitialFeedPage({
          ...feedRequestRef.current,
          cursor: null,
        });

        if (cancelled) return;

        const empty =
          data.items.length === 0
            ? getEmptyFeedMessage({
                tab: feedRequestRef.current.tab,
                searchQuery: feedRequestRef.current.searchQuery,
                entityFilter: feedRequestRef.current.entityFilter,
                selectedTopicSlugs: feedRequestRef.current.selectedTopicSlugs,
              })
            : null;

        applyFeedPageRef.current(data.items, data.nextCursor, data.hasMore, {
          append: false,
          empty,
        });
        setStatus("ready");
        initialLoadDoneRef.current = true;
        resetToTopRef.current();
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof FeedApiError
            ? error.message
            : "Something went wrong loading papers.",
        );
      } finally {
        feedRequestInFlightRef.current = false;
        if (!cancelled) kickoffBufferExpansionRef.current();
      }
    }

    if (reloadToken > 0) {
      clearFeedCache(cacheKey);
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, reloadToken]);

  const handleHeroUnavailable = useCallback((_openAlexId: string) => {
    // Keep the card visible with a placeholder. Removing cards on image errors
    // was emptying the feed and blocking scroll entirely.
  }, []);

  const scrollToPrev = useCallback(() => {
    const nextIndex = Math.max(0, activeIndex - 1);
    scrollToIndex(nextIndex);
    setActiveIndex(nextIndex);
  }, [activeIndex, scrollToIndex]);

  const scrollToNext = useCallback(() => {
    const nextIndex = activeIndex + 1;
    if (nextIndex < papers.length) {
      scrollToIndex(nextIndex);
      setActiveIndex(nextIndex);
      return;
    }

    if (hasMore && !loadingMoreRef.current && !expandingBufferRef.current) {
      pendingScrollIndexRef.current = nextIndex;
      void expandBufferAheadRef.current().then(() => {
        requestAnimationFrame(() => {
          if (slideRefs.current[nextIndex]) {
            scrollToIndex(nextIndex);
            setActiveIndex(nextIndex);
            pendingScrollIndexRef.current = null;
          }
        });
      });
    }
  }, [activeIndex, hasMore, papers.length, scrollToIndex]);

  const canScrollPrev = activeIndex > 0;
  const canScrollNext = activeIndex < papers.length - 1 || hasMore || loadingMore || isBuffering;
  const nearFeedEnd =
    papers.length > 0 && activeIndex >= Math.max(0, papers.length - NEAR_END_CARD_THRESHOLD);
  const showEndLoader = nearFeedEnd && hasMore && (loadingMore || isBuffering);

  useEffect(() => {
    if (status !== "ready" || !initialLoadDoneRef.current) return;
    if (emptyMessage || !hasMore || !nextCursor) return;

    const ahead = papers.length - 1 - activeIndex;
    // Drain/merge only once the user is several cards into the feed,
    // so first-card swipe stays responsive.
    if (activeIndex >= 1 && ahead < MIN_AHEAD_TO_EXPAND) {
      void expandBufferAhead();
    } else if (ahead < MIN_AHEAD_TO_EXPAND) {
      schedulePagePrefetchRef.current(nextCursor);
    }
  }, [
    activeIndex,
    emptyMessage,
    expandBufferAhead,
    hasMore,
    nextCursor,
    papers.length,
    status,
  ]);

  useEffect(() => {
    onScrollStateChange?.({ canScrollPrev, canScrollNext });
  }, [canScrollNext, canScrollPrev, onScrollStateChange]);

  useEffect(() => {
    onScrollApiReady?.({ scrollToPrev, scrollToNext });
  }, [onScrollApiReady, scrollToNext, scrollToPrev]);

  useEffect(() => {
    const pendingIndex = pendingScrollIndexRef.current;
    if (pendingIndex === null || pendingIndex >= papers.length) return;

    requestAnimationFrame(() => {
      if (!slideRefs.current[pendingIndex]) return;
      scrollToIndex(pendingIndex);
      setActiveIndex(pendingIndex);
      pendingScrollIndexRef.current = null;
    });
  }, [papers.length, scrollToIndex]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root || papers.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;

        const index = Number(visible.target.getAttribute("data-feed-index"));
        if (!Number.isNaN(index)) setActiveIndex(index);
      },
      { root, threshold: [0.6] },
    );

    slideRefs.current.forEach((slide) => {
      if (slide) observer.observe(slide);
    });

    return () => observer.disconnect();
  }, [papers, loadingMore, isBuffering]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (["Home", "End", "PageUp", "PageDown"].includes(event.key)) {
        event.preventDefault();
      }
    }

    root.addEventListener("keydown", handleKeyDown);
    return () => root.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (status !== "loading" || papers.length > 0) {
      setShowInitialSpinner(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowInitialSpinner(true);
    }, LOADING_SPINNER_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [papers.length, status]);

  if (showInitialSpinner && status === "loading" && papers.length === 0) {
    return (
      <FeedLoadingState
        className={cn("min-h-0 flex-1", className)}
        slideClassName={slideClassName}
      />
    );
  }

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center",
          className,
          slideClassName,
        )}
      >
        <p className="text-sm text-muted-foreground">{errorMessage}</p>
        <Button type="button" onClick={() => setReloadToken((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  if (emptyMessage) {
    return (
      <div className={cn("min-h-0 flex-1", className, slideClassName)}>
        <FeedEmptyState message={emptyMessage} />
      </div>
    );
  }

  if (papers.length === 0) {
    return (
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center",
          className,
          slideClassName,
        )}
      >
        <p className="text-sm text-muted-foreground">No papers with figures right now.</p>
        <Button type="button" onClick={() => setReloadToken((value) => value + 1)}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      tabIndex={-1}
      className={cn(
        "snap-y snap-mandatory overflow-y-auto overscroll-y-contain scroll-smooth outline-none",
        className,
      )}
    >
      {papers.map((paper, index) => (
        <PaperFeedCard
          key={`${paper.openAlexId}-${index}`}
          ref={(node) => {
            slideRefs.current[index] = node;
          }}
          data-feed-index={index}
          paper={paper}
          onHeroUnavailable={handleHeroUnavailable}
          className={cn(slideClassName, "snap-start snap-always")}
        />
      ))}
      {showEndLoader ? <FeedLoadMoreSlide className={slideClassName} /> : null}
    </div>
  );
}
