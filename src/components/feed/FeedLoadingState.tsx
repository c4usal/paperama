import { cn } from "@/lib/utils";

type FeedPaperSkeletonProps = {
  className?: string;
};

export function FeedPaperSkeleton({ className }: FeedPaperSkeletonProps) {
  return (
    <div
      className={cn(
        "flex w-full shrink-0 snap-start snap-always flex-col bg-muted/40 px-4 py-3",
        className,
      )}
    >
      <div className="flex min-h-0 flex-1 items-stretch justify-center">
        <div className="flex h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-md">
        <div className="mx-3 mt-3 aspect-video shrink-0 animate-pulse rounded-lg bg-muted" />
        <div className="flex min-h-0 flex-1 flex-col justify-between gap-2.5 border-t border-border px-4 py-3">
          <div className="flex flex-1 flex-col justify-center space-y-2">
            <div className="mx-auto h-5 w-[92%] animate-pulse rounded bg-muted" />
            <div className="mx-auto h-4 w-full animate-pulse rounded bg-muted/80" />
            <div className="mx-auto h-3 w-2/3 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="mx-auto h-10 w-full shrink-0 animate-pulse rounded-lg bg-muted" />
        </div>
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
