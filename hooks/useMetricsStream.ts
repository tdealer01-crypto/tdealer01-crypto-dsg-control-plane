/**
 * useMetricsStream - Real-time metrics updates via SSE with auto-reconnect
 *
 * Usage:
 * const { metrics, isConnected, error, reconnect } = useMetricsStream('month', 'agent_123');
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface MetricsUpdate {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  totalTokens: number;
  totalCost: number;
  avgDuration: number;
  timestamp: string;
}

interface UseMetricsStreamState {
  metrics: MetricsUpdate | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export function useMetricsStream(
  period: 'day' | 'week' | 'month' = 'month',
  agentId?: string
): UseMetricsStreamState {
  const [metrics, setMetrics] = useState<MetricsUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    try {
      const url = new URL('/api/monitoring/metrics/stream-sse', window.location.origin);
      url.searchParams.append('period', period);
      if (agentId) {
        url.searchParams.append('agent_id', agentId);
      }

      const eventSource = new EventSource(url.toString());

      eventSource.onopen = () => {
        if (isMountedRef.current) {
          setIsConnected(true);
          setError(null);
          retryCountRef.current = 0;
        }
      };

      eventSource.onmessage = (event) => {
        if (isMountedRef.current) {
          try {
            const data = JSON.parse(event.data);
            setMetrics(data);
          } catch (err) {
            console.error('Failed to parse metrics update:', err);
          }
        }
      };

      eventSource.onerror = () => {
        if (!isMountedRef.current) return;

        setIsConnected(false);
        eventSource.close();

        if (retryCountRef.current < MAX_RETRIES) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCountRef.current);
          retryCountRef.current += 1;
          setError(`Reconnecting... (${retryCountRef.current}/${MAX_RETRIES})`);

          retryTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          setError('Failed to connect to stream (max retries exceeded)');
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setIsConnected(false);
    }
  }, [period, agentId]);

  const reconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    retryCountRef.current = 0;
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    connect();
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [connect]);

  return {
    metrics,
    isConnected,
    error,
    reconnect,
  };
}
