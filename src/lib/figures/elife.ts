import { normalizeDoi } from "@/lib/figures/landing-urls";
import { verifyFigureImageUrl } from "@/lib/figures/verify";

function elifeArticleId(doi: string): string | null {
  const bare = normalizeDoi(doi);
  if (!bare) return null;
  const match = bare.match(/^10\.7554\/elife\.(\d+)$/i);
  return match?.[1] ?? null;
}

export async function resolveElifeHeroImage(doi?: string): Promise<string | null> {
  const articleId = doi ? elifeArticleId(doi) : null;
  if (!articleId) return null;

  const candidates = [
    `https://cdn.elifesciences.org/articles/${articleId}/elife-${articleId}-fig1-v1.jpg`,
    `https://cdn.elifesciences.org/articles/${articleId}/elife-${articleId}-fig1.jpg`,
  ];

  for (const url of candidates) {
    if (await verifyFigureImageUrl(url)) return url;
  }

  return null;
}
