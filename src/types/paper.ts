export type PaperType = "article" | "preprint" | "conference" | "review";

export type OaSource = "arxiv" | "pmc" | "repository";

export type PaperAuthor = {
  name: string;
  avatarUrl?: string;
};

export type PaperJournal = {
  name: string;
  logoUrl?: string;
};

export type PaperFeedItem = {
  /** Runtime instance id (feed pagination). */
  id: string;
  /** Stable seed key for saves and signals. */
  seedId: string;
  /** OpenAlex work id, e.g. W2741809807. */
  openAlexId: string;
  title: string;
  type: PaperType;
  publishedAt: string;
  reads: number;
  saveCount?: number;
  shareCount?: number;
  citationCount: number;
  journal: PaperJournal;
  authors: PaperAuthor[];
  /** Single hero image for the card. */
  heroImageUrl?: string;
  socialProofCount?: number;
  /** Open-access landing page — Read opens this in a new tab. */
  oaUrl: string;
  oaSource: OaSource;
  /** Topic label for match tag and ranker (internal). */
  interestLabel?: string;
  /** Topic slug for placeholder styling when no hero image. */
  topicSlug?: string;
  /** Full abstract — search and reader redirect context only. */
  abstract?: string;
  /** Card subheading — S2 TLDR or snippet in production. */
  tldr: string;
};

export const PAPER_TYPE_LABELS: Record<PaperType, string> = {
  article: "Article",
  preprint: "Preprint",
  conference: "Conference Paper",
  review: "Literature Review",
};
