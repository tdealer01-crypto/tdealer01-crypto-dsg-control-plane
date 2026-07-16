'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    label: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  className?: string;
}

function getVariantClasses(variant?: string) {
  switch (variant) {
    case 'success':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-300',
        accent: 'bg-emerald-500/20',
      };
    case 'warning':
      return {
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30',
        text: 'text-yellow-300',
        accent: 'bg-yellow-500/20',
      };
    case 'error':
      return {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-300',
        accent: 'bg-red-500/20',
      };
    case 'info':
      return {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-300',
        accent: 'bg-blue-500/20',
      };
    default:
      return {
        bg: 'bg-white/5',
        border: 'border-white/10',
        text: 'text-gray-300',
        accent: 'bg-white/10',
      };
  }
}

export function StatCard({
  label,
  value,
  icon,
  trend,
  variant = 'default',
  onClick,
  className = '',
}: StatCardProps) {
  const classes = getVariantClasses(variant);

  return (
    <div
      onClick={onClick}
      className={`border rounded-lg p-4 transition-all ${classes.bg} ${classes.border} ${
        onClick ? 'cursor-pointer hover:border-white/20 hover:bg-white/10' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {trend && (
              <div className={`flex items-center gap-0.5 text-xs ${classes.text}`}>
                {trend.direction === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{trend.value}% {trend.label}</span>
              </div>
            )}
          </div>
        </div>
        {icon && <div className={`p-2 rounded-lg ${classes.accent} text-gray-400`}>{icon}</div>}
      </div>
    </div>
  );
}
