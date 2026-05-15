function cx(...parts: (string | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cx(
        'animate-pulse rounded-xl bg-white/[0.06]',
        className,
      )}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0d10] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0d10] overflow-hidden">
      <div className="border-b border-white/10 px-5 py-3 flex items-center gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4 last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cx('h-3', widths[i % widths.length])} />
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-black/35 p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
