const GENERIC_IMAGE_PATTERNS = [
  /pubmed-meta-image/i,
  /favicon/i,
  /logo/i,
  /arxiv-logo/i,
  /icon\.png/i,
  /avatar/i,
  /badge/i,
  /creativecommons/i,
  /assets\/images\/social/i,
  /social\/ico/i,
  /webimage-/i,
];

export function isGenericPreviewImage(url: string): boolean {
  return GENERIC_IMAGE_PATTERNS.some((pattern) => pattern.test(url));
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
}

function extractMetaImages(html: string): string[] {
  const patterns = [
    /name="citation_graphic"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+name="citation_graphic"/gi,
    /property="og:image"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+property="og:image"/gi,
    /name="twitter:image"\s+content="([^"]+)"/gi,
    /content="([^"]+)"\s+name="twitter:image"/gi,
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

export function extractImageCandidatesFromHtml(html: string, baseUrl?: string): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();

  const push = (url: string) => {
    const normalized = decodeEntities(url.trim());
    if (!normalized.startsWith("http") || seen.has(normalized) || isGenericPreviewImage(normalized)) {
      return;
    }
    seen.add(normalized);
    ordered.push(normalized);
  };

  for (const url of extractMetaImages(html)) push(url);
  for (const url of extractInlineImages(html)) push(url);

  if (baseUrl) {
    try {
      const base = new URL(baseUrl);
      for (const link of html.matchAll(/<link[^>]+rel="image_src"[^>]+href="([^"]+)"/gi)) {
        push(new URL(link[1], base).toString());
      }
    } catch {
      // ignore bad base
    }
  }

  return ordered;
}
