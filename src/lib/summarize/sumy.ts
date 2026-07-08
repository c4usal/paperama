import { summarizeViaEnrichment, enrichmentServiceUrl } from "@/lib/enrichment/client";
import { abstractToSnippet } from "@/lib/openalex/abstract";
import type { FeedCard } from "@/types/card";

/** Replace raw abstract snippet with sumy LexRank summary when enrichment service is up. */
export async function enrichCardTldr(card: FeedCard): Promise<void> {
  if (!enrichmentServiceUrl()) return;

  const source = card.abstract?.trim() || card.tldr.trim();
  if (source.split(/\s+/).length < 40) return;

  const summary = await summarizeViaEnrichment(source, 2);
  if (summary) card.tldr = summary;
}

export function fallbackTldr(abstract: string, title: string): string {
  return abstractToSnippet(abstract) || title;
}
