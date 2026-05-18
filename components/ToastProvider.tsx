'use client';

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastActions {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

interface ToastContextValue {
  toast: ToastActions;
}

// ---------------------------------------------------------------------------
// Styles per type
// ---------------------------------------------------------------------------

const TYPE_CONFIG: Record<
  ToastType,
  { icon: React.FC<{ className?: string }>; border: string; iconColor: string; durationMs: number }
> = {
  success: {
    icon: CheckCircle2,
    border: 'border-emerald-400/30',
    iconColor: 'text-emerald-400',
    durationMs: 4000,
  },
  error: {
    icon: XCircle,
    border: 'border-red-400/30',
    iconColor: 'text-red-400',
    durationMs: 6000,
  },
  info: {
    icon: Info,
    border: 'border-blue-400/30',
    iconColor: 'text-blue-400',
    durationMs: 4000,
  },
  warning: {
    icon: AlertTriangle,
    border: 'border-amber-400/30',
    iconColor: 'text-amber-400',
    durationMs: 6000,
  },
};

const MAX_TOASTS = 4;

// ---------------------------------------------------------------------------
// Module-level escape hatch (for use outside React, e.g. API route helpers)
// ---------------------------------------------------------------------------

let _addToast: ((message: string, type: ToastType) => void) | null = null;

export function addToast(message: string, type: ToastType = 'info') {
  if (_addToast) {
    _addToast(message, type);
  }
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const dismiss = useCallback((id: string) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (message: string, type: ToastType) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { durationMs } = TYPE_CONFIG[type];

      setToasts((prev) => {
        const next = [...prev, { id, type, message }];
        // Evict oldest if over cap
        if (next.length > MAX_TOASTS) {
          const evicted = next.shift()!;
          clearTimeout(timers.current[evicted.id]);
          delete timers.current[evicted.id];
        }
        return next;
      });

      timers.current[id] = setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  // Wire up the module-level escape hatch
  _addToast = add;

  const toast: ToastActions = {
    success: (msg) => add(msg, 'success'),
    error: (msg) => add(msg, 'error'),
    info: (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastList toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Toast list (bottom-right stack)
// ---------------------------------------------------------------------------

function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes dsg-toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        .dsg-toast {
          animation: dsg-toast-in 0.25s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
      `}</style>
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-6 right-6 z-[9999] flex flex-col gap-3"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Individual toast
// ---------------------------------------------------------------------------

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const { icon: Icon, border, iconColor } = TYPE_CONFIG[toast.type];

  return (
    <div
      className={`dsg-toast pointer-events-auto flex w-80 max-w-[calc(100vw-3rem)] items-start gap-3 rounded-2xl border ${
        border
      } bg-[#0c0e12]/95 px-4 py-3 shadow-2xl backdrop-blur-xl`}
      role="alert"
    >
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor}`} />
      <p className="flex-1 text-sm font-medium text-slate-100">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="-mr-1 -mt-0.5 rounded-lg p-1 text-slate-400 transition hover:text-slate-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
}
