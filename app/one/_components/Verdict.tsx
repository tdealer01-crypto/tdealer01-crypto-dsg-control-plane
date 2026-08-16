'use client';

/**
 * The one result the user reads. Three states, no fourth.
 * See docs/product/DSG_ONE_VERIFIED_EXECUTION.md §2.
 */
export type VerdictValue = 'VERIFIED' | 'NEEDS_REVIEW' | 'BLOCKED';

const STYLES: Record<VerdictValue, { mark: string; label: string; className: string }> = {
  VERIFIED: {
    mark: '✓',
    label: 'VERIFIED',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  },
  NEEDS_REVIEW: {
    mark: '△',
    label: 'NEEDS REVIEW',
    className: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300',
  },
  BLOCKED: {
    mark: '✕',
    label: 'BLOCKED',
    className: 'border-red-500/30 bg-red-500/10 text-red-300',
  },
};

export function toVerdict(status: string): VerdictValue | null {
  if (status === 'VERIFIED') return 'VERIFIED';
  if (status === 'NEEDS_REVIEW') return 'NEEDS_REVIEW';
  if (status === 'BLOCKED' || status === 'CANCELLED') return 'BLOCKED';
  return null;
}

export default function Verdict({
  value,
  size = 'md',
}: {
  value: VerdictValue;
  size?: 'sm' | 'md' | 'lg';
}) {
  const style = STYLES[value];
  const sizing =
    size === 'lg'
      ? 'px-4 py-2 text-lg'
      : size === 'sm'
        ? 'px-2 py-0.5 text-xs'
        : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border font-semibold tracking-wide ${style.className} ${sizing}`}
    >
      <span aria-hidden="true">{style.mark}</span>
      {style.label}
    </span>
  );
}
