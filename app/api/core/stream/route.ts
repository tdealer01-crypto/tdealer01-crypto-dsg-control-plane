import { createClient } from "../../../../lib/supabase/server";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";
import {
  getDSGCoreHealth,
  getDSGCoreMetrics,
  getDSGCoreAuditEvents,
  getDSGCoreDeterminism,
} from "../../../../lib/dsg-core";

export const dynamic = "force-dynamic";

type AccessResult =
  | { ok: true; orgId: string }
  | { ok: false; status: 401 | 403; error: string };

async function requireActiveProfile(): Promise<AccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("org_id, is_active")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile?.org_id || !profile.is_active) {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  return { ok: true, orgId: String(profile.org_id) };
}

function sse(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET() {
  const access = await requireActiveProfile();
  if (access.ok === false) {
    return new Response(access.error, { status: access.status });
  }

  const orgId = access.orgId;
  const admin = getSupabaseAdmin();

  let stopStream: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let closed = false;

      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sse(event, data)));
      };

      const tick = async () => {
        try {
          const [health, metrics, audit, executionsRes] = await Promise.all([
            getDSGCoreHealth(),
            getDSGCoreMetrics(),
            getDSGCoreAuditEvents(5),
            admin
              .from("executions")
              .select("id, decision, latency_ms, created_at")
              .eq("org_id", orgId)
              .order("created_at", { ascending: false })
              .limit(5),
          ]);

          send("core_health", health);
          send("core_metrics", metrics);
          send("audit_update", audit);

          if (executionsRes.error) {
            send("alert", {
              level: "error",
              code: "EXECUTION_FEED_FAILED",
              message: executionsRes.error.message,
            });
          } else {
            send("execution_update", executionsRes.data || []);
          }

          const latestSequence =
            audit.ok && Array.isArray(audit.items) && audit.items.length > 0
              ? Number(audit.items[0]?.sequence || 0)
              : 0;

          const determinism =
            latestSequence > 0
              ? await getDSGCoreDeterminism(latestSequence)
              : { ok: false as const, error: "No sequence available" };

          send("determinism_update", determinism);

          const ready = !!health.ok && !!metrics.ok && !!audit.ok && !!determinism.ok;
          const status = ready ? "ready" : health.ok ? "degraded" : "down";

          send("readiness_update", {
            ready,
            status,
            generated_at: new Date().toISOString(),
          });
        } catch (error) {
          send("alert", {
            level: "error",
            code: "STREAM_FAILURE",
            message: error instanceof Error ? error.message : "Unknown stream error",
          });
        }
      };

      send("connected", {
        ok: true,
        org_id: orgId,
        connected_at: new Date().toISOString(),
      });

      void tick();
      const updateTimer = setInterval(() => {
        void tick();
      }, 3000);

      const heartbeatTimer = setInterval(() => {
        send("heartbeat", { ts: new Date().toISOString() });
      }, 15000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(updateTimer);
        clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          // no-op
        }
      };

      stopStream = close;
    },
    cancel() {
      stopStream?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
