"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, Link2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { PaperFeedItem } from "@/types/paper";
import { cn } from "@/lib/utils";

type FeedActionRailProps = {
  paper: PaperFeedItem;
  className?: string;
};

type FeedAction = {
  key: "save" | "discuss" | "share";
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
};

const FEED_ACTIONS: FeedAction[] = [
  { key: "save", icon: Heart, label: "Save", ariaLabel: "Save paper" },
  { key: "discuss", icon: MessageCircle, label: "Discuss", ariaLabel: "Discuss paper" },
  { key: "share", icon: Link2, label: "Share", ariaLabel: "Share paper" },
];

export function FeedActionRail({ paper, className }: FeedActionRailProps) {
  const { isSaved, toggleSave, discussPaper, sharePaper } = useFeed();

  return (
    <aside
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted/30 p-1",
        className,
      )}
      aria-label="Paper actions"
    >
      {FEED_ACTIONS.map((action) => (
        <Button
          key={action.key}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-9 rounded-md hover:bg-muted",
            action.key === "save" && isSaved(paper) && "text-rg-accent",
          )}
          aria-label={action.ariaLabel}
          aria-pressed={action.key === "save" ? isSaved(paper) : undefined}
          title={action.label}
          onClick={() => {
            if (action.key === "save") toggleSave(paper);
            if (action.key === "discuss") discussPaper(paper);
            if (action.key === "share") void sharePaper(paper);
          }}
        >
          <action.icon className={cn("size-4", action.key === "save" && isSaved(paper) && "fill-current")} />
        </Button>
      ))}
    </aside>
  );
}
