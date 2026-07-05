'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

type UsePageMemoryOptions = {
  debounceMs?: number;
  enabled?: boolean;
};

export function usePageMemory<T extends object>(
  pageKey: string,
  initialValue: T,
  memoryKey = 'default',
  options: UsePageMemoryOptions = {},
) {
  const { debounceMs = 350, enabled = true } = options;
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipPersistRef = useRef(true);

  useEffect(() => {
    if (!enabled || !pageKey) {
      setLoaded(true);
      return;
    }

    let alive = true;
    skipPersistRef.current = true;

    const params = new URLSearchParams({ pageKey, memoryKey });
    fetch(`/api/ui-memory?${params.toString()}`, { cache: 'no-store' })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error || 'Failed to load page memory');
        return json as { payload?: unknown; missingMigration?: boolean };
      })
      .then((json) => {
        if (!alive) return;
        if (json.payload && typeof json.payload === 'object' && !Array.isArray(json.payload)) {
          setValue({ ...initialValue, ...(json.payload as Partial<T>) });
        }
        setError(json.missingMigration ? 'dsg_ui_memory migration is not applied yet' : null);
      })
      .catch((caught) => {
        if (!alive) return;
        setError(caught instanceof Error ? caught.message : 'Failed to load page memory');
      })
      .finally(() => {
        if (!alive) return;
        skipPersistRef.current = false;
        setLoaded(true);
      });

    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pageKey, memoryKey]);

  useEffect(() => {
    if (!enabled || !loaded || skipPersistRef.current || !pageKey) return;

    const id = window.setTimeout(() => {
      fetch('/api/ui-memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pageKey, memoryKey, payload: value }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const json = await response.json().catch(() => ({}));
            throw new Error(json.error || 'Failed to save page memory');
          }
          setError(null);
        })
        .catch((caught) => {
          setError(caught instanceof Error ? caught.message : 'Failed to save page memory');
        });
    }, debounceMs);

    return () => window.clearTimeout(id);
  }, [debounceMs, enabled, loaded, memoryKey, pageKey, value]);

  const reset = useCallback(() => {
    setValue(initialValue);
    if (!pageKey) return;
    const params = new URLSearchParams({ pageKey, memoryKey });
    fetch(`/api/ui-memory?${params.toString()}`, { method: 'DELETE' }).catch(() => undefined);
  }, [initialValue, memoryKey, pageKey]);

  return { value, setValue, loaded, error, reset };
}
