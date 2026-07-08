import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS enriched_papers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  openalex_id TEXT NOT NULL UNIQUE,
  topic_slug TEXT NOT NULL,
  title TEXT NOT NULL,
  tldr TEXT NOT NULL,
  published_at TEXT NOT NULL,
  publication_year INTEGER,
  citation_count INTEGER NOT NULL DEFAULT 0,
  score REAL NOT NULL DEFAULT 0,
  hero_image_url TEXT NOT NULL,
  oa_url TEXT NOT NULL,
  oa_source TEXT NOT NULL,
  paper_type TEXT NOT NULL,
  journal TEXT NOT NULL,
  authors_json TEXT NOT NULL,
  match_label TEXT,
  abstract TEXT,
  enriched_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enriched_topic_score
  ON enriched_papers (topic_slug, score DESC, openalex_id ASC);
`;

let database: DatabaseSync | null = null;

export function enrichedIndexPath(): string {
  const configured = process.env.ENRICHED_INDEX_PATH?.trim();
  if (configured) return configured;
  return path.join(process.cwd(), "data", "enriched-papers.sqlite");
}

export function useFeedIndex(): boolean {
  if (process.env.USE_FEED_INDEX === "false") return false;
  if (process.env.USE_FEED_INDEX === "true") return true;
  return existsSync(enrichedIndexPath());
}

export function getEnrichedIndexDb(): DatabaseSync {
  if (database) return database;

  const dbPath = enrichedIndexPath();
  mkdirSync(path.dirname(dbPath), { recursive: true });

  database = new DatabaseSync(dbPath);
  database.exec(SCHEMA);
  return database;
}

/** Close the singleton (scripts/tests). */
export function closeEnrichedIndexDb(): void {
  if (database) {
    database.close();
    database = null;
  }
}
