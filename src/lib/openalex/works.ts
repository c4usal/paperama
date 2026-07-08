import type { FeedCard, FetchWorksResult } from "@/types/card";

import { enrichCardsWithHeroImages } from "@/lib/figures/enrich";
import { openAlexFetch, shortOpenAlexId } from "@/lib/openalex/client";
import { inferTopicFromWork } from "@/lib/openalex/match-topic";
import { normalizeWork, normalizeWorks } from "@/lib/openalex/normalize";
import type { OpenAlexWork, OpenAlexWorksResponse } from "@/lib/openalex/types";
import { getTopic, getTopicByConceptId } from "@/lib/topics";

export type FetchWorksByConceptOptions = {
  perPage?: number;
  cursor?: string;
  /** Only include works published in this year or later. */
  publicationYearGte?: number;
  /** Resolve hero images during fetch (disable for incremental feed assembly). */
  withHeroImages?: boolean;
};

function buildConceptFilter(conceptId: string, publicationYearGte?: number): string {
  const normalized = conceptId.replace("https://openalex.org/", "");
  return buildBroadConceptFilter([normalized], publicationYearGte);
}

function buildBroadConceptFilter(conceptIds: string[], publicationYearGte?: number): string {
  const normalized = conceptIds
    .map((id) => id.replace("https://openalex.org/", ""))
    .filter(Boolean);

  if (normalized.length === 0) {
    throw new Error("At least one OpenAlex concept id is required");
  }

  const filters = [
    `concepts.id:${normalized.join("|")}`,
    "type:article|review|preprint",
    "open_access.is_oa:true",
    "primary_location.source.type:journal|repository",
  ];

  if (publicationYearGte !== undefined) {
    filters.push(`publication_year:${publicationYearGte}-`);
  }

  return filters.join(",");
}

function normalizeWorksWithTopicMatch(works: OpenAlexWork[]): FeedCard[] {
  return works
    .map((work) => normalizeWork(work, inferTopicFromWork(work)))
    .filter((card): card is FeedCard => card !== null);
}

/**
 * Fetch works for one OpenAlex concept id and return normalized OA-only cards.
 */
export async function fetchWorksByConcept(
  conceptId: string,
  options: FetchWorksByConceptOptions = {},
): Promise<FetchWorksResult> {
  const perPage = options.perPage ?? 25;

  const response = await openAlexFetch<OpenAlexWorksResponse>("/works", {
    filter: buildConceptFilter(conceptId, options.publicationYearGte),
    sort: "cited_by_count:desc",
    per_page: String(perPage),
    cursor: options.cursor ?? "*",
  });

  const topic = getTopicByConceptId(conceptId);
  const works = response.results ?? [];
  const cards = normalizeWorks(works, {
    matchLabel: topic?.label.toLowerCase(),
    topicSlug: topic?.slug,
  });

  if (options.withHeroImages !== false) {
    await enrichCardsWithHeroImages(works, cards);
  }

  return {
    cards,
    works,
    nextCursor: response.meta?.next_cursor ?? null,
    meta: {
      count: response.meta?.count ?? cards.length,
      perPage: response.meta?.per_page ?? perPage,
    },
  };
}

/**
 * Broad OpenAlex stream — OR of multiple concept ids, single cursor pagination.
 * Match labels are inferred per work from concept scores.
 */
export async function fetchWorksBroad(
  conceptIds: string[],
  options: FetchWorksByConceptOptions = {},
): Promise<FetchWorksResult> {
  const perPage = options.perPage ?? 25;

  const response = await openAlexFetch<OpenAlexWorksResponse>("/works", {
    filter: buildBroadConceptFilter(conceptIds, options.publicationYearGte),
    sort: "cited_by_count:desc",
    per_page: String(perPage),
    cursor: options.cursor ?? "*",
  });

  const works = response.results ?? [];
  const cards = normalizeWorksWithTopicMatch(works);

  if (options.withHeroImages !== false) {
    await enrichCardsWithHeroImages(works, cards);
  }

  return {
    cards,
    works,
    nextCursor: response.meta?.next_cursor ?? null,
    meta: {
      count: response.meta?.count ?? cards.length,
      perPage: response.meta?.per_page ?? perPage,
    },
  };
}

/** Fetch by topic slug from `src/lib/topics.ts`. */
export async function fetchWorksByTopicSlug(
  slug: string,
  options: FetchWorksByConceptOptions = {},
): Promise<FetchWorksResult> {
  const topic = getTopic(slug);
  if (!topic) {
    throw new Error(`Unknown topic slug: ${slug}`);
  }

  return fetchWorksByConcept(topic.openAlexConceptId, options);
}

/** Fetch specific works by OpenAlex id (saved tab). */
export async function fetchWorksByOpenAlexIds(openAlexIds: string[]): Promise<FeedCard[]> {
  const ids = [...new Set(openAlexIds.map((id) => shortOpenAlexId(id)))].filter(Boolean);
  if (ids.length === 0) return [];

  const filter = `ids.openalex:${ids.map((id) => `https://openalex.org/${id}`).join("|")}`;

  const response = await openAlexFetch<OpenAlexWorksResponse>("/works", {
    filter,
    per_page: String(Math.min(ids.length, 50)),
  });

  const works = response.results ?? [];
  const cards = normalizeWorks(works);
  await enrichCardsWithHeroImages(works, cards);

  return cards;
}

/** Fetch one work for legacy /paper/[id] redirects. */
export async function fetchWorkByOpenAlexId(openAlexId: string): Promise<FeedCard | null> {
  const id = shortOpenAlexId(openAlexId);
  const work = await openAlexFetch<OpenAlexWork>(`/works/${id}`);
  return normalizeWork(work);
}
