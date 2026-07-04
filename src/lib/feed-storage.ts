import type { FollowingState, PaperEngagementState } from "@/types/feed";

import { DEFAULT_FOLLOWING } from "@/lib/following-data";

const KEYS = {
  saved: "paperama:saved",
  following: "paperama:following",
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

export function loadSavedSeedIds(): string[] {
  return readJson<string[]>(KEYS.saved, []);
}

export function saveSavedSeedIds(ids: string[]) {
  writeJson(KEYS.saved, ids);
}

export function loadFollowing(): FollowingState {
  return readJson(KEYS.following, DEFAULT_FOLLOWING);
}

export function saveFollowing(following: FollowingState) {
  writeJson(KEYS.following, following);
}

export function loadEngagement(): PaperEngagementState {
  return readJson<PaperEngagementState>(KEYS.engagement, {
    discussions: {},
    shares: {},
  });
}

export function saveEngagement(engagement: PaperEngagementState) {
  writeJson(KEYS.engagement, engagement);
}
