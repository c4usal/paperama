import type { OaSource, PaperType } from "@/types/paper";
import type { OpenAlexWork } from "@/lib/openalex/types";

/** Normalized card payload from OpenAlex (Group 1). */
export type FeedCard = {
  openAlexId: string;
  title: string;
  tldr: string;
  /** Display string, e.g. "Surname et al." */
  authors: string;
  /** Raw author names for feed item mapping. */
  authorNames: string[];
  journal: string;
  year: string;
  citationCount: number;
  matchLabel?: string;
  topicSlug?: string;
  oaUrl: string;
  oaSource: OaSource;
  heroImageUrl?: string;
  type: PaperType;
  abstract?: string;
};

export type FetchWorksResult = {
  cards: FeedCard[];
  works: OpenAlexWork[];
  nextCursor: string | null;
  meta: {
    count: number;
    perPage: number;
  };
};
