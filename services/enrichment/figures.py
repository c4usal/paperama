"""Hero image URL discovery via crawl4ai — returns links only, never downloads files.

Be conservative: prefer meta tags and known figure URL patterns.
If we can't find a clean, verifiable image URL, return None.
"""

from __future__ import annotations

import re
from urllib.parse import parse_qs, urljoin, urlparse

from crawl4ai import AsyncWebCrawler, CacheMode, CrawlerRunConfig
import requests

FETCH_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; Paperama/0.1; +https://paperama.dev)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

GENERIC_IMAGE = re.compile(
    r"logo|favicon|icon\.png|avatar|badge|og[_-]?share|homeHeader|headerTitle|"
    r"placeholder|1x1\.|spacer\.|thumbnail\.collection|creativecommons|cover|masthead|"
    r"university|institution|affiliation|headshot|portrait|author[_-]?photo|profile[_-]?photo|"
    r"staff[_-]?photo|faculty|orcid\.org|gravatar|contributor|/people/|/person/|banner|"
    r"journal[_-]?logo|publisher[_-]?logo|share[_-]?image|promo|widget",
    re.I,
)

FIGURE_HINT = re.compile(
    r"figure|fig\d|fig-\d|-fig\d|g00\d|-g001|MediaObjects|/bin/|pmcgifs|article_deploy|"
    r"springer-static|content/image|graphic|_figure\d|gr\d\.(?:jpg|jpeg|png)|fx\d\.(?:jpg|jpeg|png)",
    re.I,
)

TRUSTED_FIGURE = re.compile(
    r"journals\.plos\.org/.+/article/figure/image|"
    r"ncbi\.nlm\.nih\.gov/pmc/articles/PMC.+?/bin/|"
    r"media\.springernature\.com/.+MediaObjects|"
    r"pub\.mdpi-res\.com/.+-g00\d|"
    r"frontiersin\.org/files/Articles/.+-g00\d|"
    r"cdn\.elifesciences\.org/.+-fig\d|"
    r"ars\.els-cdn\.com/content/image/.+gr\d|"
    r"arxiv\.org/html/.+\.(?:png|jpg|jpeg|gif|webp)",
    re.I,
)


def _is_rejected(url: str) -> bool:
    return bool(GENERIC_IMAGE.search(url))


def _looks_like_figure(url: str) -> bool:
    if _is_rejected(url):
        return False
    if TRUSTED_FIGURE.search(url):
        return True
    return bool(FIGURE_HINT.search(url))

def _decode_entities(value: str) -> str:
    return (
        value.replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#39;", "'")
        .strip()
    )


def _normalize_url(value: str, base_url: str) -> str | None:
    url = _decode_entities(value.strip())
    if not url:
        return None
    if url.startswith("//"):
        url = f"https:{url}"
    elif url.startswith("/"):
        url = urljoin(base_url, url)
    if not url.startswith("http"):
        return None
    return url


def _is_clean_url(url: str) -> bool:
    if not url.startswith("http"):
        return False
    if len(url) > 2048:
        return False
    if any(ch in url for ch in ["<", ">", "\n", "\r", "\t", " "]):
        return False
    if "%3C" in url or "%3E" in url:
        return False
    if "<%=" in url or "%3C%25" in url:
        return False
    return True


def _verify_image_url(url: str, timeout_s: float = 6.0) -> bool:
    """HEAD with GET fallback. Never downloads full image."""
    try:
        head = requests.head(url, headers=FETCH_HEADERS, timeout=timeout_s, allow_redirects=True)
        if head.ok:
            ctype = head.headers.get("content-type", "")
            if ctype.startswith("image/"):
                return True

        get = requests.get(
            url,
            headers={**FETCH_HEADERS, "Range": "bytes=0-512"},
            timeout=timeout_s,
            allow_redirects=True,
        )
        ctype = get.headers.get("content-type", "")
        return bool(get.ok and ctype.startswith("image/"))
    except Exception:
        return False


