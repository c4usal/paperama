import { resolveElifeHeroImage } from "@/lib/figures/elife";
import { extractImageCandidatesFromHtml } from "@/lib/figures/html-images";
import { resolveFrontiersHeroImage } from "@/lib/figures/frontiers";
import { normalizeDoi } from "@/lib/figures/landing-urls";
import { resolveMdpiHeroImage } from "@/lib/figures/mdpi";
import { resolvePlosHeroImage } from "@/lib/figures/plos";
import { resolveScienceDirectHeroImage } from "@/lib/figures/sciencedirect";
import { resolveSpringerHeroImage } from "@/lib/figures/springer";
import { fetchHtml, verifyFigureImageUrl } from "@/lib/figures/verify";

/** Resolve a hero image from a DOI via publisher APIs and doi.org landing HTML. */
export async function resolveHeroFromDoi(
  doi: string,
  oaUrl?: string,
): Promise<string | null> {
  const bare = normalizeDoi(doi);
  if (!bare) return null;

  const landing = `https://doi.org/${bare}`;

  const resolvers = [
    () => resolvePlosHeroImage({ doi: bare, oaUrl }),
    () => resolveSpringerHeroImage(bare),
    () => resolveMdpiHeroImage({ doi: bare, oaUrl }),
    () => resolveElifeHeroImage(bare),
    () => resolveFrontiersHeroImage({ doi: bare, oaUrl }),
    () => resolveScienceDirectHeroImage([oaUrl ?? landing, landing]),
  ];

  for (const resolve of resolvers) {
    const hero = await resolve();
    if (hero) return hero;
  }

  const html = await fetchHtml(landing);
  if (!html) return null;

  const candidates = extractImageCandidatesFromHtml(html, landing);
  for (const candidate of candidates) {
    if (await verifyFigureImageUrl(candidate)) return candidate;
  }

  return null;
}
