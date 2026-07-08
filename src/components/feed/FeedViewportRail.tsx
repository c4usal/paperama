"use client";

import { Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { PaperFeedItem } from "@/types/paper";
import { cn } from "@/lib/utils";

type FeedViewportRailProps = {
  paper: PaperFeedItem;
  className?: string;
  onShare: () => void;
};

export function FeedViewportRail({ paper, className, onShare }: FeedViewportRailProps) {
  const { isSaved, toggleSave, downvotePaper } = useFeed();
  const saved = isSaved(paper);

  return (
    <aside className={cn("flex flex-col items-center gap-5 py-2", className)} aria-label="Paper actions">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted",
          saved && "text-rg-accent",
        )}
        aria-label="See more"
        aria-pressed={saved}
        title="See more"
        onClick={() => toggleSave(paper)}
      >
        <ThumbsUp className={cn("size-5", saved && "fill-current")} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted"
        aria-label="See less"
        title="See less"
        onClick={() => downvotePaper(paper)}
      >
        <ThumbsDown className="size-5" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted"
        aria-label="Share"
        title="Share"
        onClick={onShare}
      >
        <Share2 className="size-5" />
      </Button>
    </aside>
  );
}
