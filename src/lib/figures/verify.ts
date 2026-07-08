import { isLikelyFigureImage, isTrustedFigureEndpoint } from "@/lib/figures/image-filter";

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Paperama/0.1; +https://paperama.dev)",
};

/** HEAD with GET fallback — some CDNs reject HEAD. */
export async function verifyImageUrl(url: string): Promise<boolean> {
  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (head.ok) {
      const type = head.headers.get("content-type") ?? "";
      if (type.startsWith("image/")) return true;
    }

    if (head.status === 405 || head.status === 403 || !head.ok) {
      const get = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { ...FETCH_HEADERS, Range: "bytes=0-512" },
        signal: AbortSignal.timeout(8000),
      });
      const type = get.headers.get("content-type") ?? "";
      return get.ok && type.startsWith("image/");
    }

    return false;
  } catch {
    return false;
  }
}

/** Verify URL is reachable and looks like a paper figure, not a logo or portrait. */
export async function verifyFigureImageUrl(url: string): Promise<boolean> {
  if (!isLikelyFigureImage(url)) return false;

  const timeoutMs = isTrustedFigureEndpoint(url) ? 3500 : 8000;

  try {
    const head = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (head.ok) {
      const type = head.headers.get("content-type") ?? "";
      if (type.startsWith("image/")) return true;
    }

    const get = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { ...FETCH_HEADERS, Range: "bytes=0-512" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const type = get.headers.get("content-type") ?? "";
    return get.ok && type.startsWith("image/");
  } catch {
    return false;
  }
}

export async function fetchHtml(url: string, timeoutMs = 10000): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        ...FETCH_HEADERS,
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.includes("text/html") && !type.includes("application/xhtml")) return null;

    return await response.text();
  } catch {
    return null;
  }
}
