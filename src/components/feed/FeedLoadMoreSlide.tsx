import { cn } from "@/lib/utils";

type FeedLoadMoreSlideProps = {
  className?: string;
};

/** Minimal slide shown while fetching the next batch at the end of the feed. */
export function FeedLoadMoreSlide({ className }: FeedLoadMoreSlideProps) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 snap-start snap-always flex-col items-center justify-center bg-muted/40 px-4 py-3",
        className,
      )}
      aria-busy="true"
      aria-label="Loading more papers"
    >
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card px-6 py-16 shadow-md">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground" />
        <p className="text-sm text-muted-foreground">Loading more papers…</p>
      </div>
    </div>
  );
}
