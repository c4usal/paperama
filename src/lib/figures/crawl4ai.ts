import { collectLandingUrls } from "@/lib/figures/landing-urls";
import { enrichmentServiceUrl, resolveHeroViaCrawl4ai } from "@/lib/enrichment/client";
import type { OpenAlexWork } from "@/lib/openalex/types";
import { resolveOaUrl } from "@/lib/openalex/oa-url";

/** Pick the best landing page URL for crawl4ai (article page, not PDF download). */
function pickCrawlLandingUrl(work: OpenAlexWork): string | null {
  const oa = resolveOaUrl(work);
  if (oa?.url && !isDownloadUrl(oa.url)) return oa.url;

  for (const url of collectLandingUrls(work)) {
    if (!isDownloadUrl(url)) return url;
  }

  return oa?.url ?? null;
}

function isDownloadUrl(url: string): boolean {
  return (
    /\.pdf($|\?)/i.test(url) ||
    /\/download\//i.test(url) ||
    /servlets\/purl/i.test(url) ||
    /\/pdf$/i.test(url)
  );
}

export async function resolveCrawl4aiHeroImage(work: OpenAlexWork): Promise<string | null> {
  if (!enrichmentServiceUrl()) return null;

  const landing = pickCrawlLandingUrl(work);
  if (!landing) return null;

  return resolveHeroViaCrawl4ai(landing);
}
