export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-bg-border ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-bg-border bg-bg-card p-5">
      <Skeleton className="mb-3 h-4 w-20" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="mb-4 h-4 w-1/2" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}
