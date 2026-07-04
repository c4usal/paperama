export type Topic = {
  slug: string;
  label: string;
  /** OpenAlex concept id without URL prefix, e.g. C143121216 */
  openAlexConceptId: string;
};

/** Launch fields — verified against OpenAlex API (Group 1.6). */
export const TOPICS: Topic[] = [
  { slug: "plant-biology", label: "Plant Biology", openAlexConceptId: "C2992936677" },
  { slug: "synthetic-biology", label: "Synthetic Biology", openAlexConceptId: "C191908910" },
  { slug: "biosecurity", label: "Biosecurity", openAlexConceptId: "C2781368420" },
  { slug: "microbiome", label: "Microbiome", openAlexConceptId: "C143121216" },
  { slug: "climate-hydrology", label: "Climate & Hydrology", openAlexConceptId: "C76886044" },
  { slug: "ml-for-science", label: "ML for Science", openAlexConceptId: "C119857082" },
  { slug: "crop-pathology", label: "Crop Pathology", openAlexConceptId: "C201373426" },
  {
    slug: "precision-nutrition",
    label: "Precision Nutrition",
    openAlexConceptId: "C148257392",
  },
];

const TOPIC_BY_SLUG = new Map(TOPICS.map((topic) => [topic.slug, topic]));

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
