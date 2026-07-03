/**
 * useMonitoring - React hooks for monitoring data
 * Phase 2: Dashboard data fetching
 */

import { useEffect, useState, useCallback } from 'react';

/**
 * Hook to fetch execution list
 */
export function useExecutions(options?: {
  agentId?: string;
  status?: string;
  limit?: number;
  offset?: number;
  pollInterval?: number;
}) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExecutions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (options?.agentId) params.set('agent_id', options.agentId);
      if (options?.status) params.set('status', options.status);
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.offset) params.set('offset', options.offset.toString());

      const response = await fetch(`/api/monitoring/executions?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || []);
      setTotal(result.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch executions');
    } finally {
      setLoading(false);
    }
  }, [options?.agentId, options?.status, options?.limit, options?.offset]);

  useEffect(() => {
    fetchExecutions();

    if (options?.pollInterval) {
      const interval = setInterval(fetchExecutions, options.pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchExecutions, options?.pollInterval]);

  return { data, total, loading, error, refetch: fetchExecutions };
}

/**
 * Hook to fetch metrics
 */
export function useMetrics(options?: {
  agentId?: string;
  period?: 'day' | 'week' | 'month';
  pollInterval?: number;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (options?.agentId) params.set('agent_id', options.agentId);
      if (options?.period) params.set('period', options.period);

      const response = await fetch(`/api/monitoring/metrics?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
    } finally {
      setLoading(false);
    }
  }, [options?.agentId, options?.period]);

  useEffect(() => {
    fetchMetrics();

    if (options?.pollInterval) {
      const interval = setInterval(fetchMetrics, options.pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, options?.pollInterval]);

  return { data, loading, error, refetch: fetchMetrics };
}

/**
 * Hook to fetch execution detail
 */
export function useExecutionDetail(executionId?: string, pollInterval?: number) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(!!executionId);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!executionId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/monitoring/sessions/${executionId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch execution detail');
    } finally {
      setLoading(false);
    }
  }, [executionId]);

  useEffect(() => {
    fetchDetail();

    if (pollInterval && executionId) {
      const interval = setInterval(fetchDetail, pollInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDetail, pollInterval, executionId]);

  return { data, loading, error, refetch: fetchDetail };
}