def _extract_meta_images(html: str, base_url: str) -> list[str]:
    patterns = [
        r'name="citation_graphic"\s+content="([^"]+)"',
        r'content="([^"]+)"\s+name="citation_graphic"',
    ]

    found: list[str] = []
    for pattern in patterns:
        for m in re.finditer(pattern, html, re.I):
            url = _normalize_url(m.group(1), base_url)
            if url:
                found.append(url)

    social_patterns = [
        r'property="og:image"\s+content="([^"]+)"',
        r'content="([^"]+)"\s+property="og:image"',
        r'name="twitter:image"\s+content="([^"]+)"',
        r'content="([^"]+)"\s+name="twitter:image"',
        r'<link[^>]+rel="image_src"[^>]+href="([^"]+)"',
    ]
    for pattern in social_patterns:
        for m in re.finditer(pattern, html, re.I):
            url = _normalize_url(m.group(1), base_url)
            if url and _looks_like_figure(url):
                found.append(url)
    return found


def _plos_hero_from_url(page_url: str) -> str | None:
    """For PLOS article pages, derive the stable g001 endpoint from the DOI in the querystring."""
    try:
        parsed = urlparse(page_url)
        host = (parsed.hostname or "").lower()
        if host != "journals.plos.org":
            return None
        if not parsed.path.endswith("/article"):
            return None

        qs = parse_qs(parsed.query)
        doi = (qs.get("id") or [""])[0].strip()
        if not doi or not doi.startswith("10."):
            return None

        journal = parsed.path.split("/")[1] if parsed.path.startswith("/") else ""
        if journal not in ["plosone", "plosbiology", "ploscompbiol", "plospathogens", "plosgenetics"]:
            journal = "plosone"

        return f"https://journals.plos.org/{journal}/article/figure/image?size=large&id={doi}.g001"
    except Exception:
        return None


def _collect_from_media(result) -> list[str]:
    urls: list[str] = []
    media = getattr(result, "media", None)
    if not isinstance(media, dict):
        return urls

    for img in media.get("images", []):
        if isinstance(img, dict):
            src = img.get("src") or img.get("url")
            if isinstance(src, str) and src.startswith("http") and _looks_like_figure(src):
                urls.append(src)
        elif isinstance(img, str) and img.startswith("http") and _looks_like_figure(img):
            urls.append(img)

    return urls


def _collect_from_html(html: str, base_url: str) -> list[str]:
    urls: list[str] = []
    urls.extend(_extract_meta_images(html, base_url))
    for match in re.finditer(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I):
        src = _normalize_url(match.group(1), base_url)
        if src and _looks_like_figure(src):
            urls.append(src)

    for match in re.finditer(
        r'https://[^"\'\s<>]+\.(?:png|jpg|jpeg|gif|webp)(?:\?[^"\'\s<>]*)?',
        html,
        re.I,
    ):
        url = match.group(0)
        if _looks_like_figure(url):
            urls.append(url)

    return urls


def _rank_candidates(urls: list[str]) -> list[str]:
    seen: set[str] = set()
    ordered: list[str] = []

    def push(url: str) -> None:
        if not _is_clean_url(url):
            return
        if url in seen or not _looks_like_figure(url):
            return
        seen.add(url)
        ordered.append(url)

    for url in urls:
        if FIGURE_HINT.search(url):
            push(url)

    for url in urls:
        push(url)

    return ordered


async def extract_hero_image_url(page_url: str) -> tuple[str | None, list[str]]:
    plos = _plos_hero_from_url(page_url)
    if plos and _verify_image_url(plos):
        return plos, [plos]

    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        screenshot=False,
        pdf=False,
        wait_for_images=True,
    )

    async with AsyncWebCrawler(verbose=False) as crawler:
        result = await crawler.arun(page_url, config=config)

    if not result or not getattr(result, "success", False):
        return None, []

    candidates: list[str] = []
    candidates.extend(_collect_from_media(result))

    html = getattr(result, "html", "") or ""
    if html:
        candidates.extend(_collect_from_html(html, page_url))

    ranked = _rank_candidates(candidates)
    hero: str | None = None
    verified: list[str] = []

    for candidate in ranked[:12]:
        if _verify_image_url(candidate):
            verified.append(candidate)
            hero = hero or candidate

    return hero, verified
