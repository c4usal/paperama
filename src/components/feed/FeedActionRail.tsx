"use client";

import { Share2, ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { PaperFeedItem } from "@/types/paper";
import { cn } from "@/lib/utils";

type FeedActionRailProps = {
  paper: PaperFeedItem;
  className?: string;
  onShare: () => void;
};

export function FeedActionRail({ paper, className, onShare }: FeedActionRailProps) {
  const { isSaved, toggleSave, downvotePaper } = useFeed();
  const saved = isSaved(paper);

  return (
    <aside
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-1",
        className,
      )}
      aria-label="Paper actions"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("size-9 rounded-md hover:bg-muted", saved && "text-rg-accent")}
        aria-label="See more"
        aria-pressed={saved}
        title="See more"
        onClick={() => toggleSave(paper)}
      >
        <ThumbsUp className={cn("size-4", saved && "fill-current")} />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-md hover:bg-muted"
        aria-label="See less"
        title="See less"
        onClick={() => downvotePaper(paper)}
      >
        <ThumbsDown className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-9 rounded-md hover:bg-muted"
        aria-label="Share"
        title="Share"
        onClick={onShare}
      >
        <Share2 className="size-4" />
      </Button>
    </aside>
  );
}
