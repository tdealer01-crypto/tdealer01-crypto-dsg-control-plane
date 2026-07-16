'use client';

import React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: {
    label: string;
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  };
}

function getBadgeColor(variant?: string) {
  switch (variant) {
    case 'success':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
    case 'error':
      return 'bg-red-500/20 text-red-300 border-red-500/30';
    case 'info':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    default:
      return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

export function PageHeader({
  title,
  description,
  children,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-2 mb-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            {badge && (
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(badge.variant)}`}
              >
                {badge.label}
              </span>
            )}
          </div>
          {description && <p className="text-gray-400 text-sm">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
