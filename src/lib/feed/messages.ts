import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";

export const NO_TOPICS_SELECTED_EMPTY = {
  title: "Choose your topics first",
  message:
    "Your For You feed is empty because no topics are selected. Pick at least one area you're interested in and we'll start showing papers.",
  actionLabel: "Choose topics",
} as const;

export function isNoTopicsSelectedForFeed(
  tab: FeedNavTab,
  selectedTopicSlugs?: string[],
): boolean {
  return tab === "for-you" && selectedTopicSlugs !== undefined && selectedTopicSlugs.length === 0;
}

export function getEmptyFeedMessage(options: {
  tab: FeedNavTab;
  searchQuery?: string;
  entityFilter?: FeedEntityFilter | null;
  selectedTopicSlugs?: string[];
}): string {
  const { tab, searchQuery, entityFilter } = options;

  if (searchQuery?.trim()) {
    return `No papers found for "${searchQuery.trim()}".`;
  }

  if (entityFilter?.type === "topic") {
    return `No papers found for topic "${entityFilter.value}".`;
  }

  if (entityFilter?.type === "researcher") {
    return `No papers found from ${entityFilter.value}.`;
  }

  if (entityFilter?.type === "journal") {
    return `No papers found in ${entityFilter.value}.`;
  }

  switch (tab) {
    case "saved":
      return "No saved papers yet. Tap the thumbs-up on a paper in For You to keep it here.";
    case "topics":
      return "Select at least one topic to see papers in For You.";
    default:
      if (isNoTopicsSelectedForFeed(tab, options.selectedTopicSlugs)) {
        return NO_TOPICS_SELECTED_EMPTY.message;
      }
      return "No open-access papers to show right now. Try again in a moment.";
  }
}
