/**
 * Group 1.7 — smoke test: fetch 10 OA cards for plant biology.
 * Run: npm run smoke:openalex
 */
import { fetchWorksByTopicSlug } from "../src/lib/openalex/works";

async function main() {
  const topicSlug = process.argv[2] ?? "plant-biology";
  const perPage = Number(process.argv[3] ?? 10);

  console.log(`\nOpenAlex smoke — topic=${topicSlug} perPage=${perPage}\n`);

  const result = await fetchWorksByTopicSlug(topicSlug, {
    perPage,
    publicationYearGte: 2020,
  });

  console.log(`API meta count: ${result.meta.count}`);
  console.log(`OA cards returned: ${result.cards.length}`);
  console.log(`Next cursor: ${result.nextCursor ?? "(none)"}\n`);

  if (result.cards.length === 0) {
    console.error("FAIL — no eligible OA cards");
    process.exit(1);
  }

  for (const [index, card] of result.cards.entries()) {
    console.log(`--- Card ${index + 1} ---`);
    console.log(`openAlexId: ${card.openAlexId}`);
    console.log(`title:      ${card.title.slice(0, 72)}${card.title.length > 72 ? "…" : ""}`);
    console.log(`tldr:       ${card.tldr.slice(0, 72)}${card.tldr.length > 72 ? "…" : ""}`);
    console.log(`authors:    ${card.authors}`);
    console.log(`journal:    ${card.journal} · ${card.year}`);
    console.log(`citations:  ${card.citationCount}`);
    console.log(`match:      ${card.matchLabel ?? "(none)"}`);
    console.log(`oaUrl:      ${card.oaUrl}`);
    console.log(`oaSource:   ${card.oaSource}`);
    console.log("");
  }

  const blocked = result.cards.filter((card) =>
    /sciencedirect|linkinghub\.elsevier|onlinelibrary\.wiley/i.test(card.oaUrl),
  );

  if (blocked.length > 0) {
    console.error("FAIL — paywalled publisher URLs detected:");
    blocked.forEach((card) => console.error(`  ${card.oaUrl}`));
    process.exit(1);
  }

  console.log("PASS — all cards have allowed OA links\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
