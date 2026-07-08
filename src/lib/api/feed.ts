import type { FeedApiRequest, FeedApiResponse } from "@/lib/api/feed-types";

export class FeedApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "FeedApiError";
  }
}

export async function fetchFeed(request: FeedApiRequest): Promise<FeedApiResponse> {
  const params = new URLSearchParams();
  params.set("tab", request.tab);

  if (request.cursor) params.set("cursor", request.cursor);
  if (request.limit) params.set("limit", String(request.limit));
  if (request.searchQuery?.trim()) params.set("q", request.searchQuery.trim());
  if (request.fields?.length) params.set("fields", request.fields.join(","));

  if (request.entityFilter) {
    params.set("filterType", request.entityFilter.type);
    params.set("filterValue", request.entityFilter.value);
  }

  if (request.savedIds?.length) {
    params.set("savedIds", request.savedIds.join(","));
  }

  if (request.tab === "for-you" && request.selectedTopicSlugs !== undefined) {
    params.set("topics", request.selectedTopicSlugs.join(","));
  }

  const response = await fetch(`/api/feed?${params.toString()}`, {
    signal: request.signal,
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new FeedApiError(body?.error ?? "Failed to load feed", response.status);
  }

  return response.json() as Promise<FeedApiResponse>;
}
