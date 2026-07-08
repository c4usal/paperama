import type { NormalizeContext } from "@/lib/openalex/normalize";
import type { OpenAlexWork } from "@/lib/openalex/types";
import { getTopicByConceptId } from "@/lib/topics";

/** Pick the highest-scoring launch-topic concept on a work for match labels. */
export function inferTopicFromWork(work: OpenAlexWork): NormalizeContext {
  const concepts = work.concepts ?? [];
  let best: { matchLabel: string; topicSlug: string; score: number } | null = null;

  for (const concept of concepts) {
    const topic = getTopicByConceptId(concept.id ?? "");
    if (!topic) continue;

    const score = concept.score ?? 0;
    if (!best || score > best.score) {
      best = {
        matchLabel: topic.label,
        topicSlug: topic.slug,
        score,
      };
    }
  }

  if (best) {
    return { matchLabel: best.matchLabel, topicSlug: best.topicSlug };
  }

  return {};
}
