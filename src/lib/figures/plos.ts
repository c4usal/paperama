function normalizeDoi(doi: string | undefined): string | null {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, "").trim() || null;
}

function isPlosHost(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "journals.plos.org" || host.endsWith(".plos.org");
  } catch {
    return false;
  }
}

import { verifyImageUrl } from "@/lib/figures/verify";

/** First figure from PLOS OA articles via stable figure image endpoint. */
export async function resolvePlosHeroImage(options: {
  doi?: string;
  oaUrl?: string;
}): Promise<string | null> {
  const doi = normalizeDoi(options.doi);
  if (!doi) return null;

  const isPlosDoi = /10\.1371\/journal\.(pone|pbio|pcbi|ppat|pgen)/i.test(doi);
  const oaUrl = options.oaUrl ?? "";

  if (!isPlosDoi && oaUrl && !isPlosHost(oaUrl)) return null;

  const candidates = [
    `https://journals.plos.org/plosone/article/figure/image?size=large&id=${doi}.g001`,
    `https://journals.plos.org/plosbiology/article/figure/image?size=large&id=${doi}.g001`,
    `https://journals.plos.org/ploscompbiol/article/figure/image?size=large&id=${doi}.g001`,
    `https://journals.plos.org/plospathogens/article/figure/image?size=large&id=${doi}.g001`,
    `https://journals.plos.org/plosgenetics/article/figure/image?size=large&id=${doi}.g001`,
  ];

  for (const url of candidates) {
    if (await verifyImageUrl(url)) return url;
  }

  return null;
}
