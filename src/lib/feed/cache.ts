import { fetchWorksByTopicSlug } from "@/lib/openalex/works";

const PUBLICATION_YEAR_GTE = 2020;

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
