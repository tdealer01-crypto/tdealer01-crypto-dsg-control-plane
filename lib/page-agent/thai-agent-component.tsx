'use client';

import { useState, useRef } from 'react';

interface ExecuteRequest {
  command: string;
  commandType?: 'navigate' | 'click' | 'fill' | 'search' | 'extract' | 'status' | 'custom';
  payload?: Record<string, any>;
}

interface ExecuteResponse {
  success: boolean;
  result?: any;
  error?: string;
  timestamp: string;
  commandType?: string;
}

export function useThaiAgent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = async (request: ExecuteRequest): Promise<ExecuteResponse | null> => {
    setLoading(true);
    setError(null);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/dashboard/page-agent/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ExecuteResponse;
        const errorMessage = errorData.error || `HTTP Error: ${response.status}`;
        setError(errorMessage);
        return null;
      }

      const data = (await response.json()) as ExecuteResponse;

      if (data.success) {
        setResult(data.result);
      } else {
        setError(data.error || 'ไม่สามารถดำเนินการคำสั่งได้');
      }

      return data;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('ยกเลิกการดำเนินการคำสั่ง');
      } else {
        const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        setError(message);
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
    }
  };

  return {
    execute,
    cancel,
    loading,
    error,
    result,
  };
}

interface ThaiAgentControlPanelProps {
  onCommandExecuted?: (response: ExecuteResponse) => void;
  showHistory?: boolean;
  maxHistorySize?: number;
}

export function ThaiAgentControlPanel({
  onCommandExecuted,
  showHistory = true,
  maxHistorySize = 10,
}: ThaiAgentControlPanelProps) {
  const { execute, loading, error, result } = useThaiAgent();
  const [commandInput, setCommandInput] = useState('');
  const [history, setHistory] = useState<
    Array<{
      command: string;
      success: boolean;
      timestamp: string;
    }>
  >([]);

  const handleExecuteCommand = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!commandInput.trim()) {
      return;
    }

    const response = await execute({
      command: commandInput,
      commandType: 'custom',
    });

    if (response) {
      onCommandExecuted?.(response);

      // Add to history
      setHistory((prev) =>
        [
          {
            command: commandInput,
            success: response.success,
            timestamp: response.timestamp,
          },
          ...prev,
        ].slice(0, maxHistorySize)
      );

      // Clear input on success
      if (response.success) {
        setCommandInput('');
      }
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 p-4">
      <div>
        <h3 className="text-lg font-semibold">ควบคุม Dashboard ด้วยภาษาไทย</h3>
        <p className="text-sm text-gray-600">ป้อนคำสั่งภาษาไทยเพื่อควบคุม dashboard</p>
      </div>

      <form onSubmit={handleExecuteCommand} className="flex gap-2">
        <input
          type="text"
          value={commandInput}
          onChange={(e) => setCommandInput(e.target.value)}
          placeholder="พิมพ์คำสั่งภาษาไทย..."
          disabled={loading}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !commandInput.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:bg-gray-400 hover:bg-blue-700"
        >
          {loading ? 'รอสักครู่...' : 'ดำเนินการ'}
        </button>
      </form>

      {error && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">❌ ข้อผิดพลาด</p>
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="rounded bg-green-50 p-3 text-sm text-green-700">
          <p className="font-semibold">✅ สำเร็จ</p>
          <pre className="mt-2 max-h-48 overflow-auto rounded bg-white p-2 text-xs text-gray-800">
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <div className="border-t pt-4">
          <h4 className="mb-2 text-sm font-semibold">ประวัติคำสั่ง</h4>
          <div className="space-y-1">
            {history.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className={entry.success ? '✓' : '✗'}>{entry.success ? '✓' : '✗'}</span>
                <span className="flex-1 truncate text-gray-700">{entry.command}</span>
                <span className="text-gray-500">{new Date(entry.timestamp).toLocaleTimeString('th-TH')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
