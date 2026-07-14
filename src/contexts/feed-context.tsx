"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  FeedEntityFilter,
  FeedNavTab,
  FeedToast,
  PaperEngagementState,
} from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

import {
  loadEngagement,
  loadSavedPapers,
  loadTopicPreferences,
  saveEngagement,
  saveSavedPapers,
  saveTopicPreferences,
  toSavedPaperSnapshot,
} from "@/lib/feed-storage";
import { markOnboardingComplete } from "@/lib/onboarding-storage";
import { getDomain } from "@/lib/topics";
import { warmForYouFeedCache } from "@/lib/feed/warm-feed-caches";
import { buildZoteroBibtex } from "@/lib/zotero-export";

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
  selectedTopicSlugs: string[];
  isTopicSelected: (slug: string) => boolean;
  toggleTopicSlug: (slug: string) => void;
  toggleDomain: (domainSlug: string) => void;
  domainSelectionState: (domainSlug: string) => "all" | "some" | "none";
  savedSeedIds: Set<string>;
  savedPapers: PaperFeedItem[];
  engagement: PaperEngagementState;
  isSaved: (paper: PaperFeedItem) => boolean;
  toggleSave: (paper: PaperFeedItem) => void;
  downvotePaper: (paper: PaperFeedItem) => void;
  sharePaper: (paper: PaperFeedItem) => Promise<void>;
  exportToZotero: (paper: PaperFeedItem) => Promise<void>;
  completeOnboarding: (topicSlugs: string[]) => void;
  toast: FeedToast | null;
  dismissToast: () => void;
};

const FeedContext = createContext<FeedContextValue | null>(null);

export function FeedProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<FeedNavTab>("for-you");
  const [entityFilter, setEntityFilter] = useState<FeedEntityFilter | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedTopicSlugs, setSelectedTopicSlugs] = useState<string[]>(() => {
    const loaded = loadTopicPreferences().selectedTopicSlugs;
    return loaded;
  });
  const [savedPapers, setSavedPapers] = useState<PaperFeedItem[]>(() => loadSavedPapers());
  const savedSeedIds = useMemo(
    () => new Set(savedPapers.map((paper) => paper.seedId)),
    [savedPapers],
  );
  const [engagement, setEngagement] = useState<PaperEngagementState>(() => {
    const loaded = loadEngagement();
    return {
      discussions: loaded.discussions ?? {},
      shares: loaded.shares ?? {},
      downvotes: loaded.downvotes ?? {},
    };
  });
  const [toast, setToast] = useState<FeedToast | null>(null);

  const selectedTopicsKey = useMemo(
    () => [...selectedTopicSlugs].sort().join(","),
    [selectedTopicSlugs],
  );

  useEffect(() => {
    if (!selectedTopicsKey) return;
    warmForYouFeedCache(selectedTopicsKey.split(","));
  }, [selectedTopicsKey]);

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

  const isTopicSelected = useCallback(
    (slug: string) => selectedTopicSlugs.includes(slug),
    [selectedTopicSlugs],
  );

  const toggleTopicSlug = useCallback(
    (slug: string) => {
      setSelectedTopicSlugs((current) => {
        const has = current.includes(slug);
        const next = has ? current.filter((item) => item !== slug) : [...current, slug];
        saveTopicPreferences({ selectedTopicSlugs: next });
        showToast(has ? "Topic removed from For You" : "Topic added to For You");
        return next;
      });
    },
    [showToast],
  );

  const toggleDomain = useCallback(
    (domainSlug: string) => {
      const domain = getDomain(domainSlug);
      if (!domain) return;

      setSelectedTopicSlugs((current) => {
        const allSelected = domain.topicSlugs.every((slug) => current.includes(slug));
        const next = allSelected
          ? current.filter((slug) => !domain.topicSlugs.includes(slug))
          : [...new Set([...current, ...domain.topicSlugs])];
        saveTopicPreferences({ selectedTopicSlugs: next });
        showToast(allSelected ? `${domain.label} hidden from For You` : `${domain.label} added to For You`);
        return next;
      });
    },
    [showToast],
  );

  const domainSelectionState = useCallback(
    (domainSlug: string): "all" | "some" | "none" => {
      const domain = getDomain(domainSlug);
      if (!domain) return "none";

      const selected = domain.topicSlugs.filter((slug) => selectedTopicSlugs.includes(slug));
      if (selected.length === 0) return "none";
      if (selected.length === domain.topicSlugs.length) return "all";
      return "some";
    },
    [selectedTopicSlugs],
  );

  const isSaved = useCallback(
    (paper: PaperFeedItem) => savedSeedIds.has(paper.seedId),
    [savedSeedIds],
  );

  const toggleSave = useCallback(
    (paper: PaperFeedItem) => {
      setSavedPapers((current) => {
        const exists = current.some((item) => item.seedId === paper.seedId);
        const next = exists
          ? current.filter((item) => item.seedId !== paper.seedId)
          : [toSavedPaperSnapshot(paper), ...current];
        saveSavedPapers(next);
        showToast(exists ? "Removed from Saved" : "Saved");
        return next;
      });
    },
    [showToast],
  );

  const downvotePaper = useCallback(
    (paper: PaperFeedItem) => {
      setEngagement((current) => {
        const next = {
          ...current,
          downvotes: {
            ...current.downvotes,
            [paper.seedId]: (current.downvotes[paper.seedId] ?? 0) + 1,
          },
        };
        saveEngagement(next);
        return next;
      });
      showToast("See less");
    },
    [showToast],
  );

  const exportToZotero = useCallback(
    async (paper: PaperFeedItem) => {
      await navigator.clipboard.writeText(buildZoteroBibtex(paper));
      showToast("BibTeX copied — paste into Zotero (Import from Clipboard)");
    },
    [showToast],
  );

  const completeOnboarding = useCallback((topicSlugs: string[]) => {
    const next = [...new Set(topicSlugs)];
    setSelectedTopicSlugs(next);
    saveTopicPreferences({ selectedTopicSlugs: next });
    markOnboardingComplete();
  }, []);

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
      selectedTopicSlugs,
      isTopicSelected,
      toggleTopicSlug,
      toggleDomain,
      domainSelectionState,
      savedSeedIds,
      savedPapers,
      engagement,
      isSaved,
      toggleSave,
      downvotePaper,
      sharePaper,
      exportToZotero,
      completeOnboarding,
      toast,
      dismissToast,
    }),
    [
      activeTab,
      setActiveTab,
      entityFilter,
      searchQuery,
      searchOpen,
      selectedTopicSlugs,
      isTopicSelected,
      toggleTopicSlug,
      toggleDomain,
      domainSelectionState,
      savedSeedIds,
      savedPapers,
      engagement,
      isSaved,
      toggleSave,
      downvotePaper,
      sharePaper,
      exportToZotero,
      completeOnboarding,
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
