"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

import { useFeed } from "@/contexts/feed-context";
import { searchPapers } from "@/lib/mock-papers";
import type { PaperFeedItem } from "@/types/paper";
import { Button } from "@/components/ui/button";

export function FeedSearchDialog() {
  const { searchOpen, closeSearch, setSearchQuery, setActiveTab } = useFeed();
  const [draft, setDraft] = useState("");
  const [results, setResults] = useState<PaperFeedItem[]>([]);

  useEffect(() => {
    if (!searchOpen) return;
    setDraft("");
    setResults([]);
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;

    const timeout = window.setTimeout(() => {
      setResults(searchPapers(draft));
    }, 200);

    return () => window.clearTimeout(timeout);
  }, [draft, searchOpen]);

  if (!searchOpen) return null;

  function applySearch(query: string) {
    setSearchQuery(query);
    setActiveTab("for-you");
    closeSearch();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-16">
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label="Search papers"
      >
        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applySearch(draft);
              if (event.key === "Escape") closeSearch();
            }}
            placeholder="Search papers, authors, topics…"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={closeSearch}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {draft.trim() && results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No matches found.</p>
          ) : null}

          {results.map((paper) => (
            <button
              key={paper.id}
              type="button"
              onClick={() => applySearch(draft)}
              className="block w-full border-b border-border px-4 py-3 text-left hover:bg-muted/50"
            >
              <p className="line-clamp-2 text-sm font-medium text-foreground">{paper.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {paper.authors[0]?.name}
                {paper.authors.length > 1 ? " et al." : ""} · {paper.journal.name}
              </p>
            </button>
          ))}
        </div>

        <div className="border-t border-border p-3">
          <Button
            type="button"
            className="w-full"
            disabled={!draft.trim()}
            onClick={() => applySearch(draft)}
          >
            Search feed for &ldquo;{draft.trim() || "…"}&rdquo;
          </Button>
        </div>
      </div>
    </div>
  );
}
