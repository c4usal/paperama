import { normalizeDoi } from "@/lib/figures/landing-urls";
import { extractImageCandidatesFromHtml } from "@/lib/figures/html-images";
import { fetchHtml, verifyFigureImageUrl } from "@/lib/figures/verify";

function frontiersArticleUrl(doi?: string, oaUrl?: string): string | null {
  if (oaUrl?.includes("frontiersin.org/articles/")) {
    return oaUrl.replace(/\/?$/, "").includes("/full")
      ? oaUrl
      : `${oaUrl.replace(/\/$/, "")}/full`;
  }

  const bare = normalizeDoi(doi);
  if (!bare) return null;

  return `https://www.frontiersin.org/articles/${bare}/full`;
}

export async function resolveFrontiersHeroImage(options: {
  doi?: string;
  oaUrl?: string;
}): Promise<string | null> {
  const articleUrl = frontiersArticleUrl(options.doi, options.oaUrl);
  if (!articleUrl) return null;

  const html = await fetchHtml(articleUrl);
  if (!html) return null;

  const candidates = extractImageCandidatesFromHtml(html, articleUrl).filter((url) =>
    url.includes("frontiersin.org/files/Articles/"),
  );

  for (const url of candidates) {
    if (await verifyFigureImageUrl(url)) return url;
  }

  return null;
}
