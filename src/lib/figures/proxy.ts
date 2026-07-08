/** Prefer direct figure URLs on Cloudflare (Workers proxy route is unreliable). */
export function figureProxyUrl(url: string): string {
  return url;
}
