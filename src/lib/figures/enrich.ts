import type { FeedCard } from "@/types/card";
import type { PaperFeedItem } from "@/types/paper";

import { feedCardsToPaperFeedItems } from "@/lib/cards/feed-item";
import { resolveHeroImage } from "@/lib/figures/resolve-hero";
import { shortOpenAlexId } from "@/lib/openalex/client";
import type { OpenAlexWork } from "@/lib/openalex/types";

/** Attach hero image to one card if resolvable. */
export async function enrichCardWithHeroImage(
  work: OpenAlexWork,
  card: FeedCard,
): Promise<boolean> {
  const heroImageUrl = await resolveHeroImage(work);
  if (!heroImageUrl) return false;

  card.heroImageUrl = heroImageUrl;
  return true;
}

/** Attach hero image URLs to normalized cards (Group 4). */
export async function enrichCardsWithHeroImages(
  works: OpenAlexWork[],
  cards: FeedCard[],
): Promise<void> {
  const workById = new Map(works.map((work) => [shortOpenAlexId(work.id), work]));

  await Promise.all(
    cards.map(async (card) => {
      const work = workById.get(card.openAlexId);
      if (!work) return;
      await enrichCardWithHeroImage(work, card);
    }),
  );
}

export async function enrichWorksToFeedItems(
  works: OpenAlexWork[],
  cards: FeedCard[],
): Promise<PaperFeedItem[]> {
  await enrichCardsWithHeroImages(works, cards);
  return feedCardsToPaperFeedItems(cards);
}
