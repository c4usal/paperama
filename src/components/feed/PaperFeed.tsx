"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchFeed, FeedApiError } from "@/lib/api/feed";
import { FeedEmptyState } from "@/components/feed/FeedEmptyState";
import { FeedLoadingState } from "@/components/feed/FeedLoadingState";
import { PaperFeedCard } from "@/components/feed/PaperFeedCard";
import { useFeed } from "@/contexts/feed-context";
import { getEmptyFeedMessage } from "@/lib/feed/messages";
import type { PaperFeedItem } from "@/types/paper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEED_LIMIT = 8;

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
  const { activeTab, entityFilter, searchQuery, savedSeedIds, following } = useFeed();
  const [papers, setPapers] = useState<PaperFeedItem[]>([]);
  const [status, setStatus] = useState<FeedStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reloadToken, setReloadToken] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLElement | null)[]>([]);
  const loadingMoreRef = useRef(false);

  const feedKey = useMemo(
    () =>
      [
        activeTab,
        entityFilter?.type ?? "none",
        entityFilter?.value ?? "",
        searchQuery.trim(),
        [...savedSeedIds].sort().join(","),
        following.researchers.map((r) => r.name).join("|"),
        following.journals.map((j) => j.name).join("|"),
        following.topics.join("|"),
        reloadToken,
      ].join("::"),
    [
      activeTab,
      entityFilter,
      following.journals,
      following.researchers,
      following.topics,
      reloadToken,
      savedSeedIds,
      searchQuery,
    ],
  );

  const feedRequest = useMemo(
    () => ({
      tab: activeTab,
      limit: FEED_LIMIT,
      searchQuery,
      entityFilter,
      savedIds: [...savedSeedIds],
      following,
    }),
    [activeTab, entityFilter, following, savedSeedIds, searchQuery],
  );

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    slideRefs.current[index]?.scrollIntoView({ behavior, block: "start" });
  }, []);

  const resetToTop = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: 0, behavior: "instant" });
      slideRefs.current[0]?.scrollIntoView({ behavior: "instant", block: "start" });
      setActiveIndex(0);
    });
  }, []);

  const loadInitial = useCallback(
    async (signal: AbortSignal) => {
      setStatus("loading");
      setErrorMessage(null);
      setPapers([]);
      setNextCursor(null);
      setHasMore(true);
      setEmptyMessage(null);

      const data = await fetchFeed({
        ...feedRequest,
        cursor: null,
        signal,
      });

      setPapers(data.items);
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
      setEmptyMessage(
        data.items.length === 0
          ? getEmptyFeedMessage({
              tab: activeTab,
              searchQuery,
              entityFilter,
            })
          : null,
      );
      setStatus("ready");
      resetToTop();
    },
    [activeTab, entityFilter, feedRequest, resetToTop, searchQuery],
  );

  useEffect(() => {
    const controller = new AbortController();

    void loadInitial(controller.signal).catch((error: unknown) => {
      if (controller.signal.aborted) return;

      setStatus("error");
      setErrorMessage(
        error instanceof FeedApiError
          ? error.message
          : "Something went wrong loading papers.",
      );
    });

    return () => controller.abort();
  }, [feedKey, loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMoreRef.current || !hasMore || !nextCursor || emptyMessage) return;

    loadingMoreRef.current = true;

    try {
      const data = await fetchFeed({
        ...feedRequest,
        cursor: nextCursor,
      });

      setPapers((current) => mergeUniquePapers(current, data.items));
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof FeedApiError
          ? error.message
          : "Unable to load more papers.",
      );
    } finally {
      loadingMoreRef.current = false;
    }
  }, [emptyMessage, feedRequest, hasMore, nextCursor]);

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

    if (hasMore && !loadingMoreRef.current) {
      void loadMore().then(() => {
        requestAnimationFrame(() => {
          scrollToIndex(nextIndex);
          setActiveIndex(nextIndex);
        });
      });
    }
  }, [activeIndex, hasMore, loadMore, papers.length, scrollToIndex]);

  const canScrollPrev = activeIndex > 0;
  const canScrollNext = activeIndex < papers.length - 1 || hasMore;

  useEffect(() => {
    onScrollStateChange?.({ canScrollPrev, canScrollNext });
  }, [canScrollNext, canScrollPrev, onScrollStateChange]);

  useEffect(() => {
    onScrollApiReady?.({ scrollToPrev, scrollToNext });
  }, [onScrollApiReady, scrollToNext, scrollToPrev]);

  useEffect(() => {
    if (status !== "ready" || emptyMessage || !hasMore || papers.length <= 1) return;
    if (activeIndex === papers.length - 1) {
      void loadMore();
    }
  }, [activeIndex, emptyMessage, hasMore, loadMore, papers.length, status]);

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
  }, [papers]);

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

  if (status === "loading") {
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
          key={paper.openAlexId}
          ref={(node) => {
            slideRefs.current[index] = node;
          }}
          data-feed-index={index}
          paper={paper}
          className={cn(slideClassName, "snap-start snap-always")}
        />
      ))}
    </div>
  );
}
