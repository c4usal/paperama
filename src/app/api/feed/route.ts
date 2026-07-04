import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { assembleFeed, DEFAULT_FEED_LIMIT, type AssembleFeedInput } from "@/lib/feed/assemble";
import type { FeedEntityFilter, FeedNavTab, FollowingState } from "@/types/feed";

export const dynamic = "force-dynamic";

const CACHE_TTL_SECONDS = 900;

function parseTab(value: string | null): FeedNavTab {
  if (value === "following" || value === "saved" || value === "topics") return value;
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

function parseFollowing(raw: string | null): FollowingState | undefined {
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as {
      researchers?: string[];
      journals?: string[];
      topics?: string[];
    };

    return {
      researchers: (parsed.researchers ?? []).map((name, index) => ({
        id: `r-${index}`,
        name,
        hint: "",
      })),
      journals: (parsed.journals ?? []).map((name, index) => ({
        id: `j-${index}`,
        name,
      })),
      topics: parsed.topics ?? [],
    };
  } catch {
    return undefined;
  }
}

const getCachedFeed = unstable_cache(
  async (cacheKey: string) => assembleFeed(JSON.parse(cacheKey) as AssembleFeedInput),
  ["paperama-feed"],
  { revalidate: CACHE_TTL_SECONDS },
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const tab = parseTab(searchParams.get("tab"));
  const cursor = searchParams.get("cursor");
  const limit = Math.min(Number(searchParams.get("limit") ?? DEFAULT_FEED_LIMIT), 20);
  const fields = searchParams.get("fields")?.split(",").filter(Boolean);
  const searchQuery = searchParams.get("q") ?? undefined;
  const entityFilter = parseEntityFilter(
    searchParams.get("filterType"),
    searchParams.get("filterValue"),
  );
  const savedIds = searchParams.get("savedIds")?.split(",").filter(Boolean);
  const following = parseFollowing(searchParams.get("following"));

  const input: AssembleFeedInput = {
    tab,
    cursor,
    limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_FEED_LIMIT,
    fields,
    searchQuery,
    entityFilter,
    savedIds,
    following,
  };

  try {
    const cacheKey = JSON.stringify(input);
    const result = await getCachedFeed(cacheKey);
    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/feed]", error);
    return NextResponse.json(
      { error: "Unable to load feed from OpenAlex. Please try again." },
      { status: 502 },
    );
  }
}
