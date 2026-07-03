/**
 * useExecutionStream - Real-time execution updates via SSE with auto-reconnect
 *
 * Usage:
 * const { executions, isConnected, error, reconnect } = useExecutionStream('agent_123');
 *
 * // Subscribe to updates
 * useEffect(() => {
 *   if (executions) {
 *     // Handle new execution
 *   }
 * }, [executions]);
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ExecutionUpdate {
  execution_id: string;
  agent_id: string;
  status: 'running' | 'success' | 'failure' | 'blocked';
  total_tokens: number;
  total_cost_usd: number;
  start_time: string;
  end_time?: string;
  timestamp: string;
}

interface UseExecutionStreamState {
  executions: ExecutionUpdate | null;
  isConnected: boolean;
  error: string | null;
  reconnect: () => void;
}

const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export function useExecutionStream(agentId?: string): UseExecutionStreamState {
  const [executions, setExecutions] = useState<ExecutionUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!agentId) {
      setError('agent_id is required');
      return;
    }

    try {
      const url = new URL('/api/monitoring/executions/stream-sse', window.location.origin);
      url.searchParams.append('agent_id', agentId);

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
            setExecutions(data);
          } catch (err) {
            console.error('Failed to parse execution update:', err);
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
  }, [agentId]);

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
    executions,
    isConnected,
    error,
    reconnect,
  };
}
