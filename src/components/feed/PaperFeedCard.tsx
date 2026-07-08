"use client";

import { forwardRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import { FeedActionRail } from "@/components/feed/FeedActionRail";
import { FeedShareDialog } from "@/components/feed/FeedShareDialog";
import { FeedViewportRail } from "@/components/feed/FeedViewportRail";
import { VisualCenterpiece } from "@/components/feed/VisualCenterpiece";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { PaperFeedItem } from "@/types/paper";
import { cn } from "@/lib/utils";

type PaperFeedCardProps = {
  paper: PaperFeedItem;
  className?: string;
  "data-feed-index"?: number;
  onHeroUnavailable?: (openAlexId: string) => void;
};

function formatMeta(paper: PaperFeedItem) {
  const leadAuthor = paper.authors[0]?.name ?? "";
  const surname = leadAuthor.split(" ").at(-1) ?? leadAuthor;
  const authors = paper.authors.length > 1 ? `${surname} et al.` : surname;
  const year = paper.publishedAt.match(/\d{4}/)?.[0] ?? paper.publishedAt;

  return { authors, journal: paper.journal.name, year };
}

function formatCitationCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M citations`;
  if (count >= 10_000) return `${(count / 1_000).toFixed(0)}K citations`;
  if (count === 1) return "1 citation";
  return `${count.toLocaleString()} citations`;
}

export const PaperFeedCard = forwardRef<HTMLElement, PaperFeedCardProps>(
  function PaperFeedCard({ paper, className, onHeroUnavailable, ...props }, ref) {
    const { activeTab, sharePaper, exportToZotero } = useFeed();
    const meta = formatMeta(paper);
    const showMatchTag = activeTab === "for-you" && Boolean(paper.interestLabel);
    const [shareOpen, setShareOpen] = useState(false);

    if (!paper.title?.trim() || paper.title === "Untitled work") return null;

    return (
      <article
        ref={ref}
        {...props}
        className={cn(
          "relative box-border flex w-full shrink-0 snap-start snap-always flex-col bg-muted/40 px-4 py-3",
          className,
        )}
      >
        <div className="flex min-h-0 flex-1 items-stretch justify-center gap-2 lg:gap-3">
          <div className="flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
            <VisualCenterpiece
              src={paper.heroImageUrl}
              topicSlug={paper.topicSlug}
              alt=""
              className="mx-3 mt-3 shrink-0"
              onUnavailable={() => onHeroUnavailable?.(paper.openAlexId)}
            />

            <div className="flex min-h-0 flex-1 flex-col justify-between gap-2.5 border-t border-border px-4 py-3 text-center font-sans">
              <div className="flex min-h-0 flex-1 flex-col justify-center space-y-1.5">
                <h1 className="line-clamp-4 text-lg leading-snug font-semibold text-foreground">
                  {paper.title}
                </h1>

                <p className="line-clamp-5 text-sm leading-snug text-muted-foreground">{paper.tldr}</p>

                <p className="text-xs leading-snug text-muted-foreground">
                  <span>{meta.authors}</span>
                  <span className="px-1 text-muted-foreground/40">·</span>
                  <span className="whitespace-nowrap">
                    {meta.journal} · {meta.year}
                  </span>
                  <span className="px-1 text-muted-foreground/40">·</span>
                  <span>{formatCitationCount(paper.citationCount)}</span>
                </p>

                {showMatchTag ? (
                  <p className="text-xs font-medium text-rg-accent">
                    Matches: {paper.interestLabel}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-2 lg:block">
                <Button
                  size="lg"
                  className="h-10 min-w-0 flex-1 gap-1.5 font-semibold lg:w-full"
                  render={
                    <a href={paper.oaUrl} target="_blank" rel="noopener noreferrer" />
                  }
                >
                  Read
                  <ArrowRight className="size-4" />
                </Button>
                <FeedActionRail
                  paper={paper}
                  className="shrink-0 lg:hidden"
                  onShare={() => setShareOpen(true)}
                />
              </div>
            </div>
          </div>

          <FeedViewportRail
            paper={paper}
            className="hidden self-center lg:flex"
            onShare={() => setShareOpen(true)}
          />
        </div>

        <FeedShareDialog
          open={shareOpen}
          onClose={() => setShareOpen(false)}
          onShareLink={() => {
            setShareOpen(false);
            void sharePaper(paper);
          }}
          onCopyZoteroBibtex={() => {
            setShareOpen(false);
            void exportToZotero(paper);
          }}
        />
      </article>
    );
  },
);
