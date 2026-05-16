'use client';

import { useEffect } from 'react';

const STORAGE_KEY = 'dsg_auto_setup_triggered_v1';

export default function AutoSetupTrigger() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    localStorage.setItem(STORAGE_KEY, '1');

    fetch('/api/setup/auto', { method: 'POST' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.api_key) {
          // Store one-time API key for the skills page to display
          sessionStorage.setItem('dsg_new_api_key', data.api_key);
          sessionStorage.setItem('dsg_new_agent_id', data.agent_id ?? '');
        }
      })
      .catch(() => {
        // Reset so it retries on next load
        localStorage.removeItem(STORAGE_KEY);
      });
  }, []);

  return null;
}
