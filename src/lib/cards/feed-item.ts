import type { FeedCard } from "@/types/card";
import type { PaperFeedItem } from "@/types/paper";

/** Map OpenAlex FeedCard → UI PaperFeedItem (Group 2 feed API). */
export function feedCardToPaperFeedItem(
  card: FeedCard,
  options: { instanceSuffix?: string } = {},
): PaperFeedItem {
  const suffix = options.instanceSuffix ?? "";
  const id = suffix ? `${card.openAlexId}${suffix}` : card.openAlexId;

  return {
    id,
    seedId: card.openAlexId,
    openAlexId: card.openAlexId,
    title: card.title,
    type: card.type,
    publishedAt: card.year,
    reads: 0,
    citationCount: card.citationCount,
    journal: { name: card.journal },
    authors: card.authorNames.map((name) => ({ name })),
    heroImageUrl: card.heroImageUrl,
    oaUrl: card.oaUrl,
    oaSource: card.oaSource,
    interestLabel: card.matchLabel,
    topicSlug: card.topicSlug,
    abstract: card.abstract,
    tldr: card.tldr,
  };
}

export function feedCardsToPaperFeedItems(cards: FeedCard[]): PaperFeedItem[] {
  return cards.map((card) => feedCardToPaperFeedItem(card));
}
