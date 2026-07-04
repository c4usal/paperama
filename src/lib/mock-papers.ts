import type { PaperFeedItem } from "@/types/paper";

/** Local placeholder for feed prototyping until Group 4 (PMC/arXiv figures). */
export const SAMPLE_HERO_IMAGE = "/images/research-figure-1.png";

export const SEED_PAPERS: PaperFeedItem[] = [
  {
    id: "1",
    seedId: "1",
    openAlexId: "W4389234567",
    title:
      "Biocontrol potentiality and plant growth-promoting traits of endophytic Enterobacter cloacae RO2 isolated from Portulaca oleracea L. against Bipolaris sorokiniana",
    type: "article",
    publishedAt: "June 2024",
    reads: 126,
    saveCount: 38,
    shareCount: 9,
    citationCount: 4,
    journal: { name: "Scientific Reports" },
    authors: [
      { name: "Asmaa H. Mohamed" },
      { name: "Rabab Antar" },
      { name: "Asmaa S. Taha" },
      { name: "Shereen A. Soliman" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 12,
    oaUrl: "https://www.nature.com/articles/s41598-024-56789-0",
    oaSource: "repository",
    interestLabel: "plant microbiome",
    abstract:
      "Endophytic Enterobacter cloacae RO2 from Portulaca oleracea shows strong antagonism against Bipolaris sorokiniana and promotes seedling growth under controlled conditions.",
    tldr:
      "A soil bacterium from purslane suppresses a major cereal pathogen while boosting plant growth in greenhouse trials.",
  },
  {
    id: "2",
    seedId: "2",
    openAlexId: "W3123456789",
    title:
      "The Impact of Climate and Land Cover Change on the Cryosphere and Hydrology of the Mackenzie River Basin, Canada",
    type: "article",
    publishedAt: "December 2023",
    reads: 147,
    saveCount: 52,
    shareCount: 14,
    citationCount: 41,
    journal: { name: "Water Resources Research" },
    authors: [
      { name: "Mohamed Ezzat Elshamy" },
      { name: "John W Pomeroy" },
      { name: "Alain Pietroniro" },
      { name: "Mohamed S. Abdelhamed" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 8,
    oaUrl: "https://arxiv.org/abs/2301.04567",
    oaSource: "arxiv",
    interestLabel: "climate hydrology",
    abstract:
      "Integrated modeling links warming and vegetation change to earlier melt, reduced glacier storage, and shifting discharge regimes across the Mackenzie River Basin.",
    tldr:
      "Warming and land-use change are shrinking Mackenzie Basin snowpack and shifting river flows earlier in the year.",
  },
  {
    id: "3",
    seedId: "3",
    openAlexId: "W4289012345",
    title:
      "Biocontrol Activity of Bacillus altitudinis CH05 and Bacillus tropicus CH13 Isolated from Capsicum annuum L. Seeds against Fungal Strains",
    type: "article",
    publishedAt: "September 2024",
    reads: 165,
    saveCount: 29,
    shareCount: 6,
    citationCount: 9,
    journal: { name: "Microorganisms" },
    authors: [
      { name: "Ariadna Bernal" },
      { name: "Mayra Paola Mena Navarro" },
      { name: "Jackeline Lizzeta Arvizu Gómez" },
      { name: "Juan Campos-Guillén" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 4,
    oaUrl: "https://www.mdpi.com/2076-2607/11/9/2287",
    oaSource: "repository",
    interestLabel: "biocontrol",
    abstract:
      "Seed-associated Bacillus strains CH05 and CH13 inhibit multiple fungal pathogens and produce lipopeptide metabolites with biocontrol potential.",
    tldr:
      "Two seed-associated Bacillus strains fight multiple crop fungi using lipopeptide compounds produced in lab assays.",
  },
  {
    id: "4",
    seedId: "4",
    openAlexId: "W4398765432",
    title:
      "Multi-Year pathogenicity and fungicide sensitivity assessment of Colletotrichum coccodes and emerging C. nigrum, both causing black dot in Manitoba potatoes",
    type: "preprint",
    publishedAt: "May 2025",
    reads: 43,
    saveCount: 11,
    shareCount: 2,
    citationCount: 1,
    journal: { name: "bioRxiv" },
    authors: [
      { name: "Mohammad Sayari" },
      { name: "Mohamed El-Shetehy" },
      { name: "Vikram Bisht" },
      { name: "Fouad Daayf" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 1,
    oaUrl: "https://www.biorxiv.org/content/10.1101/2025.05.12.653210v1",
    oaSource: "repository",
    interestLabel: "crop pathology",
    abstract:
      "Multi-year assays reveal variable aggressiveness and fungicide sensitivity among Colletotrichum isolates causing potato black dot in Manitoba.",
    tldr:
      "Black dot pathogens on Manitoba potatoes vary in aggressiveness and fungicide response across seasons and isolates.",
  },
  {
    id: "5",
    seedId: "5",
    openAlexId: "W3209876543",
    title:
      "Nutrigenomics of Obesity: Integrating Genomics, Epigenetics, and Diet–Microbiome Interactions for Precision Nutrition",
    type: "review",
    publishedAt: "October 2024",
    reads: 92,
    saveCount: 44,
    shareCount: 11,
    citationCount: 9,
    journal: { name: "Life" },
    authors: [
      { name: "Anam Farzand" },
      { name: "Assoc Prof. Ts. Dr. Mohd Adzim Khalili Rohin" },
      { name: "Dr Sana Awan" },
      { name: "Muhammad Mudassar Imran" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 2,
    oaUrl: "https://www.mdpi.com/2075-1729/15/10/1384",
    oaSource: "repository",
    interestLabel: "precision nutrition",
    abstract:
      "This review maps how genomics, epigenetics, and the gut microbiome interact to shape obesity risk and precision nutrition interventions.",
    tldr:
      "Genes, epigenetics, and gut microbes together shape how diets affect obesity — and where precision nutrition still falls short.",
  },
  {
    id: "6",
    seedId: "6",
    openAlexId: "W2963403868",
    title: "Attention Is All You Need",
    type: "preprint",
    publishedAt: "June 2017",
    reads: 2841,
    saveCount: 612,
    shareCount: 203,
    citationCount: 120_000,
    journal: { name: "arXiv" },
    authors: [
      { name: "Ashish Vaswani" },
      { name: "Noam Shazeer" },
      { name: "Niki Parmar" },
    ],
    heroImageUrl: SAMPLE_HERO_IMAGE,
    socialProofCount: 156,
    oaUrl: "https://arxiv.org/abs/1706.03762",
    oaSource: "arxiv",
    interestLabel: "ML for science",
    abstract:
      "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism.",
    tldr:
      "Transformers replace recurrence with self-attention and became the backbone of modern language and vision models.",
  },
];

export function instantiatePaper(
  seed: PaperFeedItem,
  page: number,
  index: number,
  cycle = 0,
): PaperFeedItem {
  return {
    ...seed,
    id: `${seed.seedId}-p${page}-${index}-c${cycle}`,
    reads: seed.reads + page * 7 + index * 3 + cycle * 5,
  };
}

export function getMockPapers(page: number, pageSize = 3): PaperFeedItem[] {
  const start = (page - 1) * pageSize;
  const items: PaperFeedItem[] = [];

  for (let i = 0; i < pageSize; i++) {
    const seed = SEED_PAPERS[(start + i) % SEED_PAPERS.length];
    items.push(instantiatePaper(seed, page, i));
  }

  return items;
}

export function resolvePaper(id: string): PaperFeedItem | null {
  const seedId = id.split("-")[0];
  const seed = SEED_PAPERS.find((paper) => paper.seedId === seedId);
  if (!seed) return null;

  const pageMatch = id.match(/-p(\d+)-(\d+)/);
  const page = pageMatch ? Number(pageMatch[1]) : 1;
  const index = pageMatch ? Number(pageMatch[2]) : 0;
  const cycleMatch = id.match(/-c(\d+)/);
  const cycle = cycleMatch ? Number(cycleMatch[1]) : 0;

  return instantiatePaper(seed, page, index, cycle);
}

export function searchPapers(query: string, limit = 8): PaperFeedItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return SEED_PAPERS.filter((seed) => {
    const haystack = [
      seed.title,
      seed.abstract,
      seed.tldr,
      seed.interestLabel,
      seed.journal.name,
      ...seed.authors.map((author) => author.name),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalized);
  })
    .slice(0, limit)
    .map((seed, index) => instantiatePaper(seed, 1, index));
}
