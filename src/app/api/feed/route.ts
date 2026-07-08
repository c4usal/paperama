import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

import { assembleFeed, DEFAULT_FEED_LIMIT, type AssembleFeedInput } from "@/lib/feed/assemble";
import { assembleFeedFromD1Index, type D1Like } from "@/lib/feed/index/assemble-d1";
import type { FeedEntityFilter, FeedNavTab } from "@/types/feed";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const CACHE_TTL_SECONDS = 900;

function parseTab(value: string | null): FeedNavTab {
  if (value === "saved" || value === "topics") return value;
  return "for-you";
}

function parseEntityFilter(
  type: string | null,
  value: string | null,
): FeedEntityFilter | null {
  if (!type || !value) return null;
  if (type === "researcher" || type === "journal" || type === "topic") {
    return { type, value };
  }
  return null;
}

function parseSelectedTopics(raw: string | null): string[] | undefined {
  if (raw === null) return undefined;
  if (raw === "") return [];
  return raw.split(",").map((slug) => slug.trim()).filter(Boolean);
}

/** Assembly ignores savedIds on for-you — keep them out of the cache key. */
function feedCacheKeyInput(input: AssembleFeedInput): AssembleFeedInput {
  if (input.tab !== "for-you") return input;
  const { savedIds: _savedIds, ...rest } = input;
  return rest;
}

const getCachedFeed = unstable_cache(
  async (cacheKey: string) => {
    const result = await assembleFeed(JSON.parse(cacheKey) as AssembleFeedInput);
    if (result.items.length === 0) {
      throw new Error("EMPTY_FEED");
    }
    return result;
  },
  ["paperama-feed-v6"],
  { revalidate: CACHE_TTL_SECONDS },
);

async function getD1FeedIndexBinding(): Promise<D1Like | undefined> {
  try {
    const context = await getCloudflareContext({ async: true });
    const env = context?.env as Record<string, unknown> | undefined;
    const binding = env?.PAPERAMA_FEED_INDEX;
    if (binding && typeof binding === "object" && "prepare" in binding) {
      return binding as D1Like;
    }
  } catch {
    // Running outside Cloudflare context (local Next server)
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tab = parseTab(searchParams.get("tab"));
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_FEED_LIMIT), 24);
  const fields = searchParams.get("fields")?.split(",").filter(Boolean);
  const searchQuery = searchParams.get("q") ?? undefined;
  const entityFilter = parseEntityFilter(
    searchParams.get("filterType"),
    searchParams.get("filterValue"),
  );
  const savedIds = searchParams.get("savedIds")?.split(",").filter(Boolean);
  const selectedTopicSlugs = parseSelectedTopics(searchParams.get("topics"));

  const input: AssembleFeedInput = {
    tab,
    cursor,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_FEED_LIMIT,
    fields,
    searchQuery,
    entityFilter,
    savedIds,
    selectedTopicSlugs,
  };

  try {
    const d1FeedIndex = await getD1FeedIndexBinding();
    const useFeedIndex = process.env.USE_FEED_INDEX !== "false";

    // On Cloudflare, stay on D1. Falling through to live OpenAlex assembly
    // regularly times out and leaves a broken feed with no scroll.
    if (d1FeedIndex && useFeedIndex && input.tab === "for-you") {
      try {
        const indexed = await assembleFeedFromD1Index(d1FeedIndex, input);
        return NextResponse.json(indexed);
      } catch (indexError) {
        console.error("[api/feed] D1 index failed", indexError);
        return NextResponse.json(
          { error: "Feed index unavailable. Please try again." },
          { status: 503 },
        );
      }
    }

    const cacheKey = JSON.stringify(feedCacheKeyInput(input));
    try {
      const result = await getCachedFeed(cacheKey);
      return NextResponse.json(result);
    } catch (error) {
      if (error instanceof Error && error.message === "EMPTY_FEED") {
        const fresh = await assembleFeed(input);
        return NextResponse.json(fresh);
      }
      throw error;
    }
  } catch (error) {
    console.error("[api/feed]", error);
    return NextResponse.json(
      { error: "Unable to load feed from OpenAlex. Please try again." },
      { status: 502 },
    );
  }
}
