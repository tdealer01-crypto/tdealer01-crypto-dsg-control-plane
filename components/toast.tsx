'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

// ── types ──────────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  message?: string;
}

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

// ── variant config ─────────────────────────────────────────────────────────
const VARIANT_STYLES: Record<
  ToastVariant,
  { container: string; iconName: string }
> = {
  success: {
    container: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-100',
    iconName: 'check',
  },
  error: {
    container: 'border-red-500/30 bg-red-950/80 text-red-100',
    iconName: 'x-circle',
  },
  info: {
    container: 'border-indigo-500/30 bg-indigo-950/80 text-indigo-100',
    iconName: 'info',
  },
  warning: {
    container: 'border-amber-500/30 bg-amber-950/80 text-amber-100',
    iconName: 'warning',
  },
};

const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  warning: 6000,
  error: 6000,
};

const MAX_TOASTS = 3;

// ── icon component ─────────────────────────────────────────────────────────
function ToastIcon({ name }: { name: string }) {
  const cls = 'h-4 w-4 shrink-0 mt-0.5';
  switch (name) {
    case 'check':   return <CheckCircle2 className={`${cls} text-emerald-400`} />;
    case 'x-circle': return <XCircle className={`${cls} text-red-400`} />;
    case 'info':    return <Info className={`${cls} text-indigo-400`} />;
    case 'warning': return <AlertTriangle className={`${cls} text-amber-400`} />;
    default:        return null;
  }
}

// ── individual toast item ──────────────────────────────────────────────────
function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const enterTimer = setTimeout(() => setVisible(true), 10);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, AUTO_DISMISS_MS[toast.variant]);

    return () => {
      clearTimeout(enterTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, toast.variant, onDismiss]);

  function handleClose() {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }

  const { container, iconName } = VARIANT_STYLES[toast.variant];

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        transition: 'opacity 300ms ease, transform 300ms ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
      }}
      className={`w-80 max-w-[calc(100vw-2rem)] rounded-2xl border backdrop-blur-md shadow-2xl ${container}`}
    >
      <div className="flex items-start gap-3 p-4">
        <ToastIcon name={iconName} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-5">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs leading-5 opacity-80">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ── context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// ── provider ───────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback(
    (variant: ToastVariant, title: string, message?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => {
        const next = [...prev, { id, variant, title, message }];
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
    },
    [],
  );

  const ctx: ToastContextValue = {
    success: useCallback((t, m) => add('success', t, m), [add]),
    error:   useCallback((t, m) => add('error',   t, m), [add]),
    info:    useCallback((t, m) => add('info',    t, m), [add]),
    warning: useCallback((t, m) => add('warning', t, m), [add]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* portal: bottom-right, stacks upward */}
      <div
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ── hook ───────────────────────────────────────────────────────────────────
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
