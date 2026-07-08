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
