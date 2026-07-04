"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  FeedEntityFilter,
  FeedNavTab,
  FeedToast,
  FollowingState,
  PaperEngagementState,
} from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

import {
  loadEngagement,
  loadFollowing,
  loadSavedSeedIds,
  saveEngagement,
  saveFollowing,
  saveSavedSeedIds,
} from "@/lib/feed-storage";

type FeedContextValue = {
  activeTab: FeedNavTab;
  setActiveTab: (tab: FeedNavTab) => void;
  entityFilter: FeedEntityFilter | null;
  setEntityFilter: (filter: FeedEntityFilter | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchOpen: boolean;
  openSearch: () => void;
  closeSearch: () => void;
  addTopicOpen: boolean;
  openAddTopic: () => void;
  closeAddTopic: () => void;
  following: FollowingState;
  savedSeedIds: Set<string>;
  engagement: PaperEngagementState;
  isSaved: (paper: PaperFeedItem) => boolean;
  toggleSave: (paper: PaperFeedItem) => void;
  discussPaper: (paper: PaperFeedItem) => void;
  sharePaper: (paper: PaperFeedItem) => Promise<void>;
  addTopic: (topic: string) => void;
  followEntity: (filter: FeedEntityFilter) => void;
  getSaveCount: (paper: PaperFeedItem) => number;
  getDiscussCount: (paper: PaperFeedItem) => number;
  getShareCount: (paper: PaperFeedItem) => number;
  toast: FeedToast | null;
  dismissToast: () => void;
};

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<FeedNavTab>("for-you");
  const [entityFilter, setEntityFilter] = useState<FeedEntityFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [following, setFollowing] = useState<FollowingState>(loadFollowing);
  const [savedSeedIds, setSavedSeedIds] = useState<Set<string>>(
    () => new Set(loadSavedSeedIds()),
  );
  const [engagement, setEngagement] = useState<PaperEngagementState>(loadEngagement);
  const [toast, setToast] = useState<FeedToast | null>(null);

  const setActiveTab = useCallback((tab: FeedNavTab) => {
    setActiveTabState(tab);
    setEntityFilter(null);
  }, []);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ id, message });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 2800);
  }, []);

  const dismissToast = useCallback(() => setToast(null), []);

  const isSaved = useCallback(
    (paper: PaperFeedItem) => savedSeedIds.has(paper.seedId),
    [savedSeedIds],
  );

  const toggleSave = useCallback(
    (paper: PaperFeedItem) => {
      setSavedSeedIds((current) => {
        const next = new Set(current);
        if (next.has(paper.seedId)) {
          next.delete(paper.seedId);
          showToast("Removed from Saved");
        } else {
          next.add(paper.seedId);
          showToast("Saved to your library");
        }
        saveSavedSeedIds([...next]);
        return next;
      });
    },
    [showToast],
  );

  const discussPaper = useCallback(
    (paper: PaperFeedItem) => {
      setEngagement((current) => {
        const next = {
          ...current,
          discussions: {
            ...current.discussions,
            [paper.seedId]: (current.discussions[paper.seedId] ?? 0) + 1,
          },
        };
        saveEngagement(next);
        return next;
      });
      showToast("Discussion coming soon");
    },
    [showToast],
  );

  const sharePaper = useCallback(
    async (paper: PaperFeedItem) => {
      const url = paper.oaUrl;

      setEngagement((current) => {
        const next = {
          ...current,
          shares: {
            ...current.shares,
            [paper.seedId]: (current.shares[paper.seedId] ?? 0) + 1,
          },
        };
        saveEngagement(next);
        return next;
      });

      try {
        if (navigator.share) {
          await navigator.share({
            title: paper.title,
            text: paper.tldr,
            url,
          });
          showToast("Paper shared");
          return;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }

      await navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard");
    },
    [showToast],
  );

  const addTopic = useCallback(
    (topic: string) => {
      const normalized = topic.trim().toLowerCase();
      if (!normalized) return;

      setFollowing((current) => {
        if (current.topics.some((item) => item.toLowerCase() === normalized)) {
          showToast("You're already following that topic");
          return current;
        }

        const next = {
          ...current,
          topics: [...current.topics, topic.trim()],
        };
        saveFollowing(next);
        showToast(`Now following "${topic.trim()}"`);
        return next;
      });
      setAddTopicOpen(false);
      setActiveTabState("topics");
      setEntityFilter({ type: "topic", value: topic.trim() });
    },
    [showToast],
  );

  const followEntity = useCallback((filter: FeedEntityFilter) => {
    setEntityFilter(filter);
    setActiveTabState(filter.type === "topic" ? "topics" : "following");
  }, []);

  const getSaveCount = useCallback(
    (paper: PaperFeedItem) => paper.saveCount ?? 0,
    [],
  );

  const getDiscussCount = useCallback(
    (paper: PaperFeedItem) =>
      (paper.socialProofCount ?? 0) + (engagement.discussions[paper.seedId] ?? 0),
    [engagement.discussions],
  );

  const getShareCount = useCallback(
    (paper: PaperFeedItem) =>
      (paper.shareCount ?? 0) + (engagement.shares[paper.seedId] ?? 0),
    [engagement.shares],
  );

  const value = useMemo<FeedContextValue>(
    () => ({
      activeTab,
      setActiveTab,
      entityFilter,
      setEntityFilter,
      searchQuery,
      setSearchQuery,
      searchOpen,
      openSearch: () => setSearchOpen(true),
      closeSearch: () => setSearchOpen(false),
      addTopicOpen,
      openAddTopic: () => setAddTopicOpen(true),
      closeAddTopic: () => setAddTopicOpen(false),
      following,
      savedSeedIds,
      engagement,
      isSaved,
      toggleSave,
      discussPaper,
      sharePaper,
      addTopic,
      followEntity,
      getSaveCount,
      getDiscussCount,
      getShareCount,
      toast,
      dismissToast,
    }),
    [
      activeTab,
      setActiveTab,
      entityFilter,
      searchQuery,
      searchOpen,
      addTopicOpen,
      following,
      savedSeedIds,
      engagement,
      isSaved,
      toggleSave,
      discussPaper,
      sharePaper,
      addTopic,
      followEntity,
      getSaveCount,
      getDiscussCount,
      getShareCount,
      toast,
      dismissToast,
    ],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
}

export function useFeed() {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error("useFeed must be used within FeedProvider");
  }
  return context;
}
