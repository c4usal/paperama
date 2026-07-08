/** Reject logos, covers, portraits, and university branding — not paper figures. */
const REJECTED_HERO_PATTERNS = [
  /pubmed-meta-image/i,
  /favicon/i,
  /\blogo\b/i,
  /\/logos?\//i,
  /arxiv-logo/i,
  /icon\.png/i,
  /avatar/i,
  /badge/i,
  /creativecommons/i,
  /assets\/images\/social/i,
  /social\/ico/i,
  /webimage-/i,
  /homeHeader/i,
  /headerTitle/i,
  /site[-_]?banner/i,
  /splash[-_]?screen/i,
  /placeholder/i,
  /1x1\.(?:png|gif)/i,
  /spacer\.(?:png|gif)/i,
  /\bcover\b/i,
  /masthead/i,
  /journal[_-]?cover/i,
  /university/i,
  /institution/i,
  /affiliation/i,
  /\bedu\/[^/]*logo/i,
  /brand(?:ing)?/i,
  /\bseal\b/i,
  /\bcrest\b/i,
  /headshot/i,
  /portrait/i,
  /author[_-]?photo/i,
  /profile[_-]?photo/i,
  /staff[_-]?photo/i,
  /\bfaculty\b/i,
  /orcid\.org/i,
  /gravatar/i,
  /scholar\.google/i,
  /contributor/i,
  /\/people\//i,
  /\/person\//i,
  /thumb(?:nail)?[_-]?photo/i,
  /default[_-]?author/i,
  /user[_-]?avatar/i,
  /hero[_-]?banner/i,
  /banner[_-]?image/i,
  /journal[_-]?logo/i,
  /publisher[_-]?logo/i,
  /share[_-]?image/i,
  /og[_-]?share/i,
  /widget/i,
  /promo/i,
  /thumbnail\.collection/i,
];

const FIGURE_HINT_PATTERNS = [
  /figure/i,
  /fig\d/i,
  /fig-\d/i,
  /-fig\d/i,
  /g00\d/i,
  /-g001/i,
  /MediaObjects/i,
  /\/bin\//i,
  /pmcgifs/i,
  /article_deploy\/html\/images/i,
  /springer-static\/image/i,
  /content\/image/i,
  /graphic/i,
  /_gr\d/i,
  /gr\d\.(?:jpg|jpeg|png)/i,
  /fx\d\.(?:jpg|jpeg|png)/i,
];

/** Known publisher figure endpoints — safe even without generic figure tokens in the path. */
const TRUSTED_FIGURE_ENDPOINT_PATTERNS = [
  /journals\.plos\.org\/.+\/article\/figure\/image/i,
  /ncbi\.nlm\.nih\.gov\/pmc\/articles\/PMC.+?\/bin\//i,
  /ebi\.ac\.uk\/europepmc\/.+\/image\//i,
  /media\.springernature\.com\/.+MediaObjects/i,
  /pub\.mdpi-res\.com\/.+-g00\d/i,
  /frontiersin\.org\/files\/Articles\/.+-g00\d/i,
  /cdn\.elifesciences\.org\/.+-fig\d/i,
  /ars\.els-cdn\.com\/content\/image\/.+gr\d/i,
  /arxiv\.org\/html\/.+\.(?:png|jpg|jpeg|gif|webp)/i,
  /d2csxpduxe849s\.cloudfront\.net\/.+-fig/i,
  /f1000research-files\.f1000\.com\/.+_figure\d/i,
];

export function isRejectedHeroImage(url: string): boolean {
  return REJECTED_HERO_PATTERNS.some((pattern) => pattern.test(url));
}

export function isLikelyFigureImage(url: string): boolean {
  if (!url.startsWith("http") || isRejectedHeroImage(url)) return false;
  if (isTrustedFigureEndpoint(url)) return true;
  return FIGURE_HINT_PATTERNS.some((pattern) => pattern.test(url));
}

export function isTrustedFigureEndpoint(url: string): boolean {
  return TRUSTED_FIGURE_ENDPOINT_PATTERNS.some((pattern) => pattern.test(url));
}

export function rankHeroImageCandidates(urls: string[]): string[] {
  const score = (url: string): number => {
    if (isRejectedHeroImage(url)) return -1000;

    let value = 0;
    if (TRUSTED_FIGURE_ENDPOINT_PATTERNS.some((pattern) => pattern.test(url))) value += 100;
    if (/g001|fig1|figure1|fig-1|-fig1|gr1|fx1/i.test(url)) value += 50;
    if (FIGURE_HINT_PATTERNS.some((pattern) => pattern.test(url))) value += 25;
    if (/citation_graphic|og:image|twitter:image|share|social/i.test(url)) value -= 20;
    return value;
  };

  const seen = new Set<string>();

  return [...urls]
    .filter((url) => {
      if (!url.startsWith("http") || seen.has(url)) return false;
      seen.add(url);
      return true;
    })
    .sort((a, b) => score(b) - score(a));
}

export function filterFigureImageCandidates(urls: string[]): string[] {
  return rankHeroImageCandidates(urls).filter(isLikelyFigureImage);
}

/** @deprecated Use isRejectedHeroImage — kept for html-images compatibility. */
export function isGenericPreviewImage(url: string): boolean {
  return isRejectedHeroImage(url);
}
