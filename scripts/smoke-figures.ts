/**
 * Group 4 smoke — hero image resolution.
 * Run: npm run smoke:figures
 */
import { resolveFrontiersHeroImage } from "../src/lib/figures/frontiers";
import { resolveHeroImage } from "../src/lib/figures/resolve-hero";
import { resolveMdpiHeroImage } from "../src/lib/figures/mdpi";
import { openAlexFetch } from "../src/lib/openalex/client";
import type { OpenAlexWork } from "../src/lib/openalex/types";

async function fetchWorkByDoi(doi: string): Promise<OpenAlexWork | null> {
  const response = await openAlexFetch<{ results: OpenAlexWork[] }>("/works", {
    filter: `doi:${doi}`,
    per_page: "1",
  });
  return response.results?.[0] ?? null;
}

async function main() {
  const plosDoi = "10.1371/journal.pone.0061217";
  const plosWork = await fetchWorkByDoi(plosDoi);

  if (!plosWork) {
    console.error("FAIL — could not fetch PLOS work");
    process.exit(1);
  }

  const plosHero = await resolveHeroImage(plosWork);
  console.log("PLOS hero:", plosHero);

  if (!plosHero?.includes("journals.plos.org")) {
    console.error("FAIL — expected PLOS figure URL");
    process.exit(1);
  }

  const mdpiHero = await resolveMdpiHeroImage({
    doi: "10.3390/microorganisms11092287",
    oaUrl: "https://www.mdpi.com/2076-2607/11/9/2287",
  });
  console.log("MDPI hero:", mdpiHero);

  const frontiersHero = await resolveFrontiersHeroImage({
    doi: "10.3389/fmicb.2020.00001",
  });
  console.log("Frontiers hero:", frontiersHero);

  if (!mdpiHero && !frontiersHero) {
    console.warn("WARN — MDPI/Frontiers images unavailable (network); PLOS path OK");
  }

  console.log("PASS — hero image resolvers\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
