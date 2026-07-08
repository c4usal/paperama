import { isLikelyFigureImage } from "@/lib/figures/image-filter";

const DEFAULT_BASE_URL = "http://127.0.0.1:8100";
const DEFAULT_TIMEOUT_MS = 25_000;

export function enrichmentServiceUrl(): string | null {
  const url = process.env.ENRICHMENT_SERVICE_URL?.trim();
  if (!url) return null;
  return url.replace(/\/$/, "");
}

function baseUrl(): string {
  return enrichmentServiceUrl() ?? DEFAULT_BASE_URL;
}

type SummarizeResponse = { summary?: string | null };
type FiguresResponse = { heroImageUrl?: string | null; candidates?: string[] };

export async function summarizeViaEnrichment(
  text: string,
  sentences = 2,
): Promise<string | null> {
  if (!text.trim()) return null;

  try {
    const response = await fetch(`${baseUrl()}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sentences }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as SummarizeResponse;
    const summary = data.summary?.trim();
    return summary || null;
  } catch {
    return null;
  }
}

/** Discover a hero image URL via crawl4ai — returns a hotlink only, never downloads. */
export async function resolveHeroViaCrawl4ai(landingUrl: string): Promise<string | null> {
  if (!landingUrl.startsWith("http")) return null;

  try {
    const response = await fetch(`${baseUrl()}/figures`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: landingUrl }),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as FiguresResponse;
    const hero = data.heroImageUrl ?? null;
    return hero && isLikelyFigureImage(hero) ? hero : null;
  } catch {
    return null;
  }
}

export async function enrichmentServiceHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl()}/health`, {
      signal: AbortSignal.timeout(3000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
