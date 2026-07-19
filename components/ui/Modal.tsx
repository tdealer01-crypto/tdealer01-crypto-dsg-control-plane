'use client';

import React, { useEffect, useRef } from 'react';

interface ModalAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: ModalAction[];
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
};

export function Modal({ isOpen, onClose, title, children, actions = [], size = 'md' }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useRef(`modal-title-${Math.random().toString(36).substr(2, 9)}`).current;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement as HTMLElement;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') handleTabKey(e);
    };

    const handleTabKey = (e: KeyboardEvent) => {
      if (!dialogRef.current) return;
      const focusableElements = dialogRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    window.addEventListener('keydown', handleKey);

    const timer = setTimeout(() => {
      const firstButton = dialogRef.current?.querySelector('button') as HTMLElement;
      firstButton?.focus();
    }, 0);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKey);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div
        ref={dialogRef}
        className={`relative w-[90%] ${sizeMap[size]} max-h-[90vh] flex flex-col rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#0B0B0F] shadow-2xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(247,220,120,0.10)]">
          <h2 id={titleId} className="text-base font-semibold text-[#F8FAFC]">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-[#AAB3C5] hover:text-[#F8FAFC] transition-colors text-xl leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-y-auto text-[#AAB3C5]">{children}</div>

        {/* Footer */}
        {actions.length > 0 && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[rgba(247,220,120,0.10)]">
            {actions.map((action, i) => (
              <button
                key={i}
                onClick={action.onClick}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                  action.variant === 'danger'
                    ? 'bg-[rgba(225,6,0,0.15)] border-[rgba(225,6,0,0.35)] text-red-200 hover:bg-[rgba(225,6,0,0.25)]'
                    : action.variant === 'primary'
                    ? 'bg-gradient-to-br from-[#F7DC78] to-[#D4AF37] text-[#050507] border-transparent'
                    : 'bg-transparent border-[rgba(247,220,120,0.16)] text-[#AAB3C5] hover:text-[#F8FAFC]'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
