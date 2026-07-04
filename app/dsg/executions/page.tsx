'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

/**
 * Execution object type representing a control plane task execution
 */
interface Execution extends Record<string, unknown> {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'cancelled';
  created: string;
  duration?: number;
  name?: string;
  description?: string;
}

/**
 * WebSocket message types from the execution service
 */
interface ExecutionUpdate {
  type: 'execution.created' | 'execution.updated' | 'execution.completed';
  data: Execution;
}

interface WebSocketMessage {
  type: string;
  data?: unknown;
}

/**
 * Real-time execution monitor for DSG control plane
 * Connects to WebSocket for live updates and displays executions in a sortable table
 */
export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  /**
   * Get status badge variant based on execution status
   */
  const getStatusVariant = (status: Execution['status']): 'default' | 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'running':
        return 'info';
      case 'pending':
        return 'warning';
      case 'cancelled':
        return 'warning';
      default:
        return 'default';
    }
  };

  /**
   * Format duration in milliseconds to human-readable format
   */
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.round(minutes / 60);
    return `${hours}h`;
  };

  /**
   * Format ISO timestamp to local time string
   */
  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  /**
   * Add or update execution in the list, maintaining order and limiting to 100
   */
  const addOrUpdateExecution = useCallback((execution: Execution) => {
    setExecutions((prev) => {
      const filtered = prev.filter((e) => e.id !== execution.id);
      const updated = [execution, ...filtered].slice(0, 100);
      return updated;
    });
  }, []);

  /**
   * Establish WebSocket connection with error handling
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setError(null);
      const wsUrl =
        process.env.NEXT_PUBLIC_WEBSOCKET_URL ||
        (() => {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
          return `${protocol}//${window.location.host}/ws`;
        })();
      const ws = new WebSocket(wsUrl);

      ws.addEventListener('open', () => {
        console.log('[Executions] WebSocket connected');
        setIsConnected(true);
        setIsLoading(false);
        reconnectAttemptsRef.current = 0;
        setError(null);

        // Send initial heartbeat
        try {
          ws.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.warn('[Executions] Failed to send initial ping:', err);
        }
      });

      ws.addEventListener('message', (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'pong') {
            // Respond to heartbeat
            return;
          }

          if (message.type === 'execution.created' ||
              message.type === 'execution.updated' ||
              message.type === 'execution.completed') {
            const update = message as ExecutionUpdate;
            if (update.data) {
              addOrUpdateExecution(update.data);
            }
          }
        } catch (err) {
          console.warn('[Executions] Failed to parse WebSocket message:', err);
        }
      });

      ws.addEventListener('error', (event) => {
        console.error('[Executions] WebSocket error:', event);
        setIsConnected(false);
        setError('Connection error. Attempting to reconnect...');
      });

      ws.addEventListener('close', () => {
        console.log('[Executions] WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);
          console.log(`[Executions] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket();
          }, delay);
        } else {
          setError('Connection lost. Max reconnection attempts reached.');
          setIsLoading(false);
        }
      });

      wsRef.current = ws;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Executions] Failed to create WebSocket:', message);
      setError(`Failed to connect: ${message}`);
      setIsLoading(false);
    }
  }, [addOrUpdateExecution]);

  /**
   * Manually refresh executions list
   */
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // In a real implementation, this would fetch from an API endpoint
      // For now, just reset connection
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'refresh' }));
      }
    } catch (err) {
      console.warn('[Executions] Refresh failed:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  /**
   * Cleanup WebSocket connection on unmount
   */
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  /**
   * Initialize WebSocket connection on mount
   */
  useEffect(() => {
    connectWebSocket();
  }, [connectWebSocket]);

  /**
   * Set up periodic heartbeat to keep connection alive
   */
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          wsRef.current.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.warn('[Executions] Heartbeat failed:', err);
        }
      }
    }, 30000); // Heartbeat every 30 seconds

    return () => clearInterval(heartbeatInterval);
  }, [isConnected]);

  const columns = [
    {
      key: 'id',
      label: 'ID',
      render: (value: unknown) => (
        <span className="font-mono text-xs text-[#AAB3C5]">{String(value).slice(0, 12)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      align: 'center' as const,
      render: (value: unknown) => (
        <Badge variant={getStatusVariant(value as Execution['status'])}>
          {String(value).toUpperCase()}
        </Badge>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      render: (value: unknown) => <span>{value ? String(value) : '-'}</span>,
    },
    {
      key: 'created',
      label: 'Created',
      render: (value: unknown) => <span className="text-xs text-[#AAB3C5]">{formatTime(String(value))}</span>,
    },
    {
      key: 'duration',
      label: 'Duration',
      align: 'right' as const,
      render: (value: unknown) => <span className="text-xs text-[#AAB3C5]">{formatDuration(value as number)}</span>,
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'center' as const,
      render: (value: unknown) => (
        <Button variant="ghost" size="sm" onClick={(e) => {
          e.stopPropagation();
          console.log(`View execution: ${value}`);
          // TODO: Navigate to execution details
        }}>
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050507] via-[#0A0D14] to-[#050507] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-[#F8FAFC]">Executions</h1>
          <p className="text-sm text-[#AAB3C5]">Real-time monitoring of DSG control plane executions</p>
        </div>

        {/* Status Card */}
        <Card variant="default" className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isConnected ? (
              <>
                <Wifi className="h-5 w-5 text-emerald-400" />
                <span className="text-sm text-[#F8FAFC]">
                  Connected <span className="text-[#AAB3C5]">(Live updates)</span>
                </span>
              </>
            ) : (
              <>
                <WifiOff className="h-5 w-5 text-red-400" />
                <span className="text-sm text-[#F8FAFC]">
                  Disconnected <span className="text-[#AAB3C5]">(Reconnecting...)</span>
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#AAB3C5]">{executions.length} executions</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing || !isConnected}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card variant="red" className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-red-200">Connection Error</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card variant="default" className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-flex items-center justify-center h-8 w-8 rounded-full border-2 border-[#F7DC78] border-t-transparent animate-spin mb-4" />
              <p className="text-sm text-[#AAB3C5]">Connecting to execution service...</p>
            </div>
          </Card>
        )}

        {/* Executions Table */}
        {!isLoading && (
          <Card variant="default">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[#F8FAFC]">Recent Executions</h2>
                <span className="text-xs text-[#AAB3C5]">Showing last 100</span>
              </div>
              <Table<Execution>
                columns={columns}
                rows={executions}
                emptyMessage="No executions yet. Waiting for events..."
                sortable={true}
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
