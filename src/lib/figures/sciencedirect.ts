import { verifyFigureImageUrl } from "@/lib/figures/verify";

function extractPii(url: string): string | null {
  const match = url.match(/\/pii\/([^/?#]+)/i);
  return match?.[1] ?? null;
}

function buildElsCdnCandidates(pii: string): string[] {
  const normalized = pii.replace(/^1-s2\.0-/i, "");
  const prefixes = [pii, normalized, `1-s2.0-${normalized}`];
  const suffixes = ["fx1.jpg", "ga1.jpg", "gr1.jpg", "gr1.sml"];

  const urls: string[] = [];
  for (const prefix of new Set(prefixes)) {
    for (const suffix of suffixes) {
      urls.push(`https://ars.els-cdn.com/content/image/${prefix}-${suffix}`);
      urls.push(`https://ars.els-cdn.com/content/image/1-s2.0-${prefix}-${suffix}`);
    }
  }

  return urls;
}

export async function resolveScienceDirectHeroImage(landingUrls: string[]): Promise<string | null> {
  const piis = new Set<string>();

  for (const url of landingUrls) {
    if (!url.includes("sciencedirect.com") && !url.includes("linkinghub.elsevier.com")) continue;
    const pii = extractPii(url);
    if (pii) piis.add(pii);
  }

  for (const pii of piis) {
    for (const candidate of buildElsCdnCandidates(pii)) {
      if (await verifyFigureImageUrl(candidate)) return candidate;
    }
  }

  return null;
}
