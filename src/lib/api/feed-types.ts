import type { FeedEntityFilter, FeedNavTab, FollowingState } from "@/types/feed";
import type { PaperFeedItem } from "@/types/paper";

export type FeedApiResponse = {
  items: PaperFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type FeedApiRequest = {
  tab: FeedNavTab;
  cursor?: string | null;
  limit?: number;
  fields?: string[];
  searchQuery?: string;
  entityFilter?: FeedEntityFilter | null;
  savedIds?: string[];
  following?: FollowingState;
  signal?: AbortSignal;
};
