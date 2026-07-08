import { fetchWorksBroad, fetchWorksByTopicSlug } from "@/lib/openalex/works";
import { getAllConceptIds } from "@/lib/topics";

const PUBLICATION_YEAR_GTE = 2015;

/** Fetch one OpenAlex topic page (no Next.js cache — safe in scripts and route). */
export async function getWorksByTopic(
  slug: string,
  cursor: string | null,
  perPage: number,
) {
  return fetchWorksByTopicSlug(slug, {
    cursor: cursor ?? undefined,
    perPage,
    publicationYearGte: PUBLICATION_YEAR_GTE,
    withHeroImages: false,
  });
}

/** Fetch one page from the broad multi-concept OpenAlex stream. */
export async function getWorksBroad(
  conceptIds: string[] | undefined,
  cursor: string | null,
  perPage: number,
) {
  return fetchWorksBroad(conceptIds?.length ? conceptIds : getAllConceptIds(), {
    cursor: cursor ?? undefined,
    perPage,
    publicationYearGte: PUBLICATION_YEAR_GTE,
    withHeroImages: false,
  });
}
