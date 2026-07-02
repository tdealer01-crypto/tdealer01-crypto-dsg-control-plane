'use client';

import { AlertCircle, CheckCircle2, Clock } from 'lucide-react';

interface AlertBadgeProps {
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'acknowledged' | 'resolved';
  title: string;
}

export function AlertBadge({ severity, status, title }: AlertBadgeProps) {
  const severityClasses: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800 border-blue-300',
    medium: 'bg-amber-100 text-amber-800 border-amber-300',
    high: 'bg-red-100 text-red-800 border-red-300',
  };

  const statusIcon = {
    new: <AlertCircle className="w-4 h-4" />,
    acknowledged: <Clock className="w-4 h-4" />,
    resolved: <CheckCircle2 className="w-4 h-4" />,
  }[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm border ${severityClasses[severity]}`}>
      {statusIcon}
      <span className="font-medium">{title}</span>
    </div>
  );
}
