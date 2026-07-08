"use client";

import { ArrowRight } from "lucide-react";

import { TopicDomainPicker } from "@/components/feed/TopicDomainPicker";
import { Button } from "@/components/ui/button";
import { useFeed } from "@/contexts/feed-context";
import { cn } from "@/lib/utils";

type FeedTopicsPanelProps = {
  className?: string;
};

export function FeedTopicsPanel({ className }: FeedTopicsPanelProps) {
  const { setActiveTab } = useFeed();

  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto bg-muted/40 px-4 py-5 lg:px-6",
        className,
      )}
    >
      <div className="mx-auto w-full max-w-lg">
        <TopicDomainPicker />

        <div className="mt-6 border-t border-border pt-5">
          <Button
            type="button"
            className="w-full gap-2"
            onClick={() => setActiveTab("for-you")}
          >
            View For You
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
