'use client';

import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all border focus-visible:outline-2 focus-visible:outline-offset-2';

  const variants: Record<string, string> = {
    primary:
      'bg-gradient-to-br from-[#F7DC78] to-[#D4AF37] text-[#050507] border-transparent shadow-lg hover:shadow-xl hover:brightness-105 focus-visible:outline-[#D4AF37]',
    secondary:
      'bg-[#14151C] border-[rgba(247,220,120,0.16)] text-[#F8FAFC] hover:bg-[#191A22] focus-visible:outline-[#D4AF37]',
    ghost:
      'bg-transparent border-[rgba(247,220,120,0.16)] text-[#F8FAFC] hover:bg-[rgba(247,220,120,0.06)] focus-visible:outline-[#D4AF37]',
    danger:
      'bg-[rgba(225,6,0,0.15)] border-[rgba(225,6,0,0.35)] text-red-200 hover:bg-[rgba(225,6,0,0.25)] focus-visible:outline-[#E10600]',
    success:
      'bg-[rgba(51,209,122,0.15)] border-[rgba(51,209,122,0.35)] text-emerald-200 hover:bg-[rgba(51,209,122,0.25)] focus-visible:outline-[#33D17A]',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  };

  return (
    <button
      type={type}
      className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
