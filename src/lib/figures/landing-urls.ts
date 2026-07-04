import type { OpenAlexWork } from "@/lib/openalex/types";

function normalizeDoi(doi: string | undefined): string | null {
  if (!doi) return null;
  return doi.replace(/^https?:\/\/doi\.org\//i, "").trim() || null;
}

/** All landing URLs we can scrape or pattern-match for figures. */
export function collectLandingUrls(work: OpenAlexWork): string[] {
  const urls = new Set<string>();

  const add = (url: string | null | undefined) => {
    if (!url?.startsWith("http")) return;
    urls.add(url);
  };

  add(work.open_access?.oa_url);
  add(work.best_oa_location?.landing_page_url);
  add(work.best_oa_location?.pdf_url);
  add(work.primary_location?.landing_page_url);
  add(work.primary_location?.pdf_url);

  for (const location of work.locations ?? []) {
    add(location.landing_page_url);
    add(location.pdf_url);
  }

  const doi = normalizeDoi(work.ids?.doi);
  if (doi) {
    urls.add(`https://doi.org/${doi}`);
  }

  return [...urls];
}

export { normalizeDoi };
