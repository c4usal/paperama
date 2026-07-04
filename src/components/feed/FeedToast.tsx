"use client";

import { useFeed } from "@/contexts/feed-context";
import { cn } from "@/lib/utils";

export function FeedToast() {
  const { toast, dismissToast } = useFeed();

  if (!toast) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[110] -translate-x-1/2">
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
