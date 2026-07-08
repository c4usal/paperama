const OPENALEX_BASE = "https://api.openalex.org";
const MIN_INTERVAL_MS = 110;
const FETCH_TIMEOUT_MS = 20_000;
const MAX_RETRIES = 3;

let lastFetchAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableHttpStatus(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const cause = error.cause as { code?: string } | undefined;
  return (
    error.name === "TimeoutError" ||
    cause?.code === "UND_ERR_CONNECT_TIMEOUT" ||
    cause?.code === "UND_ERR_SOCKET" ||
    error.message.includes("fetch failed")
  );
}

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

  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": `Paperama/0.1 (mailto:${getOpenAlexMailto()})`,
        },
        next: { revalidate: 0 },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (!response.ok) {
        const httpError = new OpenAlexError(
          `OpenAlex request failed: ${response.status} ${response.statusText}`,
          response.status,
          path,
        );
        if (isRetryableHttpStatus(response.status) && attempt < MAX_RETRIES - 1) {
          lastError = httpError;
          await sleep(1000 * (attempt + 1));
          continue;
        }
        throw httpError;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      lastError = error;
      if (error instanceof OpenAlexError || !isRetryableFetchError(error)) {
        throw error;
      }
      if (attempt < MAX_RETRIES - 1) {
        await sleep(400 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export function shortOpenAlexId(id: string): string {
  return id.replace("https://openalex.org/", "");
}
