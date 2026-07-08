import { enrichCardWithHeroImage } from "@/lib/figures/enrich";
import { getWorksByTopic } from "@/lib/feed/cache";
import { shortOpenAlexId } from "@/lib/openalex/client";
import type { OpenAlexWork } from "@/lib/openalex/types";
import { getTopic } from "@/lib/topics";

import { countEnrichedByTopic, insertEnrichedCard } from "./store";

const MAX_OPENALEX_ROUNDS = 40;
const ENRICH_CONCURRENCY = 10;

export const INDEX_TARGET_PER_TOPIC = 50;

export type FillTopicResult = {
  slug: string;
  inserted: number;
  target: number;
  complete: boolean;
};

async function enrichForIndex(
  work: OpenAlexWork,
  card: Parameters<typeof enrichCardWithHeroImage>[1],
): Promise<boolean> {
  const fast = await enrichCardWithHeroImage(work, card, {
    fastHero: true,
    skipTldr: true,
    fastOnly: true,
  });
  if (fast) return true;

  return enrichCardWithHeroImage(work, card, {
    fastHero: false,
    skipTldr: true,
  });
}

/** Fill enriched index for one topic until `target` hero-confirmed papers exist. */
export async function fillTopicIndex(slug: string, target: number): Promise<FillTopicResult> {
  const topic = getTopic(slug);
  if (!topic) {
    throw new Error(`Unknown topic slug: ${slug}`);
  }

  let inserted = countEnrichedByTopic(slug);
  let openAlexCursor: string | null = null;
  let rounds = 0;

  while (inserted < target && rounds < MAX_OPENALEX_ROUNDS) {
    rounds += 1;
    const batch = await getWorksByTopic(slug, openAlexCursor, 50);
    const workById = new Map(batch.works.map((work) => [shortOpenAlexId(work.id), work]));
    const candidates = batch.cards.filter((card) => card.title?.trim());

    for (let i = 0; i < candidates.length && inserted < target; i += ENRICH_CONCURRENCY) {
      const chunk = candidates.slice(i, i + ENRICH_CONCURRENCY);

      await Promise.all(
        chunk.map(async (card) => {
          if (countEnrichedByTopic(slug) >= target) return;

          const work = workById.get(card.openAlexId);
          if (!work) return;

          card.topicSlug = slug;
          card.matchLabel = topic.label.toLowerCase();

          try {
            const enriched = await enrichForIndex(work, card);
            if (!enriched || !card.heroImageUrl) return;

            insertEnrichedCard(card, slug);
          } catch {
            // skip candidate
          }
        }),
      );

      inserted = countEnrichedByTopic(slug);
    }

    openAlexCursor = batch.nextCursor;
    if (!openAlexCursor) break;
  }

  return {
    slug,
    inserted,
    target,
    complete: inserted >= target,
  };
}
