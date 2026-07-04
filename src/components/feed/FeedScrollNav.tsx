"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedScrollNavProps = {
  onScrollPrev: () => void;
  onScrollNext: () => void;
  canScrollPrev: boolean;
  canScrollNext: boolean;
  className?: string;
};

export function FeedScrollNav({
  onScrollPrev,
  onScrollNext,
  canScrollPrev,
  canScrollNext,
  className,
}: FeedScrollNavProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)} aria-label="Feed navigation">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted"
        onClick={onScrollPrev}
        disabled={!canScrollPrev}
        aria-label="Previous paper"
      >
        <ChevronUp className="size-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 rounded-full bg-card shadow-sm ring-1 ring-border hover:bg-muted"
        onClick={onScrollNext}
        disabled={!canScrollNext}
        aria-label="Next paper"
      >
        <ChevronDown className="size-5" />
      </Button>
    </div>
  );
}
