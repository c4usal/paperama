export type FeedNavTab = "for-you" | "saved" | "topics";

export type FeedEntityFilter =
  | { type: "researcher"; value: string }
  | { type: "journal"; value: string }
  | { type: "topic"; value: string };

export type TopicPreferences = {
  selectedTopicSlugs: string[];
};

/** @deprecated Legacy shape — migrated on load. */
export type FollowingState = {
  researchers: { id: string; name: string; hint: string }[];
  journals: { id: string; name: string }[];
  topics: string[];
};

export type PaperEngagementState = {
  discussions: Record<string, number>;
  shares: Record<string, number>;
  downvotes: Record<string, number>;
};

export type FeedToast = {
  id: number;
  message: string;
};
