"use client";

import { useFeed } from "@/contexts/feed-context";
import { cn } from "@/lib/utils";

export function FeedToast() {
  const { toast, dismissToast } = useFeed();

  if (!toast) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed left-1/2 z-[110] -translate-x-1/2",
        "top-[calc(var(--feed-header-height)+0.75rem)] lg:top-6",
      )}
    >
      <button
        type="button"
        onClick={dismissToast}
        className={cn(
          "pointer-events-auto rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background shadow-lg",
        )}
      >
        {toast.message}
      </button>
    </div>
  );
}
