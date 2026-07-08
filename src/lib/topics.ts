export type Topic = {
  slug: string;
  label: string;
  /** OpenAlex concept id without URL prefix, e.g. C143121216 */
  openAlexConceptId: string;
};

/**
 * Curated substates — each maps to an OpenAlex concept for feed queries.
 * Domains group these for the Topics UI; the feed is not limited to life sciences.
 */
export const TOPICS: Topic[] = [
  // Life sciences (original launch set)
  { slug: "plant-biology", label: "Plant Biology", openAlexConceptId: "C2992936677" },
  { slug: "synthetic-biology", label: "Synthetic Biology", openAlexConceptId: "C191908910" },
  { slug: "biosecurity", label: "Biosecurity", openAlexConceptId: "C2781368420" },
  { slug: "microbiome", label: "Microbiome", openAlexConceptId: "C143121216" },
  { slug: "crop-pathology", label: "Crop Pathology", openAlexConceptId: "C201373426" },
  { slug: "biology", label: "Biology", openAlexConceptId: "C86803240" },
  { slug: "genetics", label: "Genetics", openAlexConceptId: "C111715043" },

  // Health & medicine
  { slug: "medicine", label: "Medicine", openAlexConceptId: "C71924100" },
  { slug: "precision-nutrition", label: "Precision Nutrition", openAlexConceptId: "C148257392" },
  { slug: "neuroscience", label: "Neuroscience", openAlexConceptId: "C169760540" },

  // Earth & environment
  { slug: "climate-hydrology", label: "Climate & Hydrology", openAlexConceptId: "C76886044" },
  { slug: "ecology", label: "Ecology", openAlexConceptId: "C48676116" },

  // Physical sciences
  { slug: "physics", label: "Physics", openAlexConceptId: "C121332964" },
  { slug: "chemistry", label: "Chemistry", openAlexConceptId: "C185592680" },
  { slug: "materials-science", label: "Materials Science", openAlexConceptId: "C126322800" },

  // Engineering & technology
  { slug: "engineering", label: "Engineering", openAlexConceptId: "C127413603" },

  // Computing & AI
  { slug: "computer-science", label: "Computer Science", openAlexConceptId: "C41008148" },
  { slug: "artificial-intelligence", label: "Artificial Intelligence", openAlexConceptId: "C154945302" },
  { slug: "ml-for-science", label: "ML for Science", openAlexConceptId: "C119857082" },

  // Social sciences
  { slug: "economics", label: "Economics", openAlexConceptId: "C162324750" },
  { slug: "psychology", label: "Psychology", openAlexConceptId: "C15744967" },
  { slug: "sociology", label: "Sociology", openAlexConceptId: "C138496976" },
  { slug: "political-science", label: "Political Science", openAlexConceptId: "C17744445" },

  // Humanities
  { slug: "history", label: "History", openAlexConceptId: "C95457728" },
  { slug: "philosophy", label: "Philosophy", openAlexConceptId: "C138885662" },

  // Formal sciences
  { slug: "mathematics", label: "Mathematics", openAlexConceptId: "C33923547" },
];

const TOPIC_BY_SLUG = new Map(TOPICS.map((topic) => [topic.slug, topic]));

export type TopicDomain = {
  slug: string;
  label: string;
  description?: string;
  topicSlugs: string[];
};

/** Top-level research domains — click to expand substates. */
export const DOMAINS: TopicDomain[] = [
  {
    slug: "life-sciences",
    label: "Life Sciences",
    description: "Biology, genetics, agriculture, microbiology",
    topicSlugs: [
      "biology",
      "genetics",
      "plant-biology",
      "synthetic-biology",
      "microbiome",
      "crop-pathology",
      "biosecurity",
    ],
  },
  {
    slug: "health-medicine",
    label: "Health & Medicine",
    description: "Clinical research, nutrition, neuroscience",
    topicSlugs: ["medicine", "precision-nutrition", "neuroscience"],
  },
  {
    slug: "earth-environment",
    label: "Earth & Environment",
    description: "Climate, hydrology, ecosystems",
    topicSlugs: ["climate-hydrology", "ecology"],
  },
  {
    slug: "physical-sciences",
    label: "Physical Sciences",
    description: "Physics, chemistry, materials",
    topicSlugs: ["physics", "chemistry", "materials-science"],
  },
  {
    slug: "engineering",
    label: "Engineering & Technology",
    description: "Applied science and engineering",
    topicSlugs: ["engineering"],
  },
  {
    slug: "computing-ai",
    label: "Computing & AI",
    description: "Computer science, AI, ML for research",
    topicSlugs: ["computer-science", "artificial-intelligence", "ml-for-science"],
  },
  {
    slug: "social-sciences",
    label: "Social Sciences",
    description: "Economics, psychology, society, policy",
    topicSlugs: ["economics", "psychology", "sociology", "political-science"],
  },
  {
    slug: "humanities",
    label: "Humanities",
    description: "History, philosophy, and related fields",
    topicSlugs: ["history", "philosophy"],
  },
  {
    slug: "formal-sciences",
    label: "Mathematics & Formal Sciences",
    description: "Pure and applied mathematics",
    topicSlugs: ["mathematics"],
  },
];

const DOMAIN_BY_SLUG = new Map(DOMAINS.map((domain) => [domain.slug, domain]));

export function getDomain(slug: string): TopicDomain | undefined {
  return DOMAIN_BY_SLUG.get(slug);
}

export function getAllTopicSlugs(): string[] {
  return TOPICS.map((topic) => topic.slug);
}

export function getTopic(slug: string): Topic | undefined {
  return TOPIC_BY_SLUG.get(slug);
}

export function getTopicByConceptId(conceptId: string): Topic | undefined {
  const normalized = conceptId.replace("https://openalex.org/", "");
  return TOPICS.find((topic) => topic.openAlexConceptId === normalized);
}

export function getAllConceptIds(): string[] {
  return TOPICS.map((topic) => topic.openAlexConceptId);
}

export function getDomainForTopicSlug(slug: string): TopicDomain | undefined {
  return DOMAINS.find((domain) => domain.topicSlugs.includes(slug));
}
