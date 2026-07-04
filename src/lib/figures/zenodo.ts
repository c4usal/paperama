import { normalizeDoi } from "@/lib/figures/landing-urls";
import { resolveHeroFromDoi } from "@/lib/figures/resolve-from-doi";

type ZenodoRecord = {
  metadata?: {
    related_identifiers?: Array<{
      identifier?: string;
      scheme?: string;
      relation?: string;
      resource_type?: string;
    }>;
  };
};

function extractZenodoId(url: string): string | null {
  const match = url.match(/zenodo\.org\/(?:records\/)?(\d+)/i);
  return match?.[1] ?? null;
}

/** Zenodo datasets often link to a published article DOI — resolve figure from that paper. */
export async function resolveZenodoHeroImage(oaUrl: string): Promise<string | null> {
  const recordId = extractZenodoId(oaUrl);
  if (!recordId) return null;

  try {
    const response = await fetch(`https://zenodo.org/api/records/${recordId}`, {
      headers: { Accept: "application/json", "User-Agent": "Paperama/0.1" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as ZenodoRecord;
    const related = data.metadata?.related_identifiers ?? [];

    const dois = related
      .filter((item) => item.scheme === "doi" && item.identifier)
      .sort((a, b) => {
        const score = (item: (typeof related)[number]) => {
          if (item.resource_type === "publication-article") return 0;
          if (item.relation === "isPublishedVersionOf") return 1;
          if (item.relation === "isCompiledBy") return 2;
          return 3;
        };
        return score(a) - score(b);
      })
      .map((item) => normalizeDoi(item.identifier))
      .filter((doi): doi is string => Boolean(doi));

    for (const doi of dois) {
      const hero = await resolveHeroFromDoi(doi);
      if (hero) return hero;
    }
  } catch {
    return null;
  }

  return null;
}
