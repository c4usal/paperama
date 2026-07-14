import type { PaperEngagementState, TopicPreferences } from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

import { DEFAULT_TOPIC_PREFERENCES } from "@/lib/topic-preferences-data";
import { getTopic } from "@/lib/topics";

const KEYS = {
  /** Legacy: openAlex / seed ids only. */
  saved: "paperama:saved",
  /** Full liked paper snapshots for the Saved tab. */
  savedPapers: "paperama:saved-papers-v1",
  selectedTopics: "paperama:selected-topics-v3",
  engagement: "paperama:engagement",
} as const;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeTopicPreferences(raw: unknown): TopicPreferences {
  if (
    raw &&
    typeof raw === "object" &&
    "selectedTopicSlugs" in raw &&
    Array.isArray((raw as TopicPreferences).selectedTopicSlugs)
  ) {
    const slugs = (raw as TopicPreferences).selectedTopicSlugs.filter(
      (slug): slug is string => typeof slug === "string" && Boolean(getTopic(slug)),
    );
    return { selectedTopicSlugs: slugs };
  }

  return DEFAULT_TOPIC_PREFERENCES;
}

function isPaperFeedItem(value: unknown): value is PaperFeedItem {
  if (!value || typeof value !== "object") return false;
  const paper = value as Partial<PaperFeedItem>;
  return (
    typeof paper.seedId === "string" &&
    typeof paper.openAlexId === "string" &&
    typeof paper.title === "string" &&
    typeof paper.oaUrl === "string" &&
    typeof paper.tldr === "string"
  );
}

/** Snapshot used for Saved tab — identity stays stable across feed cycles. */
export function toSavedPaperSnapshot(paper: PaperFeedItem): PaperFeedItem {
  return {
    ...paper,
    id: paper.seedId,
  };
}

export function loadSavedPapers(): PaperFeedItem[] {
  const stored = readJson<unknown>(KEYS.savedPapers, null);
  if (Array.isArray(stored)) {
    const papers = stored.filter(isPaperFeedItem).map(toSavedPaperSnapshot);
    if (papers.length > 0) return papers;
  }

  // Legacy id-only saves cannot rebuild cards without a network fetch.
  return [];
}

export function saveSavedPapers(papers: PaperFeedItem[]) {
  const snapshots = papers.map(toSavedPaperSnapshot);
  writeJson(KEYS.savedPapers, snapshots);
  // Keep legacy id list in sync for any older readers.
  writeJson(
    KEYS.saved,
    snapshots.map((paper) => paper.seedId),
  );
}

/** @deprecated Prefer loadSavedPapers — kept for migration helpers. */
export function loadSavedSeedIds(): string[] {
  const papers = loadSavedPapers();
  if (papers.length > 0) return papers.map((paper) => paper.seedId);
  return readJson<string[]>(KEYS.saved, []);
}

/** @deprecated Prefer saveSavedPapers. */
export function saveSavedSeedIds(ids: string[]) {
  writeJson(KEYS.saved, ids);
}

export function hasStoredTopicPreferences(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEYS.selectedTopics) !== null;
}

export function loadTopicPreferences(): TopicPreferences {
  const stored = readJson<unknown>(KEYS.selectedTopics, null);
  if (!stored) {
    return { selectedTopicSlugs: [] };
  }

  const normalized = normalizeTopicPreferences(stored);
  return normalized;
}

export function saveTopicPreferences(preferences: TopicPreferences) {
  writeJson(KEYS.selectedTopics, normalizeTopicPreferences(preferences));
}

export function clearTopicPreferences(): void {
  if (typeof window === "undefined") return;
  writeJson(KEYS.selectedTopics, DEFAULT_TOPIC_PREFERENCES);
}

export function loadEngagement(): PaperEngagementState {
  return readJson<PaperEngagementState>(KEYS.engagement, {
    discussions: {},
    shares: {},
    downvotes: {},
  });
}

export function saveEngagement(engagement: PaperEngagementState) {
  writeJson(KEYS.engagement, engagement);
}
