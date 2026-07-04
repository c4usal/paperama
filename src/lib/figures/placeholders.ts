import type { Topic } from "@/lib/topics";

export type TopicPlaceholderStyle = {
  gradient: string;
  accent: string;
  label: string;
};

/** Distinct placeholder palette per launch topic. */
export const TOPIC_PLACEHOLDER_STYLES: Record<Topic["slug"], TopicPlaceholderStyle> = {
  "plant-biology": {
    gradient: "from-emerald-600/80 via-green-500/50 to-lime-300/40",
    accent: "text-emerald-100",
    label: "Plant Biology",
  },
  "synthetic-biology": {
    gradient: "from-violet-600/80 via-purple-500/50 to-fuchsia-300/40",
    accent: "text-violet-100",
    label: "Synthetic Biology",
  },
  biosecurity: {
    gradient: "from-rose-700/80 via-red-500/50 to-orange-300/40",
    accent: "text-rose-100",
    label: "Biosecurity",
  },
  microbiome: {
    gradient: "from-cyan-700/80 via-teal-500/50 to-sky-300/40",
    accent: "text-cyan-100",
    label: "Microbiome",
  },
  "climate-hydrology": {
    gradient: "from-blue-700/80 via-indigo-500/50 to-sky-300/40",
    accent: "text-blue-100",
    label: "Climate & Hydrology",
  },
  "ml-for-science": {
    gradient: "from-slate-700/80 via-slate-500/50 to-indigo-300/40",
    accent: "text-slate-100",
    label: "ML for Science",
  },
  "crop-pathology": {
    gradient: "from-amber-700/80 via-yellow-600/50 to-lime-300/40",
    accent: "text-amber-100",
    label: "Crop Pathology",
  },
  "precision-nutrition": {
    gradient: "from-orange-700/80 via-amber-500/50 to-yellow-200/40",
    accent: "text-orange-100",
    label: "Precision Nutrition",
  },
};

const DEFAULT_STYLE: TopicPlaceholderStyle = {
  gradient: "from-slate-600/80 via-slate-500/50 to-slate-300/40",
  accent: "text-slate-100",
  label: "Research",
};

export function getTopicPlaceholderStyle(topicSlug?: string): TopicPlaceholderStyle {
  if (!topicSlug) return DEFAULT_STYLE;
  return TOPIC_PLACEHOLDER_STYLES[topicSlug as Topic["slug"]] ?? DEFAULT_STYLE;
}
