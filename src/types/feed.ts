export type FeedNavTab = "for-you" | "following" | "saved" | "topics";

export type FeedEntityFilter =
  | { type: "researcher"; value: string }
  | { type: "journal"; value: string }
  | { type: "topic"; value: string };

export type FollowingResearcher = {
  id: string;
  name: string;
  hint: string;
};

export type FollowingJournal = {
  id: string;
  name: string;
};

export type FollowingState = {
  researchers: FollowingResearcher[];
  journals: FollowingJournal[];
  topics: string[];
};

export type PaperEngagementState = {
  discussions: Record<string, number>;
  shares: Record<string, number>;
};

export type FeedToast = {
  id: number;
  message: string;
};
