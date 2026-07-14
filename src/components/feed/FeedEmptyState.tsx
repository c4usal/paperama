import { Hash } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type FeedEmptyStateProps = {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function FeedEmptyState({
  title,
  message,
  actionLabel,
  onAction,
  className,
}: FeedEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center gap-4 px-6 text-center",
        className,
      )}
    >
      {title ? (
        <div className="flex size-12 items-center justify-center rounded-full bg-rg-accent/10 text-rg-accent">
          <Hash className="size-5" />
        </div>
      ) : null}

      <div className="max-w-sm space-y-2">
        {title ? <h2 className="text-base font-semibold text-foreground">{title}</h2> : null}
        <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>
      </div>

      {actionLabel && onAction ? (
        <Button
          type="button"
          className="border border-rg-accent/30 bg-rg-accent/10 text-rg-accent hover:bg-rg-accent/15"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
