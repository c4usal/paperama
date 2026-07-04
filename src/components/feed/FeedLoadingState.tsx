import { cn } from "@/lib/utils";

type FeedPaperSkeletonProps = {
  className?: string;
};

export function FeedPaperSkeleton({ className }: FeedPaperSkeletonProps) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 snap-start snap-always items-center justify-center bg-muted/40 px-4 py-3",
        className,
      )}
    >
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <div className="mx-3 mt-3 aspect-video animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2.5 border-t border-border px-4 py-3">
          <div className="mx-auto h-5 w-[92%] animate-pulse rounded bg-muted" />
          <div className="mx-auto h-4 w-full animate-pulse rounded bg-muted/80" />
          <div className="mx-auto h-3 w-2/3 animate-pulse rounded bg-muted/70" />
          <div className="mx-auto mt-2 h-10 w-full animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    </div>
  );
}

type FeedLoadingStateProps = {
  className?: string;
  slideClassName?: string;
  count?: number;
};

export function FeedLoadingState({
  className,
  slideClassName,
  count = 2,
}: FeedLoadingStateProps) {
  return (
    <div className={cn("snap-y snap-mandatory overflow-hidden", className)}>
      {Array.from({ length: count }, (_, index) => (
        <FeedPaperSkeleton key={index} className={slideClassName} />
      ))}
    </div>
  );
}
