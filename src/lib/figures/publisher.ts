import { collectLandingUrls } from "@/lib/figures/landing-urls";
import { extractImageCandidatesFromHtml } from "@/lib/figures/html-images";
import { fetchHtml, verifyImageUrl } from "@/lib/figures/verify";
import type { OpenAlexWork } from "@/lib/openalex/types";

const MAX_HTML_FETCHES = 2;

function prioritizeLandingUrls(urls: string[]): string[] {
  const score = (url: string): number => {
    if (url.includes("frontiersin.org")) return 0;
    if (url.includes("mdpi.com")) return 1;
    if (url.includes("biomedcentral.com") || url.includes("springer")) return 2;
    if (url.includes("nature.com")) return 3;
    if (url.includes("sciencedirect.com")) return 4;
    if (url.includes("plos.org")) return 5;
    if (url.includes("pubmed.ncbi.nlm.nih.gov")) return 8;
    if (url.includes("doi.org")) return 9;
    return 6;
  };

  return [...urls].sort((a, b) => score(a) - score(b));
}

export async function resolvePublisherHeroImage(work: OpenAlexWork): Promise<string | null> {
  const landingUrls = prioritizeLandingUrls(collectLandingUrls(work)).slice(0, MAX_HTML_FETCHES);

  for (const landingUrl of landingUrls) {
    const html = await fetchHtml(landingUrl);
    if (!html) continue;

    const candidates = extractImageCandidatesFromHtml(html, landingUrl);
    for (const candidate of candidates) {
      if (await verifyImageUrl(candidate)) return candidate;
    }
  }

  return null;
}
