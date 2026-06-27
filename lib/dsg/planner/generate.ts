export type PlannerDomain = 'ai_agent' | 'workflow_automation' | 'finance_action' | 'deployment_action' | 'connector_api_call';
export type PlannerRiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type PlannerMode = 'monitor' | 'gateway' | 'dry_run';

export type PlannerGenerateInput = {
  goal: string;
  domain: PlannerDomain;
  riskLevel: PlannerRiskLevel;
  mode: PlannerMode;
};

type PlannerStep = {
  id: string;
  title: string;
  purpose: string;
  evidenceRequired: string[];
  risk: string;
};

export type DraftPlan = {
  requestedAction: string;
  actor: string;
  resource: string;
  riskLevel: string;
  policyVersion: '1.0';
  requiredApproval: string;
  requiredEvidence: string[];
  connectorDependency: string;
  riskReason: string;
  steps: PlannerStep[];
};

export type PlannerGenerateResponse = {
  ok: boolean;
  type: 'dsg-generated-draft-plan';
  source: 'llm_draft' | 'fallback_local_draft';
  provider: 'openrouter';
  model: 'openrouter/free';
  execution: 'not_executed';
  plan: DraftPlan;
  claimBoundary: {
    draftOnly: true;
    notExecuted: true;
    notGateDecision: true;
  };
  review?: { reason: 'invalid_plan_schema' | 'provider_unavailable'; status: 'REVIEW' };
};

const OPENROUTER_TIMEOUT_MS = 12_000;
const OPENROUTER_MAX_TOKENS = 700;

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validatePlannerInput(body: unknown): PlannerGenerateInput | null {
  if (!isObject(body)) return null;
  const goal = text(body.goal);
  const domain = text(body.domain) as PlannerDomain;
  const riskLevel = text(body.riskLevel) as PlannerRiskLevel;
  const mode = text(body.mode) as PlannerMode;
  if (!goal) return null;
  if (!['ai_agent', 'workflow_automation', 'finance_action', 'deployment_action', 'connector_api_call'].includes(domain)) return null;
  if (!['low', 'medium', 'high', 'critical'].includes(riskLevel)) return null;
  if (!['monitor', 'gateway', 'dry_run'].includes(mode)) return null;
  return { goal, domain, riskLevel, mode };
}

function fallbackDraft(input: PlannerGenerateInput): DraftPlan {
  return {
    requestedAction: input.goal,
    actor: 'operator',
    resource: input.domain,
    riskLevel: input.riskLevel,
    policyVersion: '1.0',
    requiredApproval: input.riskLevel === 'high' || input.riskLevel === 'critical' ? 'security_approver' : 'operator',
    requiredEvidence: ['policyVersion', 'inputHash', 'nonce', 'idempotencyKey'],
    connectorDependency: input.domain === 'connector_api_call' ? 'connector_registry' : 'none',
    riskReason: `${input.riskLevel} risk in ${input.mode} mode for ${input.domain}`,
    steps: [
      { id: 's1', title: 'Classify request intent', purpose: 'Map requested action to deterministic control taxonomy.', evidenceRequired: ['goal_text'], risk: input.riskLevel },
      { id: 's2', title: 'Prepare controller input', purpose: 'Build draft payload for deterministic evaluate route.', evidenceRequired: ['policyVersion', 'nonce'], risk: input.riskLevel },
    ],
  };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export function validateDraftPlan(value: unknown): DraftPlan | null {
  if (!isObject(value)) return null;
  const steps = value.steps;
  if (!Array.isArray(steps) || !steps.length) return null;
  const normalizedSteps: PlannerStep[] = [];
  for (const step of steps) {
    if (!isObject(step)) return null;
    const id = text(step.id);
    const title = text(step.title);
    const purpose = text(step.purpose);
    const risk = text(step.risk);
    if (!id || !title || !purpose || !risk || !isStringArray(step.evidenceRequired)) return null;
    normalizedSteps.push({ id, title, purpose, risk, evidenceRequired: step.evidenceRequired.map((item) => item.trim()) });
  }

  const plan: DraftPlan = {
    requestedAction: text(value.requestedAction),
    actor: text(value.actor),
    resource: text(value.resource),
    riskLevel: text(value.riskLevel),
    policyVersion: '1.0',
    requiredApproval: text(value.requiredApproval),
    requiredEvidence: isStringArray(value.requiredEvidence) ? value.requiredEvidence.map((item) => item.trim()) : [],
    connectorDependency: text(value.connectorDependency),
    riskReason: text(value.riskReason),
    steps: normalizedSteps,
  };

  if (!plan.requestedAction || !plan.actor || !plan.resource || !plan.riskLevel || !plan.requiredApproval || !plan.requiredEvidence.length || !plan.connectorDependency || !plan.riskReason) return null;
  return plan;
}

export async function generateDraftPlan(input: PlannerGenerateInput): Promise<PlannerGenerateResponse> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return { ok: true, type: 'dsg-generated-draft-plan', source: 'fallback_local_draft', provider: 'openrouter', model: 'openrouter/free', execution: 'not_executed', plan: fallbackDraft(input), claimBoundary: { draftOnly: true, notExecuted: true, notGateDecision: true }, review: { reason: 'provider_unavailable', status: 'REVIEW' } };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'DSG ONE',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        max_tokens: OPENROUTER_MAX_TOKENS,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: 'Return strict JSON draft plan only. Never claim execution or gate decision.' },
          { role: 'user', content: `Generate draft plan JSON for goal="${input.goal}", domain="${input.domain}", riskLevel="${input.riskLevel}", mode="${input.mode}".` },
        ],
      }),
    });
    if (!response.ok) throw new Error(`openrouter_${response.status}`);
    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = text(json.choices?.[0]?.message?.content);
    const parsed = content ? JSON.parse(content) : null;
    const plan = validateDraftPlan(parsed);
    if (!plan) {
      return { ok: true, type: 'dsg-generated-draft-plan', source: 'fallback_local_draft', provider: 'openrouter', model: 'openrouter/free', execution: 'not_executed', plan: fallbackDraft(input), claimBoundary: { draftOnly: true, notExecuted: true, notGateDecision: true }, review: { reason: 'invalid_plan_schema', status: 'REVIEW' } };
    }
    return { ok: true, type: 'dsg-generated-draft-plan', source: 'llm_draft', provider: 'openrouter', model: 'openrouter/free', execution: 'not_executed', plan, claimBoundary: { draftOnly: true, notExecuted: true, notGateDecision: true } };
  } catch {
    return { ok: true, type: 'dsg-generated-draft-plan', source: 'fallback_local_draft', provider: 'openrouter', model: 'openrouter/free', execution: 'not_executed', plan: fallbackDraft(input), claimBoundary: { draftOnly: true, notExecuted: true, notGateDecision: true }, review: { reason: 'provider_unavailable', status: 'REVIEW' } };
  } finally {
    clearTimeout(timeout);
  }
}
