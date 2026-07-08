import type { FeedCard } from "@/types/card";
import type { FeedEntityFilter } from "@/types/feed";
import { getTopic } from "@/lib/topics";

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function cardMatchesSearch(card: FeedCard, searchQuery: string): boolean {
  const q = normalize(searchQuery);
  if (!q) return true;

  const haystack = [
    card.title,
    card.tldr,
    card.abstract,
    card.matchLabel,
    card.journal,
    ...card.authorNames,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}

export function cardMatchesEntityFilter(card: FeedCard, filter: FeedEntityFilter): boolean {
  if (filter.type === "topic") {
    const bySlug = getTopic(filter.value);
    if (bySlug) return card.topicSlug === bySlug.slug;

    const value = normalize(filter.value);
    return (
      normalize(card.matchLabel ?? "") === value ||
      normalize(card.matchLabel ?? "").includes(value) ||
      value.includes(normalize(card.matchLabel ?? ""))
    );
  }

  if (filter.type === "journal") {
    return normalize(card.journal).includes(normalize(filter.value));
  }

  return card.authorNames.some((author) =>
    normalize(author).includes(normalize(filter.value)),
  );
}

export function cardMatchesSelectedTopics(card: FeedCard, selectedSlugs: string[]): boolean {
  if (selectedSlugs.length === 0) return true;
  if (card.topicSlug) return selectedSlugs.includes(card.topicSlug);

  const label = normalize(card.matchLabel ?? "");
  return selectedSlugs.some((slug) => {
    const topic = getTopic(slug);
    if (!topic) return false;
    const topicLabel = normalize(topic.label);
    return label === topicLabel || label.includes(topicLabel) || topicLabel.includes(label);
  });
}

export function dedupeCards(cards: FeedCard[]): FeedCard[] {
  const seen = new Set<string>();
  const result: FeedCard[] = [];

  for (const card of cards) {
    if (seen.has(card.openAlexId)) continue;
    seen.add(card.openAlexId);
    result.push(card);
  }

  return result;
}
