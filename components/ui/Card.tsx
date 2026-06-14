import React, { useEffect, useState } from 'react';
import { Check, X, AlertCircle } from 'lucide-react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'red' | 'gold' | 'executing' | 'success' | 'error' | 'warning';
  className?: string;
  icon?: React.ReactNode;
}

export function Card({ children, variant = 'default', className = '', icon, ...props }: CardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const variants: Record<string, string> = {
    default:
      'border-[rgba(247,220,120,0.16)] bg-gradient-to-br from-white/[0.055] to-white/[0.02] backdrop-blur-sm shadow-xl',
    blue:
      'border-[rgba(79,140,255,0.26)] bg-gradient-to-br from-[rgba(15,82,186,0.12)] to-[rgba(5,5,7,0.15)] shadow-xl',
    red:
      'border-[rgba(225,6,0,0.28)] bg-gradient-to-br from-[rgba(225,6,0,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl',
    gold:
      'border-[rgba(212,175,55,0.28)] bg-gradient-to-br from-[rgba(212,175,55,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl',
    executing:
      'border-[rgba(212,175,55,0.28)] bg-gradient-to-br from-[rgba(212,175,55,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl animate-pulse',
    success:
      'border-l-4 border-l-[#10b981] border-[rgba(16,185,129,0.2)] bg-gradient-to-br from-[rgba(16,185,129,0.05)] to-[rgba(5,5,7,0.15)] shadow-xl',
    error:
      'border-l-4 border-l-[rgba(225,6,0,0.8)] border-[rgba(225,6,0,0.28)] bg-gradient-to-br from-[rgba(225,6,0,0.10)] to-[rgba(5,5,7,0.15)] shadow-xl',
    warning:
      'border-l-4 border-l-[#f59e0b] border-[rgba(245,158,11,0.2)] bg-gradient-to-br from-[rgba(245,158,11,0.05)] to-[rgba(5,5,7,0.15)] shadow-xl',
  };

  const getIcon = () => {
    if (icon) return icon;

    switch (variant) {
      case 'success':
        return <Check className="w-5 h-5 text-[#10b981]" />;
      case 'error':
        return <X className="w-5 h-5 text-[rgba(225,6,0,0.8)]" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-[#f59e0b]" />;
      default:
        return null;
    }
  };

  const displayIcon = getIcon();
  const hasIcon = variant === 'success' || variant === 'error' || variant === 'warning' || icon;

  const cardClasses = `rounded-xl p-6 border relative ${variants[variant]} ${className}`;

  // Animation styles using CSS keyframes injected via style tag
  const animationStyles = `
    @keyframes shimmer {
      0% {
        background-position: -1000px 0;
      }
      100% {
        background-position: 1000px 0;
      }
    }

    @keyframes shake {
      0%, 100% {
        transform: translateX(0);
      }
      10%, 30%, 50%, 70%, 90% {
        transform: translateX(-4px);
      }
      20%, 40%, 60%, 80% {
        transform: translateX(4px);
      }
    }

    @keyframes bounce-subtle {
      0%, 100% {
        transform: translateY(0);
      }
      50% {
        transform: translateY(-4px);
      }
    }

    @keyframes fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .card-executing {
      animation: shimmer 3s infinite linear;
      background-size: 1000px 100%;
      background-image: linear-gradient(
        90deg,
        rgba(212,175,55,0.1) 0%,
        rgba(212,175,55,0.2) 50%,
        rgba(212,175,55,0.1) 100%
      );
    }

    .card-success {
      animation: fade-in 0.6s ease-in-out;
    }

    .card-success .icon-wrapper {
      animation: fade-in 0.8s ease-in-out 0.2s backwards;
    }

    .card-error {
      animation: ${mounted ? 'shake 0.5s ease-in-out' : 'none'};
    }

    .card-error .icon-wrapper {
      animation: fade-in 0.6s ease-in-out;
    }

    .card-warning {
      animation: bounce-subtle 2s ease-in-out infinite;
    }

    .card-warning .icon-wrapper {
      animation: fade-in 0.6s ease-in-out;
    }
  `;

  let containerClasses = cardClasses;
  if (variant === 'executing') containerClasses += ' card-executing';
  if (variant === 'success') containerClasses += ' card-success';
  if (variant === 'error') containerClasses += ' card-error';
  if (variant === 'warning') containerClasses += ' card-warning';

  return (
    <>
      <style>{animationStyles}</style>
      <div className={containerClasses} {...props}>
        {hasIcon && displayIcon && (
          <div className="icon-wrapper absolute top-6 right-6">
            {displayIcon}
          </div>
        )}
        {hasIcon ? (
          <div className="pr-12">
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </>
  );
}
