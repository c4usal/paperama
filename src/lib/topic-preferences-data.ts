import type { TopicPreferences } from "@/types/feed";

/** Preselect filled topics so first visit has a scrollable For You feed. */
export const DEFAULT_TOPIC_PREFERENCES: TopicPreferences = {
  selectedTopicSlugs: [
    "plant-biology",
    "computer-science",
    "artificial-intelligence",
    "psychology",
    "philosophy",
  ],
};
