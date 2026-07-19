'use client';

import { useAlerts, type Alert } from './use-alerts';

export function AlertToaster() {
  const { alerts, dismissAlert } = useAlerts();

  return (
    <div
      className="pointer-events-none fixed right-0 top-0 z-50 flex flex-col gap-3 p-4"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
      aria-atomic="false"
    >
      {alerts.map((alert) => (
        <AlertToast key={alert.id} alert={alert} onDismiss={() => dismissAlert(alert.id)} />
      ))}
    </div>
  );
}

function AlertToast({ alert, onDismiss }: { alert: Alert; onDismiss: () => void }) {
  const isInfo = alert.type === 'INFO';
  const isWarning = alert.type === 'WARNING';
  const isCritical = alert.type === 'CRITICAL';

  let borderColor = 'border-blue-400/30';
  let bgColor = 'bg-blue-500/10';
  let textColor = 'text-blue-200';
  let iconColor = 'bg-blue-400';
  let icon = '🔵';

  if (isWarning) {
    borderColor = 'border-amber-400/30';
    bgColor = 'bg-amber-500/10';
    textColor = 'text-amber-200';
    iconColor = 'bg-amber-400';
    icon = '⚠️';
  }

  if (isCritical) {
    borderColor = 'border-red-400/30';
    bgColor = 'bg-red-500/10';
    textColor = 'text-red-200';
    iconColor = 'bg-red-400';
    icon = '🔴';
  }

  const animationClass = isCritical ? 'animate-pulse' : '';

  return (
    <div
      className={`pointer-events-auto animate-in slide-in-from-top-4 fade-in-0 duration-300 ${animationClass}`}
      style={{
        animation: 'slideInRight 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(384px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      <div
        className={`w-96 max-w-full rounded-lg border ${borderColor} ${bgColor} p-4 shadow-lg`}
        role={isCritical ? 'alert' : 'status'}
        aria-live={isCritical ? 'assertive' : 'polite'}
        aria-atomic="true"
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full text-sm ${isCritical ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          >
            {icon}
          </div>
          <div className="flex-1">
            <div className={`font-semibold ${textColor}`}>{getAlertTitle(alert.type)}</div>
            <div className="mt-1 text-sm text-slate-300">{alert.message}</div>
            {alert.details && <div className="mt-2 text-xs text-slate-400">{alert.details}</div>}
          </div>
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Close ${alert.type.toLowerCase()} notification`}
            className="pointer-events-auto mt-0.5 flex h-5 w-5 items-center justify-center rounded text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function getAlertTitle(type: string): string {
  if (type === 'INFO') return 'ℹ️ Info';
  if (type === 'WARNING') return '⚠️ Warning';
  if (type === 'CRITICAL') return '🔴 Critical Alert';
  return 'Alert';
}
