import Link from 'next/link';
import { ElementType } from 'react';

type EmptyStateProps = {
  icon: ElementType;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
        <Icon className="h-8 w-8 text-slate-600" />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>

      {/* Description */}
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>

      {/* Optional CTA */}
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/30 transition hover:bg-indigo-500"
        >
          {action.label} →
        </Link>
      )}
    </div>
  );
}
