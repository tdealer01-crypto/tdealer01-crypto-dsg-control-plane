import React from 'react';

type BadgeVariant = 'default' | 'success' | 'error' | 'warning' | 'info' | 'queued' | 'executing' | 'completed' | 'failed' | 'rollback';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const iconMap: Record<BadgeVariant, string> = {
  default: '',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
  queued: '⏳',
  executing: '▶️',
  completed: '✅',
  failed: '❌',
  rollback: '↩️',
};

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default:
      'bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.28)] text-[#F7DC78]',
    success:
      'bg-[rgba(51,209,122,0.12)] border border-[rgba(51,209,122,0.28)] text-emerald-300',
    error:
      'bg-[rgba(225,6,0,0.12)] border border-[rgba(225,6,0,0.28)] text-red-300',
    warning:
      'bg-[rgba(245,197,66,0.12)] border border-[rgba(245,197,66,0.28)] text-yellow-300',
    info:
      'bg-[rgba(79,140,255,0.12)] border border-[rgba(79,140,255,0.28)] text-blue-300',
    // Execution state variants using DSG tokens
    queued:
      'bg-[rgba(167,169,180,0.12)] border border-[rgba(167,169,180,0.28)] text-[#A7A9B4]',
    executing:
      'bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.28)] text-[#F7DC78] badge-executing-pulse',
    completed:
      'bg-[rgba(51,209,122,0.12)] border border-[rgba(51,209,122,0.28)] text-[#33D17A]',
    failed:
      'bg-[rgba(225,6,0,0.12)] border border-[rgba(225,6,0,0.28)] text-[#FF4D4D]',
    rollback:
      'bg-[rgba(139,78,170,0.12)] border border-[rgba(139,78,170,0.28)] text-[#B794F6]',
  };

  const icon = iconMap[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${variants[variant]} ${className}`}
      {...props}
    >
      {icon && <span className="inline-flex">{icon}</span>}
      {children}
    </span>
  );
}
