import { cn } from '@/lib/utils';

// Base skeleton block — uses DSG brand dark bg
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-white/[0.06]',
        className,
      )}
    />
  );
}

// Card-shaped skeleton matching rounded-[1.5rem] border border-white/10 bg-white/[0.035] pattern
export function SkeletonCard() {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.035] p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-3 rounded-full" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

// Table rows skeleton
export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0d10] overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/10 px-5 py-3 flex items-center gap-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-white/[0.06] px-5 py-4 last:border-0"
        >
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// Text block skeleton
export function SkeletonText({ lines = 3 }: { lines?: number }) {
  const widths = ['w-full', 'w-11/12', 'w-4/5', 'w-3/4', 'w-2/3', 'w-1/2'];
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-3', widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

// Stat card skeleton — matches the 3-column quickStats grid in AppShellClient
export function SkeletonStat() {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}
