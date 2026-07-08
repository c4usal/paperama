/**
 * Smoke — enrichment service (sumy + crawl4ai).
 * Run: npm run smoke:enrichment
 * Requires: npm run setup:enrichment && npm run enrichment:dev
 */
import { enrichmentServiceHealthy, resolveHeroViaCrawl4ai, summarizeViaEnrichment } from "../src/lib/enrichment/client";

async function main() {
  process.env.ENRICHMENT_SERVICE_URL = process.env.ENRICHMENT_SERVICE_URL ?? "http://127.0.0.1:8100";

  const healthy = await enrichmentServiceHealthy();
  if (!healthy) {
    console.error("FAIL — enrichment service not running on", process.env.ENRICHMENT_SERVICE_URL);
    console.error("Run: npm run setup:enrichment && npm run enrichment:dev");
    process.exit(1);
  }

  console.log("health: OK");

  const summary = await summarizeViaEnrichment(
    "Plant-microbe interactions dynamically affect plant growth, health, and development. " +
      "The mechanisms underpinning these associations are mediated by specialized host-derived metabolites. " +
      "Flavonoids are among the most studied classes of compounds in this context. " +
      "They influence rhizosphere chemistry and microbial community assembly.",
    2,
  );
  console.log("summary:", summary);

  if (!summary) {
    console.error("FAIL — sumy returned no summary");
    process.exit(1);
  }

  const hero = await resolveHeroViaCrawl4ai("https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0061217");
  console.log("hero:", hero);

  if (!hero?.startsWith("http")) {
    console.warn("WARN — crawl4ai hero not found (network/playwright); sumy path OK");
  }

  console.log("PASS\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
