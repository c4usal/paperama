import { writeFileSync } from "node:fs";
import path from "node:path";

import { closeEnrichedIndexDb, getEnrichedIndexDb } from "../src/lib/feed/index/db";

type Row = {
  openalex_id: string;
  topic_slug: string;
  title: string;
  tldr: string;
  published_at: string;
  publication_year: number | null;
  citation_count: number;
  score: number;
  hero_image_url: string;
  oa_url: string;
  oa_source: string;
  paper_type: string;
  journal: string;
  authors_json: string;
  match_label: string | null;
  abstract: string | null;
  enriched_at: string;
};

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNumber(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "NULL";
  return String(value);
}

function main() {
  const output = process.argv[2]?.trim() || path.join(process.cwd(), "data", "enriched-papers.seed.sql");
  const db = getEnrichedIndexDb();
  const rows = db
    .prepare(
      `SELECT openalex_id, topic_slug, title, tldr, published_at, publication_year, citation_count, score,
              hero_image_url, oa_url, oa_source, paper_type, journal, authors_json, match_label, abstract, enriched_at
       FROM enriched_papers
       ORDER BY id ASC`,
    )
    .all() as Row[];

  const lines: string[] = [];
  lines.push("DELETE FROM enriched_papers;");

  for (const row of rows) {
    lines.push(
      `INSERT INTO enriched_papers (openalex_id, topic_slug, title, tldr, published_at, publication_year, citation_count, score, hero_image_url, oa_url, oa_source, paper_type, journal, authors_json, match_label, abstract, enriched_at) VALUES (` +
        [
          sqlString(row.openalex_id),
          sqlString(row.topic_slug),
          sqlString(row.title),
          sqlString(row.tldr),
          sqlString(row.published_at),
          sqlNumber(row.publication_year),
          sqlNumber(row.citation_count),
          sqlNumber(row.score),
          sqlString(row.hero_image_url),
          sqlString(row.oa_url),
          sqlString(row.oa_source),
          sqlString(row.paper_type),
          sqlString(row.journal),
          sqlString(row.authors_json),
          sqlString(row.match_label),
          sqlString(row.abstract),
          sqlString(row.enriched_at),
        ].join(", ") +
        ");",
    );
  }

  writeFileSync(output, `${lines.join("\n")}\n`, "utf8");
  console.log(`Exported ${rows.length} rows to ${output}`);
}

main();
closeEnrichedIndexDb();
