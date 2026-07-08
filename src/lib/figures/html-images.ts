import {
  filterFigureImageCandidates,
  isLikelyFigureImage,
  isRejectedHeroImage,
} from "@/lib/figures/image-filter";

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function extractCitationGraphicMeta(html: string): string[] {
  const patterns = [
    /name="citation_graphic"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+name="citation_graphic"/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = decodeEntities(match[1]?.trim() ?? "");
      if (url.startsWith("http")) found.push(url);
    }
  }

  return found;
}

function extractSocialMetaImages(html: string): string[] {
  const patterns = [
    /property="og:image"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+property="og:image"/gi,
    /name="twitter:image"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+name="twitter:image"/gi,
  ];

  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = decodeEntities(match[1]?.trim() ?? "");
      if (url.startsWith("http") && isLikelyFigureImage(url)) found.push(url);
    }
  }

  return found;
}

const INLINE_IMAGE_PATTERNS = [
  /https:\/\/pub\.mdpi-res\.com\/[^"'\s<>]+?-g001\.(?:png|jpg|jpeg)/gi,
  /https:\/\/www\.frontiersin\.org\/files\/Articles\/\d+\/[^"'\s<>]+?-g001\.(?:jpg|jpeg|png)/gi,
  /https:\/\/media\.springernature\.com\/[^"'\s<>]+?\.(?:jpg|jpeg|png)/gi,
  /https:\/\/ars\.els-cdn\.com\/content\/image\/[^"'\s<>]+?\.(?:jpg|jpeg|png)/gi,
  /https:\/\/d2csxpduxe849s\.cloudfront\.net\/[^"'\s<>]+?\.(?:jpg|jpeg|png)/gi,
  /https:\/\/www\.ncbi\.nlm\.nih\.gov\/corehtml\/pmc\/pmcgifs\/[^"'\s<>]+?\.(?:jpg|jpeg|png)/gi,
  /https:\/\/static\.cambridge\.org\/[^"'\s<>]+?\.(?:jpg|jpeg|png)/gi,
];

function extractInlineImages(html: string): string[] {
  const found: string[] = [];

  for (const pattern of INLINE_IMAGE_PATTERNS) {
    for (const match of html.matchAll(pattern)) {
      found.push(decodeEntities(match[0]));
    }
  }

  return found;
}

function extractImgTagImages(html: string, baseUrl?: string): string[] {
  const found: string[] = [];
  let base: URL | null = null;

  if (baseUrl) {
    try {
      base = new URL(baseUrl);
    } catch {
      base = null;
    }
  }

  for (const match of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    let url = decodeEntities(match[1]?.trim() ?? "");
    if (!url) continue;

    if (url.startsWith("//")) url = `https:${url}`;
    else if (url.startsWith("/") && base) url = new URL(url, base).toString();
    else if (!url.startsWith("http")) continue;

    if (!isLikelyFigureImage(url)) continue;
    found.push(url);
  }

  return found;
}

export function extractImageCandidatesFromHtml(html: string, baseUrl?: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (url: string) => {
    const normalized = decodeEntities(url.trim());
    if (!normalized.startsWith("http") || seen.has(normalized) || isRejectedHeroImage(normalized)) {
      return;
    }
    seen.add(normalized);
    ordered.push(normalized);
  };

  for (const url of extractInlineImages(html)) push(url);
  for (const url of extractImgTagImages(html, baseUrl)) push(url);
  for (const url of extractCitationGraphicMeta(html)) push(url);
  for (const url of extractSocialMetaImages(html)) push(url);

  if (baseUrl) {
    try {
      const base = new URL(baseUrl);
      for (const link of html.matchAll(/<link[^>]+rel="image_src"[^>]+href="([^"]+)"/gi)) {
        const url = new URL(link[1], base).toString();
        if (isLikelyFigureImage(url)) push(url);
      }
    } catch {
      // ignore bad base
    }
  }

  return filterFigureImageCandidates(ordered);
}

export { isRejectedHeroImage as isGenericPreviewImage } from "@/lib/figures/image-filter";
