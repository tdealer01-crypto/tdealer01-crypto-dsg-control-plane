'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from './Modal';

// Design tokens
const DESIGN_TOKENS = {
  colors: {
    gold: '#F7DC78',
    goldDark: '#D4AF37',
    green: '#33D17A',
    greenLight: 'rgba(51,209,122,0.15)',
    greenBorder: 'rgba(51,209,122,0.35)',
    red: '#E10600',
    redLight: 'rgba(225,6,0,0.15)',
    redBorder: 'rgba(225,6,0,0.35)',
    purple: '#9D4EDD',
    purpleBorder: 'rgba(157,78,221,0.35)',
    purpleLight: 'rgba(157,78,221,0.15)',
    gray: '#6B7280',
    grayBorder: 'rgba(107,114,128,0.35)',
    grayLight: 'rgba(107,114,128,0.15)',
    textPrimary: '#F8FAFC',
    textSecondary: '#AAB3C5',
    bgDark: '#14151C',
    bgDarker: '#0B0B0F',
  },
};

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'execute' | 'abort' | 'rollback' | 'confirm';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  confirmMessage?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  className = '',
  type = 'button',
  confirmMessage = 'Are you sure you want to proceed?',
  ...props
}: ButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);

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
    // Mission-specific variants
    execute:
      `bg-${DESIGN_TOKENS.colors.greenLight} border-${DESIGN_TOKENS.colors.greenBorder} text-emerald-200 border-2 focus-visible:outline-${DESIGN_TOKENS.colors.green} hover:shadow-[0_0_20px_rgba(51,209,122,0.6)] hover:border-${DESIGN_TOKENS.colors.green} transition-all duration-300`,
    abort:
      `bg-${DESIGN_TOKENS.colors.redLight} border-${DESIGN_TOKENS.colors.redBorder} text-red-200 focus-visible:outline-${DESIGN_TOKENS.colors.red} hover:animate-pulse hover:shadow-[0_0_20px_rgba(225,6,0,0.6)] transition-all duration-300`,
    rollback:
      `bg-${DESIGN_TOKENS.colors.purpleLight} border-${DESIGN_TOKENS.colors.purpleBorder} text-purple-200 focus-visible:outline-${DESIGN_TOKENS.colors.purple} hover:bg-${DESIGN_TOKENS.colors.grayLight} hover:border-${DESIGN_TOKENS.colors.grayBorder} animate-fade-in transition-all duration-500`,
    confirm:
      'bg-gradient-to-br from-[#F7DC78] to-[#D4AF37] text-[#050507] border-transparent shadow-lg hover:shadow-xl hover:brightness-105 focus-visible:outline-[#D4AF37]',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2',
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (variant === 'confirm') {
      setShowConfirm(true);
    } else if (onClick) {
      onClick(event);
    }
  };

  const handleConfirm = () => {
    setShowConfirm(false);
    if (onClick) {
      const synthEvent = new MouseEvent('click') as unknown as React.MouseEvent<HTMLButtonElement>;
      onClick(synthEvent);
    }
  };

  // Inline styles for animation and dynamic colors
  const executeStyle = variant === 'execute' ? {
    backgroundImage: `linear-gradient(to bottom right, rgba(51, 209, 122, 0.15), rgba(51, 209, 122, 0.08))`,
    borderColor: 'rgba(51, 209, 122, 0.35)',
    borderWidth: '2px',
  } : {};

  const abortStyle = variant === 'abort' ? {
    backgroundImage: `linear-gradient(to bottom right, rgba(225, 6, 0, 0.15), rgba(225, 6, 0, 0.08))`,
    borderColor: 'rgba(225, 6, 0, 0.35)',
  } : {};

  const rollbackStyle = variant === 'rollback' ? {
    backgroundImage: `linear-gradient(to bottom right, rgba(157, 78, 221, 0.15), rgba(107, 114, 128, 0.15))`,
    borderColor: 'rgba(157, 78, 221, 0.35)',
    animation: 'fadeIn 0.5s ease-in-out',
  } : {};

  const dynamicStyle = { ...executeStyle, ...abortStyle, ...rollbackStyle };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .hover\\:animate-pulse:hover {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <button
        type={type}
        className={`${base} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        style={dynamicStyle}
        disabled={disabled}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>

      {variant === 'confirm' && (
        <Modal
          isOpen={showConfirm}
          onClose={() => setShowConfirm(false)}
          title="Confirm Action"
          size="sm"
          actions={[
            {
              label: 'Cancel',
              onClick: () => setShowConfirm(false),
              variant: 'secondary',
            },
            {
              label: 'Confirm',
              onClick: handleConfirm,
              variant: 'primary',
            },
          ]}
        >
          <p className="text-[#AAB3C5]">{confirmMessage}</p>
        </Modal>
      )}
    </>
  );
}

/**
 * Hook for wrapping click handlers with confirmation modal logic
 * Usage: const confirmAction = useConfirm('Are you sure?');
 *        onClick={confirmAction(() => myAsyncFunction())}
 */
export function useConfirm(message: string = 'Are you sure you want to proceed?') {
  const [showModal, setShowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const confirm = useCallback(
    (action: () => void | Promise<void>) => {
      return (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        setPendingAction(() => action);
        setShowModal(true);
      };
    },
    []
  );

  const handleConfirmAction = useCallback(async () => {
    if (pendingAction) {
      await pendingAction();
    }
    setShowModal(false);
    setPendingAction(null);
  }, [pendingAction]);

  const ConfirmModal = () => (
    <Modal
      isOpen={showModal}
      onClose={() => {
        setShowModal(false);
        setPendingAction(null);
      }}
      title="Confirm Action"
      size="sm"
      actions={[
        {
          label: 'Cancel',
          onClick: () => {
            setShowModal(false);
            setPendingAction(null);
          },
          variant: 'secondary',
        },
        {
          label: 'Confirm',
          onClick: handleConfirmAction,
          variant: 'primary',
        },
      ]}
    >
      <p className="text-[#AAB3C5]">{message}</p>
    </Modal>
  );

  return { confirm, ConfirmModal, isOpen: showModal };
}
