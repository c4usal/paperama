type FeedEmptyStateProps = {
  message: string;
};

export function FeedEmptyState({ message }: FeedEmptyStateProps) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{message}</p>
    </div>
  );
}
