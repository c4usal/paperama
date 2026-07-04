import type { FollowingState } from "@/types/feed";

export const DEFAULT_FOLLOWING: FollowingState = {
  researchers: [
    { id: "r1", name: "Mohamed Ezzat Elshamy", hint: "Hydrology" },
    { id: "r2", name: "John W Pomeroy", hint: "Cryosphere" },
    { id: "r3", name: "Asmaa H. Mohamed", hint: "Plant microbiome" },
  ],
  journals: [
    { id: "j1", name: "Scientific Reports" },
    { id: "j2", name: "arXiv" },
    { id: "j3", name: "Water Resources Research" },
  ],
  topics: ["plant microbiome", "climate hydrology", "ML for science"],
};
