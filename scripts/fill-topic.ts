/**
 * Fill the enriched-papers index for one topic.
 * Run: npm run fill:topic -- plant-biology 50
 */
import { clearHeroImageCache } from "../src/lib/figures/resolve-hero";
import { closeEnrichedIndexDb, enrichedIndexPath } from "../src/lib/feed/index/db";
import {
  fillTopicIndex,
  INDEX_TARGET_PER_TOPIC,
} from "../src/lib/feed/index/fill-topic";
import { countEnrichedByTopic } from "../src/lib/feed/index/store";
import { getTopic } from "../src/lib/topics";

async function main() {
  const slug = process.argv[2];
  const target = Number(process.argv[3] ?? INDEX_TARGET_PER_TOPIC);

  if (!slug) {
    console.error("Usage: npm run fill:topic -- <topic-slug> [target=50]");
    process.exit(1);
  }

  if (!getTopic(slug)) {
    console.error(`Unknown topic slug: ${slug}`);
    process.exit(1);
  }

  if (!Number.isFinite(target) || target < 1) {
    console.error("Target must be a positive number.");
    process.exit(1);
  }

  console.log(`\nFill enriched index — topic=${slug} target=${target}`);
  console.log(`Database: ${enrichedIndexPath()}\n`);
  console.log(`Starting count: ${countEnrichedByTopic(slug)}`);

  clearHeroImageCache();

  try {
    const result = await fillTopicIndex(slug, target);
    console.log(`\nDone — ${result.inserted}/${target} for ${slug}`);

    if (!result.complete) {
      process.exit(1);
    }
  } finally {
    closeEnrichedIndexDb();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
