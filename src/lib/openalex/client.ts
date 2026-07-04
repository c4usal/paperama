const OPENALEX_BASE = "https://api.openalex.org";
const MIN_INTERVAL_MS = 110;

let lastFetchAt = 0;

export function getOpenAlexMailto(): string {
  return process.env.OPENALEX_MAILTO ?? "paperama@localhost";
}

async function throttle(): Promise<void> {
  const elapsed = Date.now() - lastFetchAt;
  const wait = MIN_INTERVAL_MS - elapsed;
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastFetchAt = Date.now();
}

export class OpenAlexError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = "OpenAlexError";
  }
}

export async function openAlexFetch<T>(
  path: string,
  searchParams?: Record<string, string | undefined>,
): Promise<T> {
  await throttle();

  const url = new URL(path, OPENALEX_BASE);
  url.searchParams.set("mailto", getOpenAlexMailto());

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, value);
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": `Paperama/0.1 (mailto:${getOpenAlexMailto()})`,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new OpenAlexError(
      `OpenAlex request failed: ${response.status} ${response.statusText}`,
      response.status,
      path,
    );
  }

  return response.json() as Promise<T>;
}

export function shortOpenAlexId(id: string): string {
  return id.replace("https://openalex.org/", "");
}
