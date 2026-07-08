import type { PaperEngagementState, TopicPreferences } from "@/types/feed";

import { isOnboardingComplete } from "@/lib/onboarding-storage";
import { DEFAULT_TOPIC_PREFERENCES } from "@/lib/topic-preferences-data";
import { getTopic } from "@/lib/topics";

const KEYS = {
  saved: "paperama:saved",
  /** Opt-in only — nothing selected until user clicks a substate. */
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

export function loadSavedSeedIds(): string[] {
  return readJson<string[]>(KEYS.saved, []);
}

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
  if (normalized.selectedTopicSlugs.length === 0 && isOnboardingComplete()) {
    return DEFAULT_TOPIC_PREFERENCES;
  }
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
