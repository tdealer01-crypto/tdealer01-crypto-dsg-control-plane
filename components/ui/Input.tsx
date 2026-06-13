'use client';

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

export function Input({ label, error, hint, leftIcon, className = '', id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#AAB3C5]">{leftIcon}</span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-[#F8FAFC] placeholder-[#AAB3C5] outline-none transition-all ${
            leftIcon ? 'pl-9' : ''
          } ${
            error
              ? 'border-[rgba(225,6,0,0.5)] focus:border-[#E10600] focus:ring-1 focus:ring-[rgba(225,6,0,0.3)]'
              : 'border-[rgba(247,220,120,0.16)] focus:border-[rgba(212,175,55,0.5)] focus:ring-1 focus:ring-[rgba(212,175,55,0.15)]'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-[#AAB3C5]">{hint}</p>}
    </div>
  );
}
