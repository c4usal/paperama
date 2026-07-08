import { normalizeDoi } from "@/lib/figures/landing-urls";
import { extractImageCandidatesFromHtml } from "@/lib/figures/html-images";
import { isTrustedFigureEndpoint } from "@/lib/figures/image-filter";
import { fetchHtml, verifyFigureImageUrl } from "@/lib/figures/verify";

const SPRINGER_DOI_PREFIXES = ["10.1038/", "10.1007/", "10.1186/"];

function isSpringerDoi(doi: string): boolean {
  const bare = normalizeDoi(doi);
  if (!bare) return false;
  return SPRINGER_DOI_PREFIXES.some((prefix) => bare.startsWith(prefix));
}

/** First figure from Nature / Springer Open Access articles via landing-page meta tags. */
export async function resolveSpringerHeroImage(doi?: string): Promise<string | null> {
  if (!doi || !isSpringerDoi(doi)) return null;

  const bare = normalizeDoi(doi);
  if (!bare) return null;

  const landing = `https://doi.org/${bare}`;
  const html = await fetchHtml(landing);
  if (!html) return null;

  const candidates = extractImageCandidatesFromHtml(html, landing).filter(
    (url) =>
      url.includes("media.springernature.com") ||
      url.includes("springer-static") ||
      /Fig1|figure|g001/i.test(url),
  );

  for (const candidate of candidates) {
    if (isTrustedFigureEndpoint(candidate)) return candidate;
    if (await verifyFigureImageUrl(candidate)) return candidate;
  }

  return null;
}
