import type { PaperFeedItem } from "@/types/paper";

function escapeBibtex(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/[{}]/g, (match) => `\\${match}`);
}

function formatAuthors(authors: PaperFeedItem["authors"]): string {
  if (authors.length === 0) return "Unknown";
  return authors.map((author) => escapeBibtex(author.name)).join(" and ");
}

function bibtexEntryType(paper: PaperFeedItem): string {
  if (paper.type === "preprint") return "misc";
  if (paper.type === "conference") return "inproceedings";
  return "article";
}

export function buildZoteroBibtex(paper: PaperFeedItem): string {
  const year = paper.publishedAt.match(/\d{4}/)?.[0] ?? "n.d.";
  const key = paper.openAlexId.replace(/[^A-Za-z0-9]/g, "");
  const type = bibtexEntryType(paper);

  const lines = [
    `@${type}{${key},`,
    `  title = {${escapeBibtex(paper.title)}},`,
    `  author = {${formatAuthors(paper.authors)}},`,
    `  year = {${year}},`,
  ];

  if (type === "inproceedings") {
    lines.push(`  booktitle = {${escapeBibtex(paper.journal.name)}},`);
  } else {
    lines.push(`  journal = {${escapeBibtex(paper.journal.name)}},`);
  }

  if (paper.abstract?.trim()) {
    lines.push(`  abstract = {${escapeBibtex(paper.abstract.trim())}},`);
  }

  lines.push(`  url = {${escapeBibtex(paper.oaUrl)}},`);
  lines.push("}");

  return lines.join("\n");
}
