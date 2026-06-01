import { NextRequest, NextResponse } from "next/server";
import { requireOrgPermission } from "../../../../lib/auth/require-org-permission";
import { handleApiError } from "../../../../lib/security/api-error";
import { getSupabaseAdmin } from "../../../../lib/supabase-server";

export const dynamic = "force-dynamic";

const WIDGET_CHECKLIST_KEY = "dashboard_widget_v1";
const VALID_WIDGET_STEPS = new Set([
  "connect_integration",
  "run_governed_action",
  "review_evidence",
  "setup_team",
  "configure_approval",
  "export_audit_pack",
]);

type JsonObject = Record<string, unknown>;

type OnboardingWidgetState = {
  dismissed: boolean;
  completedStepIds: string[];
};

function objectValue(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function normalizeCompletedStepIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (step): step is string =>
          typeof step === "string" && VALID_WIDGET_STEPS.has(step),
      ),
    ),
  ].sort();
}

function widgetStateFromChecklist(checklist: unknown): OnboardingWidgetState {
  const root = objectValue(checklist);
  const widget = objectValue(root[WIDGET_CHECKLIST_KEY]);
  return {
    dismissed: widget.dismissed === true,
    completedStepIds: normalizeCompletedStepIds(widget.completedStepIds),
  };
}

function mergeWidgetState(
  checklist: unknown,
  nextWidget: OnboardingWidgetState,
): JsonObject {
  const root = { ...objectValue(checklist) };
  root[WIDGET_CHECKLIST_KEY] = {
    dismissed: nextWidget.dismissed,
    completedStepIds: nextWidget.completedStepIds,
  };
  return root;
}

async function loadOrgOnboarding(orgId: string) {
  const admin = getSupabaseAdmin();
  const state = await admin
    .from("org_onboarding_states")
    .select("id, bootstrap_status, checklist, bootstrapped_at")
    .eq("org_id", orgId)
    .maybeSingle();

  if (state.error) throw state.error;
  return state.data ?? null;
}

async function buildOnboardingResponse(orgId: string) {
  const admin = getSupabaseAdmin();
  const [state, agents, executions] = await Promise.all([
    loadOrgOnboarding(orgId),
    admin
      .from("agents")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
    admin
      .from("executions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", orgId),
  ]);

  if (agents.error) throw agents.error;
  if (executions.error) throw executions.error;

  const hasAgent = (agents.count ?? 0) > 0;
  const hasFirstExecution = (executions.count ?? 0) > 0;
  const bootstrapStatus = state?.bootstrap_status ?? "pending";
  const firstRunComplete = bootstrapStatus === "completed" && hasFirstExecution;

  const nextAction = firstRunComplete
    ? "Open executions dashboard"
    : hasAgent
      ? "Complete Auto-Setup in Skills to create your first execution"
      : "Complete Auto-Setup in Skills to create your first agent and first execution";

  return {
    org_id: orgId,
    onboarding: state,
    is_empty: !hasAgent,
    has_agent: hasAgent,
    has_first_execution: hasFirstExecution,
    first_run_complete: firstRunComplete,
    progress: {
      workspace_ready: true,
      agent_ready: hasAgent,
      first_execution_ready: hasFirstExecution,
    },
    widget: widgetStateFromChecklist(state?.checklist ?? null),
    next_action: nextAction,
  };
}

export async function GET() {
  try {
    const access = await requireOrgPermission("org.view_reports");
    if (access.ok !== true)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    return NextResponse.json(await buildOnboardingResponse(access.orgId));
  } catch (error) {
    return handleApiError("api/onboarding/state", error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requireOrgPermission("org.manage_agents");
    if (access.ok !== true)
      return NextResponse.json(
        { error: access.error },
        { status: access.status },
      );

    const body = (await request
      .json()
      .catch(() => null)) as Partial<OnboardingWidgetState> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Request body must be a JSON object" },
        { status: 400 },
      );
    }

    const existing = await loadOrgOnboarding(access.orgId);
    const currentWidget = widgetStateFromChecklist(existing?.checklist ?? null);
    const nextWidget: OnboardingWidgetState = {
      dismissed:
        typeof body.dismissed === "boolean"
          ? body.dismissed
          : currentWidget.dismissed,
      completedStepIds: Array.isArray(body.completedStepIds)
        ? normalizeCompletedStepIds(body.completedStepIds)
        : currentWidget.completedStepIds,
    };

    const now = new Date().toISOString();
    const nextChecklist = mergeWidgetState(
      existing?.checklist ?? null,
      nextWidget,
    ) as any;
    const admin = getSupabaseAdmin();

    if (existing?.id) {
      const updated = await admin
        .from("org_onboarding_states")
        .update({ checklist: nextChecklist, updated_at: now })
        .eq("id", existing.id)
        .eq("org_id", access.orgId)
        .select("id")
        .maybeSingle();
      if (updated.error) throw updated.error;
    } else {
      const inserted = await admin.from("org_onboarding_states").insert({
        org_id: access.orgId,
        bootstrap_status: "pending",
        checklist: nextChecklist,
        created_at: now,
        updated_at: now,
      });
      if (inserted.error) throw inserted.error;
    }

    return NextResponse.json(await buildOnboardingResponse(access.orgId));
  } catch (error) {
    return handleApiError("api/onboarding/state", error);
  }
}
