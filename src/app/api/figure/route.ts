import { NextRequest } from "next/server";

import { isLikelyFigureImage } from "@/lib/figures/image-filter";

// Must run on the Workers runtime (not Node-only) so production images work.

const UPSTREAM_HEADERS = {
  "User-Agent": "Mozilla/5.0 (compatible; Paperama/0.1; +https://paperama.dev)",
  Accept: "image/*,*/*;q=0.8",
};

function sniffImageContentType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return new Response("Missing url", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return new Response("Invalid protocol", { status: 400 });
  }

  // Soft filter: reject only known branding/avatars; allow indexed heroes through.
  if (/favicon|avatar|orcid\.org|gravatar|arxiv-logo/i.test(url)) {
    return new Response("Forbidden", { status: 403 });
  }

  // Keep stricter figure heuristics as a preference signal, not a hard block.
  void isLikelyFigureImage(url);

  try {
    const upstream = await fetch(url, {
      headers: UPSTREAM_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
    });

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    const buffer = await upstream.arrayBuffer();
    const headerType = upstream.headers.get("content-type")?.split(";")[0]?.trim() ?? "";
    const contentType =
      headerType.startsWith("image/") ? headerType : sniffImageContentType(buffer);

    if (!contentType) {
      return new Response("Not an image", { status: 415 });
    }

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
