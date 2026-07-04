/** Composite cursor for rotating across topic streams (for-you / topics / following). */
export type TopicStreamCursor = {
  topicIndex: number;
  openAlexCursor: string | null;
};

/** Offset cursor for saved-id pagination. */
export type SavedListCursor = {
  offset: number;
};

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
