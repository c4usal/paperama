import type { OaSource } from "@/types/paper";

import type { OpenAlexWork } from "@/lib/openalex/types";

/** Hosts we never use as Read links (paywalled publishers). */
const BLOCKED_HOST_SUFFIXES = [
  "sciencedirect.com",
  "linkinghub.elsevier.com",
  "onlinelibrary.wiley.com",
  "tandfonline.com",
  "springer.com",
  "ac.els-cdn.com",
  "cell.com",
];

/** Trusted OA hosts for repository / gold-OA links. */
const ALLOWED_HOST_SUFFIXES = [
  "arxiv.org",
  "ncbi.nlm.nih.gov",
  "biorxiv.org",
  "medrxiv.org",
  "mdpi.com",
  "frontiersin.org",
  "zenodo.org",
  "plos.org",
  "biomedcentral.com",
  "researchsquare.com",
  "ssrn.com",
  "hal.science",
  "osf.io",
  "copernicus.org",
  "ebi.ac.uk",
  "f1000research.com",
];

function parseHostname(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function hostMatchesSuffix(hostname: string, suffix: string): boolean {
  return hostname === suffix || hostname.endsWith(`.${suffix}`);
}

export function isBlockedOaHost(hostname: string): boolean {
  return BLOCKED_HOST_SUFFIXES.some((suffix) => hostMatchesSuffix(hostname, suffix));
}

export function isAllowedOaUrl(url: string): boolean {
  const hostname = parseHostname(url);
  if (!hostname || isBlockedOaHost(hostname)) return false;

  if (hostname === "doi.org") {
    return /10\.5281\/zenodo|10\.6084\/m9\.figshare/i.test(url);
  }

  if (hostMatchesSuffix(hostname, "nature.com")) {
    return /\/articles\/s41598-/i.test(url);
  }

  return ALLOWED_HOST_SUFFIXES.some((suffix) => hostMatchesSuffix(hostname, suffix));
}

function normalizeArxivId(arxiv: string): string {
  return arxiv
    .replace("https://arxiv.org/abs/", "")
    .replace("https://arxiv.org/pdf/", "")
    .replace(/\.pdf$/i, "");
}

function normalizePmcId(pmcid: string): string {
  const raw = pmcid
    .replace("https://www.ncbi.nlm.nih.gov/pmc/articles/", "")
    .replace(/\/$/, "");
  return raw.startsWith("PMC") ? raw : `PMC${raw}`;
}

function scoreOaCandidate(url: string): number {
  if (url.includes("ncbi.nlm.nih.gov/pmc")) return 0;
  if (url.includes("journals.plos.org") || url.includes("plos.org")) return 1;
  if (url.includes("mdpi.com")) return 1;
  if (url.includes("frontiersin.org")) return 1;
  if (url.includes("biomedcentral.com")) return 1;
  if (url.includes("f1000research.com")) return 1;
  if (url.includes("elifesciences.org") || url.includes("10.7554/elife")) return 1;
  if (url.includes("arxiv.org/abs/")) return 1;
  if (url.includes("arxiv.org")) return 2;
  if (isDownloadUrl(url)) return 50;
  if (url.includes("pubmed.ncbi.nlm.nih.gov")) return 8;
  if (url.includes("doi.org")) return 5;
  return 4;
}

function isDownloadUrl(url: string): boolean {
  return (
    /\.pdf($|\?|#)/i.test(url) ||
    /\/download\//i.test(url) ||
    /servlets\/purl/i.test(url) ||
    /type=application\/pdf/i.test(url) ||
    /\/pdf$/i.test(url)
  );
}

export function isPubmedOnlyOaUrl(url: string): boolean {
  return url.includes("pubmed.ncbi.nlm.nih.gov") && !url.includes("/pmc/");
}

export function resolveOaUrl(work: OpenAlexWork): { url: string; source: OaSource } | null {
  if (work.ids?.arxiv) {
    const arxivId = normalizeArxivId(work.ids.arxiv);
    return {
      url: `https://arxiv.org/abs/${arxivId}`,
      source: "arxiv",
    };
  }

  if (work.ids?.pmcid) {
    const pmcId = normalizePmcId(work.ids.pmcid);
    return {
      url: `https://pmc.ncbi.nlm.nih.gov/articles/${pmcId}/`,
      source: "pmc",
    };
  }

  const candidates = [
    work.best_oa_location?.landing_page_url,
    work.open_access?.oa_url,
    ...(work.locations?.map((location) => location.landing_page_url) ?? []),
    work.best_oa_location?.pdf_url,
    ...(work.locations?.map((location) => location.pdf_url) ?? []),
  ].filter((url): url is string => Boolean(url));

  const ranked = [...new Set(candidates)].sort((a, b) => scoreOaCandidate(a) - scoreOaCandidate(b));

  for (const url of ranked) {
    if (url.includes("ncbi.nlm.nih.gov/pmc")) {
      return { url, source: "pmc" };
    }
  }

  for (const url of ranked) {
    if (isDownloadUrl(url)) continue;
    if (!isAllowedOaUrl(url)) continue;

    if (url.includes("ncbi.nlm.nih.gov/pmc")) {
      return { url, source: "pmc" };
    }
    if (url.includes("arxiv.org")) {
      return { url, source: "arxiv" };
    }
    return { url, source: "repository" };
  }

  const bareDoi = work.ids?.doi?.replace(/^https?:\/\/doi\.org\//i, "").trim();
  if (bareDoi) {
    return { url: `https://doi.org/${bareDoi}`, source: "repository" };
  }

  // OA-flagged works on publisher pages (ScienceDirect, Wiley, etc.) — link out for Read.
  if (work.open_access?.is_oa) {
    for (const url of ranked) {
      if (isDownloadUrl(url)) continue;
      const hostname = parseHostname(url);
      if (!hostname || hostname === "doi.org") continue;
      if (url.includes("pubmed.ncbi.nlm.nih.gov") && !url.includes("/pmc/")) continue;

      if (url.includes("ncbi.nlm.nih.gov/pmc")) {
        return { url, source: "pmc" };
      }
      if (url.includes("arxiv.org")) {
        return { url, source: "arxiv" };
      }
      return { url, source: "repository" };
    }
  }

  return null;
}

/** Work is eligible for the feed only if we can link to an allowed OA page. */
export function isEligibleOpenAccessWork(work: OpenAlexWork): boolean {
  return resolveOaUrl(work) !== null;
}
