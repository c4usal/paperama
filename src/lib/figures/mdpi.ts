import { normalizeDoi } from "@/lib/figures/landing-urls";
import { verifyImageUrl } from "@/lib/figures/verify";

function mdpiJournalFromDoi(doi: string): string | null {
  const bare = normalizeDoi(doi);
  if (!bare?.startsWith("10.3390/")) return null;

  const rest = bare.slice("10.3390/".length);
  const match = rest.match(/^([a-z]+)(\d+)$/i);
  return match?.[1] ?? null;
}

function mdpiSlugsFromDoi(doi: string): string[] {
  const bare = normalizeDoi(doi);
  if (!bare?.startsWith("10.3390/")) return [];

  const rest = bare.slice("10.3390/".length);
  const match = rest.match(/^([a-z]+)(\d+)$/i);
  if (!match) return [];

  const journal = match[1];
  const digits = match[2];
  const slugs = new Set<string>();

  for (let volLen = 1; volLen <= 2; volLen++) {
    const vol = digits.slice(0, volLen);
    const tail = digits.slice(volLen);
    if (!vol || tail.length < 4) continue;

    for (const width of [4, 5]) {
      if (tail.length < width) continue;
      const articleNum = Number.parseInt(tail.slice(-width), 10);
      if (!articleNum) continue;
      slugs.add(`${journal}-${vol}-${String(articleNum).padStart(5, "0")}`);
    }
  }

  return [...slugs];
}

function mdpiSlugFromOaUrl(oaUrl: string, doi?: string): string | null {
  try {
    const url = new URL(oaUrl);
    if (!url.hostname.includes("mdpi.com")) return null;

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;

    const vol = parts.at(-3);
    const article = parts.at(-1);
    const journal = doi ? mdpiJournalFromDoi(doi) : null;
    if (!vol || !article || !journal) return null;

    return `${journal}-${vol}-${article.padStart(5, "0")}`;
  } catch {
    return null;
  }
}

function buildMdpiImageUrls(slug: string): string[] {
  const journal = slug.split("-")[0];
  return [
    `https://pub.mdpi-res.com/${journal}/${slug}/article_deploy/html/images/${slug}-g001.png`,
    `https://pub.mdpi-res.com/${journal}/${slug}/article_deploy/html/images/${slug}-g001.jpg`,
    `https://www.mdpi.com/${journal}/${slug}/article_deploy/html/images/${slug}-g001.png`,
  ];
}

export async function resolveMdpiHeroImage(options: {
  doi?: string;
  oaUrl?: string;
}): Promise<string | null> {
  const slugs = new Set<string>();

  if (options.doi) {
    for (const slug of mdpiSlugsFromDoi(options.doi)) slugs.add(slug);
  }

  if (options.oaUrl) {
    const fromUrl = mdpiSlugFromOaUrl(options.oaUrl, options.doi);
    if (fromUrl) slugs.add(fromUrl);
  }

  for (const slug of slugs) {
    for (const url of buildMdpiImageUrls(slug)) {
      if (await verifyImageUrl(url)) return url;
    }
  }

  return null;
}
