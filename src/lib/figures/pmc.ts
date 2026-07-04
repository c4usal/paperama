import { verifyImageUrl } from "@/lib/figures/verify";

const EUROPE_PMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search";

function normalizePmcId(pmcid: string): string {
  const raw = pmcid.replace("https://www.ncbi.nlm.nih.gov/pmc/articles/", "").replace(/\/$/, "");
  return raw.startsWith("PMC") ? raw : `PMC${raw}`;
}

function extractPmid(pmid: string | undefined): string | null {
  if (!pmid) return null;
  const match = pmid.match(/(\d+)/);
  return match?.[1] ?? null;
}

async function lookupPmcIdFromPmid(pmid: string): Promise<string | null> {
  const url = new URL(EUROPE_PMC_SEARCH);
  url.searchParams.set("query", `EXT_ID:${pmid}`);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", "1");

  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Paperama/0.1" },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    resultList?: { result?: Array<{ pmcid?: string }> };
  };

  const pmcid = data.resultList?.result?.[0]?.pmcid;
  return pmcid ? normalizePmcId(pmcid) : null;
}

function buildPmcFigureCandidates(pmcid: string, filename: string): string[] {
  const base = `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}`;
  return [
    `${base}/bin/${filename}`,
    `${base}/figure/F1/${filename}`,
    `${base}/figure/F1/`,
    `https://www.ebi.ac.uk/europepmc/webservices/rest/${pmcid}/image/${encodeURIComponent(filename)}`,
  ];
}


async function resolvePmcFigureUrl(pmcid: string): Promise<string | null> {
  const normalized = normalizePmcId(pmcid);
  const xmlUrl = `https://www.ebi.ac.uk/europepmc/webservices/rest/${normalized}/fullTextXML`;

  const response = await fetch(xmlUrl, {
    headers: { Accept: "application/xml", "User-Agent": "Paperama/0.1" },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return null;

  const xml = await response.text();
  const graphics = [...xml.matchAll(/xlink:href="([^"]+)"/gi)]
    .map((match) => match[1])
    .filter(
      (href) =>
        /\.(jpg|jpeg|png|gif)$/i.test(href) &&
        !href.includes("creativecommons.org"),
    );

  for (const filename of graphics) {
    if (filename.startsWith("http")) {
      if (await verifyImageUrl(filename)) return filename;
      continue;
    }

    for (const candidate of buildPmcFigureCandidates(normalized, filename)) {
      if (await verifyImageUrl(candidate)) return candidate;
    }
  }

  return null;
}

export async function resolvePmcHeroImage(options: {
  pmcid?: string | null;
  pmid?: string | null;
}): Promise<string | null> {
  let pmcid = options.pmcid ? normalizePmcId(options.pmcid) : null;

  if (!pmcid) {
    const pmid = extractPmid(options.pmid ?? undefined);
    if (!pmid) return null;
    pmcid = await lookupPmcIdFromPmid(pmid);
  }

  if (!pmcid) return null;

  return resolvePmcFigureUrl(pmcid);
}
