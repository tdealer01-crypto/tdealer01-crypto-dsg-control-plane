'use client';

import { useState, useEffect } from 'react';

type UiConfig = Record<string, unknown>;

export default function ConversationUiConfigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    params.then(({ id }) => {
      if (mounted) setConversationId(id);
    });
    return () => {
      mounted = false;
    };
  }, [params]);

  if (!conversationId) {
    return (
      <div className="p-6">
        <p className="text-gray-500">กำลังโหลดข้อมูลบทสนทนา...</p>
      </div>
    );
  }

  const uiConfigTarget = conversationId;
  const [uiConfig, setUiConfig] = useState<UiConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/conversations/${uiConfigTarget}/ui-config`);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        setUiConfig(json.ui_config ?? {});
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [conversationId]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/conversations/${uiConfigTarget}/ui-config`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ui_config: uiConfig }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setSuccess('บันทึก backend UI config แล้ว');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (key: string, value: unknown) => {
    setUiConfig((prev) => ({ ...prev, [key]: value }));
  };

  const removeKey = (key: string) => {
    setUiConfig((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-gray-500">กำลังโหลด backend UI config...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold">Backend UI Config</h1>
      <p className="mb-4 text-sm text-gray-600">
        Conversation ID: <code className="rounded bg-gray-100 px-1">{uiConfigTarget}</code>
      </p>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mb-4 space-y-3 rounded border p-4">
        {Object.keys(uiConfig).length === 0 && (
          <p className="text-sm text-gray-500">ยังไม่มี config key — เพิ่มด้านล่าง</p>
        )}
        {Object.entries(uiConfig).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-40 truncate text-sm font-medium">{key}</span>
            <input
              className="flex-1 rounded border px-2 py-1 text-sm"
              value={String(value ?? '')}
              onChange={(e) => updateValue(key, e.target.value)}
            />
            <button
              type="button"
              className="rounded border px-2 py-1 text-xs text-red-600"
              onClick={() => removeKey(key)}
            >
              ลบ
            </button>
          </div>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <input
          id="newKey"
          className="rounded border px-2 py-1 text-sm"
          placeholder="key ใหม่"
        />
        <input
          id="newValue"
          className="flex-1 rounded border px-2 py-1 text-sm"
          placeholder="value เริ่มต้น"
        />
        <button
          type="button"
          className="rounded border px-3 py-1 text-sm"
          onClick={() => {
            const keyEl = document.getElementById('newKey') as HTMLInputElement | null;
            const valEl = document.getElementById('newValue') as HTMLInputElement | null;
            const key = keyEl?.value?.trim();
            const value = valEl?.value?.trim();
            if (!key) return;
            updateValue(key, value ?? '');
            if (keyEl) keyEl.value = '';
            if (valEl) valEl.value = '';
          }}
        >
          เพิ่ม key
        </button>
      </div>

      <button
        type="button"
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
        disabled={saving}
        onClick={handleSave}
      >
        {saving ? 'กำลังบันทึก...' : 'บันทึก backend UI config'}
      </button>
    </div>
  );
}
