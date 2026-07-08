import type { FeedCard } from "@/types/card";
import type { PaperFeedItem } from "@/types/paper";

import { feedCardsToPaperFeedItems } from "@/lib/cards/feed-item";
import { isLikelyFigureImage } from "@/lib/figures/image-filter";
import { resolveHeroImage } from "@/lib/figures/resolve-hero";
import { enrichCardTldr } from "@/lib/summarize/sumy";
import { shortOpenAlexId } from "@/lib/openalex/client";
import type { OpenAlexWork } from "@/lib/openalex/types";

export type EnrichHeroOptions = {
  /** Skip sumy TLDR — feed pagination only needs heroes fast. */
  skipTldr?: boolean;
  /** Fast resolvers only (no crawl4ai / HTML scrape). */
  fastHero?: boolean;
  /** Never fall back to slow resolvers (feed hot path). */
  fastOnly?: boolean;
};

/** Attach hero image to one card if resolvable. */
export async function enrichCardWithHeroImage(
  work: OpenAlexWork,
  card: FeedCard,
  options: EnrichHeroOptions = {},
): Promise<boolean> {
  let heroImageUrl = await resolveHeroImage(work, { fast: options.fastHero });
  if (!heroImageUrl && options.fastHero && !options.fastOnly) {
    heroImageUrl = await resolveHeroImage(work, { fast: false });
  }
  if (!options.skipTldr) {
    await enrichCardTldr(card);
  }
  if (!heroImageUrl || !isLikelyFigureImage(heroImageUrl)) return false;

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
