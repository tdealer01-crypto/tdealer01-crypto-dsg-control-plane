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
      if (!cancelled && data?.api_key) {
        // One-time reveal bridge only; persistent onboarding source-of-truth remains the org-scoped API/DB state.
        sessionStorage.setItem("dsg_new_api_key", data.api_key);
        sessionStorage.setItem("dsg_new_agent_id", data.agent_id ?? "");
      }
    }

    void runAutoSetupIfNeeded().catch(() => null);

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
