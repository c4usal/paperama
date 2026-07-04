import type { FeedCard } from "@/types/card";
import type { FeedEntityFilter, FollowingState } from "@/types/feed";

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

export function cardMatchesFollowing(card: FeedCard, following: FollowingState): boolean {
  const authorMatch = following.researchers.some((researcher) =>
    card.authorNames.some((author) =>
      normalize(author).includes(normalize(researcher.name)),
    ),
  );

  const journalMatch = following.journals.some((journal) =>
    normalize(card.journal).includes(normalize(journal.name)),
  );

  const topicMatch = following.topics.some((topic) => {
    const t = normalize(topic);
    const label = normalize(card.matchLabel ?? "");
    return label === t || label.includes(t) || t.includes(label);
  });

  return authorMatch || journalMatch || topicMatch;
}

export function cardMatchesTopicsTab(card: FeedCard, following: FollowingState): boolean {
  if (following.topics.length === 0) return true;
  return cardMatchesFollowing(card, { researchers: [], journals: [], topics: following.topics });
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
