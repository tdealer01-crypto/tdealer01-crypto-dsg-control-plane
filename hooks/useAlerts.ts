/**
 * useAlerts - Real-time alerts via polling with auto-reconnect
 *
 * Usage:
 * const { alerts, isLoading, error, refetch } = useAlerts('agent_123', 'new');
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface Alert {
  alert_id: string;
  org_id: string;
  agent_id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high';
  status: 'new' | 'acknowledged' | 'resolved';
  title: string;
  message: string;
  metadata: Record<string, any> | null;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

interface UseAlertsState {
  alerts: Alert[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_INTERVAL = 5000; // 5 seconds

export function useAlerts(
  agentId?: string,
  status?: 'new' | 'acknowledged' | 'resolved',
  limit: number = 50
): UseAlertsState {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchAlerts = useCallback(async () => {
    if (!isMountedRef.current) return;

    setIsLoading(true);
    try {
      const url = new URL('/api/monitoring/alerts', window.location.origin);
      if (agentId) {
        url.searchParams.append('agent_id', agentId);
      }
      if (status) {
        url.searchParams.append('status', status);
      }
      url.searchParams.append('limit', limit.toString());

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      const result = await response.json();

      if (isMountedRef.current) {
        setAlerts(result.data || []);
        setError(null);
      }
    } catch (err) {
      if (isMountedRef.current) {
        const message = err instanceof Error ? err.message : 'Failed to fetch alerts';
        setError(message);
        console.error('Error fetching alerts:', err);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [agentId, status, limit]);

  const refetch = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
    }
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    isMountedRef.current = true;

    const poll = async () => {
      await fetchAlerts();

      if (isMountedRef.current) {
        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      isMountedRef.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading,
    error,
    refetch,
  };
}
