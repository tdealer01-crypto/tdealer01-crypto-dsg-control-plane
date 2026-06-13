import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'red' | 'gold';
  className?: string;
}

export function Card({ children, variant = 'default', className = '', ...props }: CardProps) {
  const variants: Record<string, string> = {
    default:
      'border-[rgba(247,220,120,0.16)] bg-gradient-to-br from-white/[0.055] to-white/[0.02] backdrop-blur-sm shadow-xl',
    blue:
      'border-[rgba(79,140,255,0.26)] bg-gradient-to-br from-[rgba(15,82,186,0.12)] to-[rgba(5,5,7,0.15)] shadow-xl',
    red:
      'border-[rgba(225,6,0,0.28)] bg-gradient-to-br from-[rgba(225,6,0,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl',
    gold:
      'border-[rgba(212,175,55,0.28)] bg-gradient-to-br from-[rgba(212,175,55,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl',
  };

  return (
    <div className={`rounded-xl p-6 border ${variants[variant]} ${className}`} {...props}>
      {children}
    </div>
  );
}
