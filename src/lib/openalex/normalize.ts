import type { PaperType } from "@/types/paper";
import type { FeedCard } from "@/types/card";

import { abstractToSnippet, reconstructAbstract } from "@/lib/openalex/abstract";
import { shortOpenAlexId } from "@/lib/openalex/client";
import { isEligibleOpenAccessWork, isPubmedOnlyOaUrl, resolveOaUrl } from "@/lib/openalex/oa-url";
import type { OpenAlexAuthorship, OpenAlexWork } from "@/lib/openalex/types";

function mapPaperType(openAlexType: string | undefined): PaperType {
  switch (openAlexType) {
    case "preprint":
      return "preprint";
    case "review":
      return "review";
    case "proceedings-article":
    case "book-chapter":
      return "conference";
    default:
      return "article";
  }
}

function formatAuthorDisplay(names: string[]): string {
  if (names.length === 0) return "Unknown author";
  if (names.length === 1) return names[0];

  const lead = names[0];
  const surname = lead.split(" ").at(-1) ?? lead;
  return `${surname} et al.`;
}

function extractAuthorNames(authorships: OpenAlexAuthorship[] | undefined): string[] {
  if (!authorships?.length) return [];

  return authorships
    .map((authorship) => authorship.author?.display_name?.trim())
    .filter((name): name is string => Boolean(name));
}

function formatPublishedYear(work: OpenAlexWork): string {
  if (work.publication_year) return String(work.publication_year);
  if (work.publication_date) {
    const year = work.publication_date.slice(0, 4);
    if (/^\d{4}$/.test(year)) return year;
  }
  return "";
}

export type NormalizeContext = {
  matchLabel?: string;
  topicSlug?: string;
};

/**
 * Map one OpenAlex work → FeedCard.
 * Returns null if no allowed OA link (paywalled-only works are dropped).
 */
const NON_DISCOVERY_WORK_TYPES = new Set(["dataset", "paratext", "letter", "editorial"]);

const REPOSITORY_OA_HOSTS = ["zenodo.org", "figshare.com", "hdl.handle.net", "ebi.ac.uk/ena"];

function isRepositoryOnlyWork(work: OpenAlexWork): boolean {
  const oaUrl = work.open_access?.oa_url ?? "";
  const isRepositoryHost = REPOSITORY_OA_HOSTS.some((host) => oaUrl.includes(host));
  const isJournalSource = work.primary_location?.source?.type === "journal";
  return isRepositoryHost && !isJournalSource && !work.ids?.pmcid && !work.ids?.arxiv;
}

export function normalizeWork(work: OpenAlexWork, context: NormalizeContext = {}): FeedCard | null {
  if (work.type && NON_DISCOVERY_WORK_TYPES.has(work.type)) return null;
  if (isRepositoryOnlyWork(work)) return null;
  if (!isEligibleOpenAccessWork(work)) return null;

  const oa = resolveOaUrl(work);
  if (!oa) return null;

  if (isPubmedOnlyOaUrl(oa.url) && !work.ids?.doi && !work.ids?.pmcid) return null;

  const title = (work.display_name || work.title || "").trim();
  if (!title) return null;

  const authorNames = extractAuthorNames(work.authorships);
  const abstract = reconstructAbstract(work.abstract_inverted_index);
  const tldr = abstractToSnippet(abstract) || title;

  return {
    openAlexId: shortOpenAlexId(work.id),
    title,
    tldr,
    authors: formatAuthorDisplay(authorNames),
    authorNames,
    journal: work.primary_location?.source?.display_name ?? "Unknown source",
    year: formatPublishedYear(work),
    citationCount: work.cited_by_count ?? 0,
    matchLabel: context.matchLabel,
    topicSlug: context.topicSlug,
    oaUrl: oa.url,
    oaSource: oa.source,
    type: mapPaperType(work.type),
    abstract: abstract || undefined,
  };
}

export function normalizeWorks(works: OpenAlexWork[], context: NormalizeContext = {}): FeedCard[] {
  return works
    .map((work) => normalizeWork(work, context))
    .filter((card): card is FeedCard => card !== null);
}
