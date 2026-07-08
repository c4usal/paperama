import type { AssembleFeedInput, AssembleFeedResult } from "@/lib/feed/assemble";
import { DEFAULT_FEED_LIMIT } from "@/lib/feed/assemble";
import { decodeSavedListCursor, encodeSavedListCursor } from "@/lib/feed/cursor";
import { countEnrichedForTopics, queryEnrichedPapers, rowToPaperFeedItem } from "@/lib/feed/index/store";
import { FEED_BUFFER_TARGET, FIRST_LOAD_LIMIT } from "@/lib/feed/warm-feed-caches";
import { getTopic } from "@/lib/topics";

function resolveTopicSlugs(selectedTopicSlugs?: string[]): string[] {
  if (selectedTopicSlugs === undefined) {
    return [];
  }
  return selectedTopicSlugs.filter((slug) => Boolean(getTopic(slug)));
}

/** Pick a random start that still leaves enough papers ahead for scrolling. */
function pickRandomStartOffset(total: number, pageSize: number): number {
  if (total <= pageSize) return 0;

  const runway = Math.min(FEED_BUFFER_TARGET, total - pageSize);
  const maxStart = Math.max(0, total - runway);
  return Math.floor(Math.random() * (maxStart + 1));
}

export async function assembleFeedFromIndex(input: AssembleFeedInput): Promise<AssembleFeedResult> {
  const topicSlugs = resolveTopicSlugs(input.selectedTopicSlugs);

  if (topicSlugs.length === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const total = countEnrichedForTopics(topicSlugs);
  if (total === 0) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  const isFirstPage = input.cursor == null;
  const limit = isFirstPage
    ? Math.min(input.limit ?? FIRST_LOAD_LIMIT, FIRST_LOAD_LIMIT)
    : (input.limit ?? DEFAULT_FEED_LIMIT);

  const offset = isFirstPage
    ? pickRandomStartOffset(total, limit)
    : decodeSavedListCursor(input.cursor ?? null).offset;

  const rows = queryEnrichedPapers({ topicSlugs, limit, offset });
  let items = rows.map(rowToPaperFeedItem);
  let wrapCount = 0;

  if (items.length < limit && total > items.length) {
    const wrapRows = queryEnrichedPapers({
      topicSlugs,
      limit: limit - items.length,
      offset: 0,
    });
    const seen = new Set(items.map((item) => item.openAlexId));
    for (const item of wrapRows.map(rowToPaperFeedItem)) {
      if (seen.has(item.openAlexId)) continue;
      seen.add(item.openAlexId);
      items.push(item);
      wrapCount += 1;
    }
  }

  const advanced = offset + rows.length;
  const nextOffset = wrapCount > 0 ? wrapCount % total : advanced % total;
  const hasMore = total > Math.min(limit, total);

  return {
    items,
    nextCursor: hasMore ? encodeSavedListCursor({ offset: nextOffset }) : null,
    hasMore,
  };
}
