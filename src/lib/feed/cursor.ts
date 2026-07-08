/** Composite cursor for rotating across topic streams (legacy). */
export type TopicStreamCursor = {
  topicIndex: number;
  openAlexCursor: string | null;
};

/** Single OpenAlex cursor for the broad multi-concept stream. */
export type OpenAlexBroadCursor = {
  v: 2;
  openAlexCursor: string | null;
};

/** Offset cursor for saved-id pagination. */
export type SavedListCursor = {
  offset: number;
};

/** Per-topic OpenAlex cursors for multi-topic feed pagination. */
export type MultiTopicCursor = {
  v: 3;
  bySlug: Record<string, string | null>;
};

export function encodeOpenAlexBroadCursor(cursor: OpenAlexBroadCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeOpenAlexBroadCursor(value: string | null): OpenAlexBroadCursor {
  if (!value) return { v: 2, openAlexCursor: null };

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as
      | OpenAlexBroadCursor
      | TopicStreamCursor;

    if (parsed && typeof parsed === "object" && "v" in parsed && parsed.v === 2) {
      if (typeof parsed.openAlexCursor === "string" || parsed.openAlexCursor === null) {
        return parsed;
      }
    }

    if (
      parsed &&
      typeof parsed === "object" &&
      "topicIndex" in parsed &&
      typeof parsed.topicIndex === "number" &&
      (typeof parsed.openAlexCursor === "string" || parsed.openAlexCursor === null)
    ) {
      return { v: 2, openAlexCursor: parsed.openAlexCursor };
    }
  } catch {
    // fall through
  }

  return { v: 2, openAlexCursor: null };
}

export function encodeTopicStreamCursor(cursor: TopicStreamCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTopicStreamCursor(value: string | null): TopicStreamCursor {
  if (!value) return { topicIndex: 0, openAlexCursor: null };

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as TopicStreamCursor;
    if (
      typeof parsed.topicIndex === "number" &&
      (typeof parsed.openAlexCursor === "string" || parsed.openAlexCursor === null)
    ) {
      return parsed;
    }
  } catch {
    // fall through
  }

  return { topicIndex: 0, openAlexCursor: null };
}

export function encodeSavedListCursor(cursor: SavedListCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function encodeMultiTopicCursor(cursor: MultiTopicCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeMultiTopicCursor(
  value: string | null,
  slugs: string[],
): MultiTopicCursor {
  const empty = Object.fromEntries(slugs.map((slug) => [slug, null])) as Record<
    string,
    string | null
  >;

  if (!value) return { v: 3, bySlug: empty };

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as MultiTopicCursor;
    if (parsed?.v === 3 && parsed.bySlug && typeof parsed.bySlug === "object") {
      const bySlug = { ...empty };
      for (const slug of slugs) {
        const cursor = parsed.bySlug[slug];
        if (typeof cursor === "string" || cursor === null) {
          bySlug[slug] = cursor;
        }
      }
      return { v: 3, bySlug };
    }
  } catch {
    // fall through
  }

  return { v: 3, bySlug: empty };
}

export function decodeSavedListCursor(value: string | null): SavedListCursor {
  if (!value) return { offset: 0 };

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as SavedListCursor;
    if (typeof parsed.offset === "number" && parsed.offset >= 0) {
      return parsed;
    }
  } catch {
    // fall through
  }

  return { offset: 0 };
}
