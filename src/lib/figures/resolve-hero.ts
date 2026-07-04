import type { OpenAlexWork } from "@/lib/openalex/types";

import { resolveArxivHeroImage } from "@/lib/figures/arxiv";
import { resolveElifeHeroImage } from "@/lib/figures/elife";
import { collectLandingUrls } from "@/lib/figures/landing-urls";
import { resolveFrontiersHeroImage } from "@/lib/figures/frontiers";
import { resolveMdpiHeroImage } from "@/lib/figures/mdpi";
import { resolvePlosHeroImage } from "@/lib/figures/plos";
import { resolvePmcHeroImage } from "@/lib/figures/pmc";
import { resolveHeroFromDoi } from "@/lib/figures/resolve-from-doi";
import { resolvePublisherHeroImage } from "@/lib/figures/publisher";
import { resolveScienceDirectHeroImage } from "@/lib/figures/sciencedirect";
import { resolveZenodoHeroImage } from "@/lib/figures/zenodo";

const heroCache = new Map<string, string | null>();

function cacheKey(work: OpenAlexWork): string {
  return [
    work.id,
    work.ids?.pmcid ?? "",
    work.ids?.pmid ?? "",
    work.ids?.doi ?? "",
    work.open_access?.oa_url ?? "",
  ].join("|");
}

/**
 * Resolve one hero image URL for a work.
 * Tries publisher APIs, DOI landing pages, Zenodo→DOI, then HTML scraping.
 */
const HERO_TIMEOUT_MS = 4000;

function extractPmidFromWork(work: OpenAlexWork): string | null {
  const fromId = work.ids?.pmid?.match(/(\d+)/)?.[1];
  if (fromId) return fromId;

  const oaUrl = work.open_access?.oa_url ?? "";
  return oaUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1] ?? null;
}

function isPubmedOnlyWork(work: OpenAlexWork, oaUrl: string): boolean {
  return oaUrl.includes("pubmed.ncbi.nlm.nih.gov") && !work.ids?.pmcid;
}

async function resolveHeroImageInner(work: OpenAlexWork): Promise<string | null> {
  const key = cacheKey(work);
  if (heroCache.has(key)) return heroCache.get(key) ?? null;

  const landingUrls = collectLandingUrls(work);
  const oaUrl = work.open_access?.oa_url ?? work.best_oa_location?.landing_page_url ?? "";
  const pubmedOnly = isPubmedOnlyWork(work, oaUrl);

  if (pubmedOnly && !work.ids?.pmcid && !work.ids?.doi) {
    heroCache.set(key, null);
    return null;
  }

  const fastResolvers = pubmedOnly
    ? [
        () =>
          resolvePmcHeroImage({
            pmcid: work.ids?.pmcid,
            pmid: extractPmidFromWork(work),
          }),
        () => {
          const doi = work.ids?.doi;
          return doi ? resolveHeroFromDoi(doi, oaUrl) : Promise.resolve(null);
        },
      ]
    : [
        () => resolvePlosHeroImage({ doi: work.ids?.doi, oaUrl }),
        () =>
          resolvePmcHeroImage({
            pmcid: work.ids?.pmcid,
            pmid: extractPmidFromWork(work),
          }),
        () => resolveMdpiHeroImage({ doi: work.ids?.doi, oaUrl }),
        () => resolveElifeHeroImage(work.ids?.doi),
        () => resolveFrontiersHeroImage({ doi: work.ids?.doi, oaUrl }),
        () => resolveScienceDirectHeroImage(landingUrls),
        () => resolveArxivHeroImage(work.ids?.arxiv),
        () => (oaUrl.includes("zenodo.org") ? resolveZenodoHeroImage(oaUrl) : Promise.resolve(null)),
        () => {
          const doi = work.ids?.doi;
          return doi ? resolveHeroFromDoi(doi, oaUrl) : Promise.resolve(null);
        },
      ];

  const resolvers = pubmedOnly ? fastResolvers : [...fastResolvers, () => resolvePublisherHeroImage(work)];

  for (const resolve of resolvers) {
    const hero = await resolve();
    if (hero) {
      heroCache.set(key, hero);
      return hero;
    }
  }

  heroCache.set(key, null);
  return null;
}

export async function resolveHeroImage(work: OpenAlexWork): Promise<string | null> {
  try {
    return await Promise.race([
      resolveHeroImageInner(work),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), HERO_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  }
}

export function clearHeroImageCache() {
  heroCache.clear();
}
