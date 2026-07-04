"use client";

import type { LucideIcon } from "lucide-react";
import { Heart, Link2, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import type { PaperFeedItem } from "@/types/paper";
import { cn } from "@/lib/utils";

type FeedViewportRailProps = {
  paper: PaperFeedItem;
  className?: string;
};

type RailAction = {
  key: "save" | "discuss" | "share";
  icon: LucideIcon;
  label: string;
  ariaLabel: string;
  getCount: (paper: PaperFeedItem) => number;
  formatCount: (n: number) => string;
};

function formatCompactCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function FeedViewportRail({ paper, className }: FeedViewportRailProps) {
  const { isSaved, toggleSave, discussPaper, sharePaper, getSaveCount, getDiscussCount, getShareCount } =
    useFeed();

  const actions: RailAction[] = [
    {
      key: "save",
      icon: Heart,
      label: "Save",
      ariaLabel: "Save paper",
      getCount: getSaveCount,
      formatCount: formatCompactCount,
    },
    {
      key: "discuss",
      icon: MessageCircle,
      label: "Discuss",
      ariaLabel: "Discuss paper",
      getCount: getDiscussCount,
      formatCount: String,
    },
    {
      key: "share",
      icon: Link2,
      label: "Share",
      ariaLabel: "Share paper",
      getCount: getShareCount,
      formatCount: String,
    },
  ];

  return (
    <aside className={cn("flex flex-col items-center gap-6 py-2", className)} aria-label="Paper actions">
      {actions.map((action) => {
        const count = action.getCount(paper);
        const saved = isSaved(paper);

        return (
          <div key={action.key} className="flex flex-col items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted",
                action.key === "save" && saved && "text-rg-accent",
              )}
              aria-label={action.ariaLabel}
              aria-pressed={action.key === "save" ? saved : undefined}
              title={action.label}
              onClick={() => {
                if (action.key === "save") toggleSave(paper);
                if (action.key === "discuss") discussPaper(paper);
                if (action.key === "share") void sharePaper(paper);
              }}
            >
              <action.icon className={cn("size-5", action.key === "save" && saved && "fill-current")} />
            </Button>
            <span className="text-xs font-medium text-foreground">{action.formatCount(count)}</span>
            <span className="sr-only">{action.label}</span>
          </div>
        );
      })}
    </aside>
  );
}
