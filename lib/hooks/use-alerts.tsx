'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

export type AlertType = 'INFO' | 'WARNING' | 'CRITICAL';

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  details?: string;
  duration?: number; // ms, 0 = no auto-dismiss
  createdAt: number;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (message: string, type: AlertType, duration?: number, details?: string) => string;
  dismissAlert: (id: string) => void;
  clearAll: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const addAlert = useCallback((message: string, type: AlertType = 'INFO', duration = 5000, details?: string) => {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const alert: Alert = {
      id,
      type,
      message,
      details,
      duration,
      createdAt: Date.now(),
    };

    setAlerts((prev) => [...prev, alert]);

    if (duration > 0) {
      const timeoutId = setTimeout(() => {
        dismissAlert(id);
      }, duration);
      return id;
    }

    return id;
  }, [dismissAlert]);

  const clearAll = useCallback(() => {
    setAlerts([]);
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, addAlert, dismissAlert, clearAll }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within AlertProvider');
  }
  return context;
}
