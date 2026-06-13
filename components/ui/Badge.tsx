import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className = '', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
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
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
