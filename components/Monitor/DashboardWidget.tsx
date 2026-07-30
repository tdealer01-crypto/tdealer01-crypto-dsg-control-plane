import React from 'react';
import { ReactNode } from 'react';

interface DashboardWidgetProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  value?: string | number;
  valueLabel?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    percentage: number;
    period: string;
  };
  loading?: boolean;
  error?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Reusable dashboard widget component for displaying metrics.
 * Can be used for stat cards, charts, or custom content.
 */
export function DashboardWidget({
  title,
  subtitle,
  icon,
  value,
  valueLabel,
  trend,
  loading = false,
  error,
  className = '',
  children,
}: DashboardWidgetProps) {
  // Inline cx helper to avoid dependency on @/lib/utils
  const cx = (...classes: (string | false | undefined)[]) => classes.filter(Boolean).join(' ');

  return (
    <div
      className={cx(
        'bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow',
        'dark:bg-gray-900 dark:border-gray-800',
        className
      )}
      role="region"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0">{icon}</div>}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="py-4 px-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-200">
          {error}
        </div>
      )}

      {/* Value Display */}
      {!loading && !error && value !== undefined && (
        <div className="mb-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">{value}</span>
            {valueLabel && <span className="text-sm text-gray-500 dark:text-gray-400">{valueLabel}</span>}
          </div>

          {/* Trend */}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cx(
                  'text-xs font-medium',
                  trend.direction === 'up' && 'text-green-600 dark:text-green-400',
                  trend.direction === 'down' && 'text-red-600 dark:text-red-400',
                  trend.direction === 'neutral' && 'text-gray-600 dark:text-gray-400'
                )}
              >
                {trend.direction === 'up' && '↑'}
                {trend.direction === 'down' && '↓'}
                {trend.direction === 'neutral' && '→'}
                {' '}
                {Math.abs(trend.percentage).toFixed(1)}%
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{trend.period}</span>
            </div>
          )}
        </div>
      )}

      {/* Custom Content */}
      {!loading && !error && children && <div>{children}</div>}
    </div>
  );
}

/**
 * Skeleton loader for dashboard widgets
 */
export function DashboardWidgetSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 dark:bg-gray-900 dark:border-gray-800"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded dark:bg-gray-700 w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded dark:bg-gray-700 w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded dark:bg-gray-700 w-1/4"></div>
          </div>
        </div>
      ))}
    </>
  );
}
