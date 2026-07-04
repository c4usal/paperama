import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";

export function getEmptyFeedMessage(options: {
  tab: FeedNavTab;
  searchQuery?: string;
  entityFilter?: FeedEntityFilter | null;
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
      return "You haven't saved any papers yet. Tap Save on a paper to add it here.";
    case "following":
      return "No papers from researchers, journals, or topics you follow.";
    case "topics":
      return "Follow topics from the sidebar to populate this feed.";
    default:
      return "No open-access papers to show right now. Try again in a moment.";
  }
}
