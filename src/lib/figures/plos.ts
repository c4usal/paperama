import { isTrustedFigureEndpoint } from "@/lib/figures/image-filter";
import { verifyFigureImageUrl } from "@/lib/figures/verify";

const PLOS_JOURNAL_SLUGS: Record<string, string> = {
  pone: "plosone",
  pbio: "plosbiology",
  pcbi: "ploscompbiol",
  ppat: "plospathogens",
  pgen: "plosgenetics",
  pmed: "plosmedicine",
  pntd: "plosntds",
  pctr: "plosclinicaltrials",
};

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

function buildPlosFigureCandidates(doi: string): string[] {
  const candidates: string[] = [];
  const journalMatch = doi.match(/10\.1371\/journal\.([a-z]+)\./i);
  const journalCode = journalMatch?.[1]?.toLowerCase();

  if (journalCode && PLOS_JOURNAL_SLUGS[journalCode]) {
    const slug = PLOS_JOURNAL_SLUGS[journalCode];
    candidates.push(
      `https://journals.plos.org/${slug}/article/figure/image?size=large&id=${doi}.g001`,
    );
  }

  for (const slug of Object.values(PLOS_JOURNAL_SLUGS)) {
    const url = `https://journals.plos.org/${slug}/article/figure/image?size=large&id=${doi}.g001`;
    if (!candidates.includes(url)) candidates.push(url);
  }

  return candidates;
}

/** First figure from PLOS OA articles via stable figure image endpoint. */
export async function resolvePlosHeroImage(options: {
  doi?: string;
  oaUrl?: string;
}): Promise<string | null> {
  const doi = normalizeDoi(options.doi);
  if (!doi) return null;

  const isPlosDoi = /10\.1371\/journal\.[a-z]+\./i.test(doi);
  const oaUrl = options.oaUrl ?? "";

  if (!isPlosDoi && oaUrl && !isPlosHost(oaUrl)) return null;

  for (const url of buildPlosFigureCandidates(doi)) {
    if (isTrustedFigureEndpoint(url)) return url;
    if (await verifyFigureImageUrl(url)) return url;
  }

  return null;
}
