/**
 * Fill enriched index for every subtopic (50+ hero-confirmed papers each).
 * Run: npm run fill:all-topics
 */
import { closeEnrichedIndexDb, enrichedIndexPath } from "../src/lib/feed/index/db";
import {
  fillTopicIndex,
  INDEX_TARGET_PER_TOPIC,
} from "../src/lib/feed/index/fill-topic";
import { countEnrichedByTopic } from "../src/lib/feed/index/store";
import { TOPICS } from "../src/lib/topics";

async function main() {
  const target = Number(process.argv[2] ?? INDEX_TARGET_PER_TOPIC);
  if (!Number.isFinite(target) || target < 1) {
    console.error("Usage: npm run fill:all-topics [target=50]");
    process.exit(1);
  }

  console.log(`\nFill all topics — target=${target} per subtopic`);
  console.log(`Database: ${enrichedIndexPath()}\n`);

  const results = [];

  for (const topic of TOPICS) {
    const existing = countEnrichedByTopic(topic.slug);
    if (existing >= target) {
      console.log(`✓ ${topic.slug} — already ${existing}/${target}`);
      results.push({ slug: topic.slug, inserted: existing, target, complete: true });
      continue;
    }

    console.log(`→ ${topic.slug} — ${existing}/${target}…`);
    try {
      const result = await fillTopicIndex(topic.slug, target);
      results.push(result);
      console.log(
        `${result.complete ? "✓" : "△"} ${topic.slug} — ${result.inserted}/${target}`,
      );
    } catch (error) {
      const inserted = countEnrichedByTopic(topic.slug);
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${topic.slug} — failed at ${inserted}/${target}: ${message}`);
      results.push({ slug: topic.slug, inserted, target, complete: inserted >= target });
    }
  }

  const complete = results.filter((r) => r.complete).length;
  console.log(`\nDone — ${complete}/${TOPICS.length} topics at ${target}+ papers\n`);

  if (complete < TOPICS.length) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    closeEnrichedIndexDb();
  });
