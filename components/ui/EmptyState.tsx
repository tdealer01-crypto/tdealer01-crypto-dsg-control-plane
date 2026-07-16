'use client';

import React from 'react';
import { InboxIcon, AlertCircle, Package } from 'lucide-react';

interface EmptyStateProps {
  icon?: 'inbox' | 'error' | 'package' | React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

function getIcon(icon?: string | React.ReactNode) {
  if (React.isValidElement(icon)) return icon;

  switch (icon) {
    case 'error':
      return <AlertCircle className="h-12 w-12" />;
    case 'package':
      return <Package className="h-12 w-12" />;
    case 'inbox':
    default:
      return <InboxIcon className="h-12 w-12" />;
  }
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="text-gray-600 mb-4">{getIcon(icon)}</div>
      <h3 className="text-lg font-semibold text-gray-300 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 mb-4 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
