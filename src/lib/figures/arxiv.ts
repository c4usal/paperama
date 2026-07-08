import { extractImageCandidatesFromHtml } from "@/lib/figures/html-images";
import { fetchHtml, verifyFigureImageUrl } from "@/lib/figures/verify";

function normalizeArxivId(arxiv: string): string {
  return arxiv
    .replace("https://arxiv.org/abs/", "")
    .replace("https://arxiv.org/pdf/", "")
    .replace(/\.pdf$/i, "");
}

export async function resolveArxivHeroImage(arxiv?: string | null): Promise<string | null> {
  if (!arxiv) return null;

  const id = normalizeArxivId(arxiv);
  const htmlUrl = `https://arxiv.org/html/${id}`;

  const html = await fetchHtml(htmlUrl);
  if (!html) return null;

  const candidates = extractImageCandidatesFromHtml(html, htmlUrl);

  for (const url of candidates) {
    if (await verifyFigureImageUrl(url)) return url;
  }

  return null;
}
