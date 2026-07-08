import type { OpenAlexWork } from "@/lib/openalex/types";

import { isLikelyFigureImage } from "@/lib/figures/image-filter";
import { resolveArxivHeroImage } from "@/lib/figures/arxiv";
import { resolveElifeHeroImage } from "@/lib/figures/elife";
import { collectLandingUrls } from "@/lib/figures/landing-urls";
import { resolveFrontiersHeroImage } from "@/lib/figures/frontiers";
import { resolveMdpiHeroImage } from "@/lib/figures/mdpi";
import { resolvePlosHeroImage } from "@/lib/figures/plos";
import { resolvePmcHeroImage } from "@/lib/figures/pmc";
import { resolveCrawl4aiHeroImage } from "@/lib/figures/crawl4ai";
import { resolveHeroFromDoi } from "@/lib/figures/resolve-from-doi";
import { resolvePublisherHeroImage } from "@/lib/figures/publisher";
import { resolveScienceDirectHeroImage } from "@/lib/figures/sciencedirect";
import { resolveSpringerHeroImage } from "@/lib/figures/springer";
import { resolveZenodoHeroImage } from "@/lib/figures/zenodo";

const heroCache = new Map<string, string>();

function sanitizeHero(url: string | null): string | null {
  if (!url || !isLikelyFigureImage(url)) return null;
  return url;
}

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
const HERO_TIMEOUT_MS = 12_000;
const FAST_HERO_TIMEOUT_MS = 5_000;

export type ResolveHeroOptions = {
  /** Fast resolvers only — for feed pagination hot path. */
  fast?: boolean;
};

type HeroResolver = () => Promise<string | null>;

/** Run resolvers in parallel; return the first non-null hero URL. */
async function firstSuccessfulHero(resolvers: HeroResolver[]): Promise<string | null> {
  if (resolvers.length === 0) return null;

  return new Promise((resolve) => {
    let settled = false;
    let pending = resolvers.length;

    for (const run of resolvers) {
      void run().then((hero) => {
        pending -= 1;
        if (settled) return;

        if (hero) {
          settled = true;
          resolve(hero);
          return;
        }

        if (pending === 0) resolve(null);
      });
    }
  });
}

function extractPmidFromWork(work: OpenAlexWork): string | null {
  const fromId = work.ids?.pmid?.match(/(\d+)/)?.[1];
  if (fromId) return fromId;

  const oaUrl = work.open_access?.oa_url ?? "";
  return oaUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1] ?? null;
}

function isPubmedOnlyWork(work: OpenAlexWork, oaUrl: string): boolean {
  return oaUrl.includes("pubmed.ncbi.nlm.nih.gov") && !work.ids?.pmcid;
}

async function resolveHeroImageInner(
  work: OpenAlexWork,
  fast = false,
): Promise<string | null> {
  const key = cacheKey(work);
  if (heroCache.has(key)) return heroCache.get(key) ?? null;

  const landingUrls = collectLandingUrls(work);
  const oaUrl = work.open_access?.oa_url ?? work.best_oa_location?.landing_page_url ?? "";
  const pubmedOnly = isPubmedOnlyWork(work, oaUrl);

  if (pubmedOnly && !work.ids?.pmcid && !work.ids?.doi) {
    return null;
  }

  const fastResolvers: HeroResolver[] = pubmedOnly
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
    : fast
      ? [
          () => resolveArxivHeroImage(work.ids?.arxiv),
          () => resolvePlosHeroImage({ doi: work.ids?.doi, oaUrl }),
          () => resolveSpringerHeroImage(work.ids?.doi),
          () => resolveMdpiHeroImage({ doi: work.ids?.doi, oaUrl }),
          () => resolveElifeHeroImage(work.ids?.doi),
          () =>
            resolvePmcHeroImage({
              pmcid: work.ids?.pmcid,
              pmid: extractPmidFromWork(work),
              pmcidOnly: true,
            }),
        ]
      : [
          () => resolvePmcHeroImage({ pmcid: work.ids?.pmcid, pmid: extractPmidFromWork(work) }),
          () => resolvePlosHeroImage({ doi: work.ids?.doi, oaUrl }),
          () => resolveSpringerHeroImage(work.ids?.doi),
          () => resolveMdpiHeroImage({ doi: work.ids?.doi, oaUrl }),
          () => resolveElifeHeroImage(work.ids?.doi),
          () => resolveFrontiersHeroImage({ doi: work.ids?.doi, oaUrl }),
          () => resolveArxivHeroImage(work.ids?.arxiv),
        ];

  const fastHero = sanitizeHero(await firstSuccessfulHero(fastResolvers));
  if (fastHero) {
    heroCache.set(key, fastHero);
    return fastHero;
  }

  if (fast) return null;

  const slowResolvers: HeroResolver[] = [
    () => resolveCrawl4aiHeroImage(work),
    () => resolveScienceDirectHeroImage(landingUrls),
    () => (oaUrl.includes("zenodo.org") ? resolveZenodoHeroImage(oaUrl) : Promise.resolve(null)),
    () => {
      const doi = work.ids?.doi;
      return doi ? resolveHeroFromDoi(doi, oaUrl) : Promise.resolve(null);
    },
  ];

  if (!pubmedOnly) {
    slowResolvers.push(() => resolvePublisherHeroImage(work));
  }

  for (const resolve of slowResolvers) {
    const hero = sanitizeHero(await resolve());
    if (hero) {
      heroCache.set(key, hero);
      return hero;
    }
  }

  return null;
}

export async function resolveHeroImage(
  work: OpenAlexWork,
  options: ResolveHeroOptions = {},
): Promise<string | null> {
  const fast = options.fast ?? false;

  try {
    return await Promise.race([
      resolveHeroImageInner(work, fast),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), fast ? FAST_HERO_TIMEOUT_MS : HERO_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return null;
  }
}

export function clearHeroImageCache() {
  heroCache.clear();
}
