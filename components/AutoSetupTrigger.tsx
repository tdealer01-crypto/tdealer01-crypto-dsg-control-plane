"use client";

import { useEffect } from "react";

export default function AutoSetupTrigger() {
  useEffect(() => {
    let cancelled = false;

    async function runAutoSetupIfNeeded() {
      const stateResponse = await fetch("/api/onboarding/state", {
        cache: "no-store",
      });
      if (!stateResponse.ok) return;

      const state = (await stateResponse.json()) as { is_empty?: boolean };
      if (cancelled || state.is_empty !== true) return;

      const setupResponse = await fetch("/api/setup/auto", { method: "POST" });
      const data = await setupResponse.json().catch(() => null);
      // Auto-setup completed; persistent onboarding source-of-truth is the org-scoped API/DB state.
      // api_key and agent_id are available via authenticated API routes — not stored in browser storage.
    }

    void runAutoSetupIfNeeded().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
