/**
 * Group 2 smoke — assemble feed from OpenAlex.
 * Run: npm run smoke:feed
 */
import { assembleFeed } from "../src/lib/feed/assemble";

async function main() {
  const tab = (process.argv[2] as "for-you" | "saved") ?? "for-you";
  const limit = Number(process.argv[3] ?? 5);

  console.log(`\nFeed assemble smoke — tab=${tab} limit=${limit}\n`);

  const result = await assembleFeed({
    tab,
    limit,
    savedIds: tab === "saved" ? ["W2963403868"] : undefined,
  });

  console.log(`items: ${result.items.length}`);
  console.log(`hasMore: ${result.hasMore}`);
  console.log(`nextCursor: ${result.nextCursor ? "yes" : "no"}\n`);

  for (const [index, paper] of result.items.entries()) {
    console.log(`--- ${index + 1} ---`);
    console.log(`id:    ${paper.openAlexId}`);
    console.log(`title: ${paper.title.slice(0, 72)}${paper.title.length > 72 ? "…" : ""}`);
    console.log(`tldr:  ${paper.tldr.slice(0, 72)}${paper.tldr.length > 72 ? "…" : ""}`);
    console.log(`link:  ${paper.oaUrl}`);
    console.log(`hero:  ${paper.heroImageUrl ?? "(none)"}`);
  }

  if (result.items.length === 0) {
    console.error("FAIL — no items");
    process.exit(1);
  }

  const withHero = result.items.filter((item) => item.heroImageUrl).length;
  console.log(`\nHero images: ${withHero}/${result.items.length}`);

  if (withHero === 0) {
    console.error("FAIL — no items have hero images");
    process.exit(1);
  }

  console.log("PASS\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
