import { runOpenAIAdapter } from '@/lib/dsg/ai/openai-adapter';
import type { AppBuilderJob } from './model';

export type AiPlanReviewResult = {
  status: 'PASS' | 'REVISE' | 'BLOCK';
  deterministicStatus: 'PASS' | 'REVISE' | 'BLOCK';
  aiStatus: 'PASS' | 'REVISE' | 'BLOCK' | 'UNAVAILABLE';
  score: number;
  issues: string[];
  requiredFixes: string[];
  acceptedReasons: string[];
  truthBoundary: string;
};

function compact(value: string, max = 1200) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

function extractJsonObject(value: string) {
  const fenced = value.trim().match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const source = fenced || value.trim();
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('AI_PLAN_REVIEW_JSON_NOT_FOUND');
  return JSON.parse(source.slice(start, end + 1)) as Record<string, unknown>;
}

function stringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter((item): item is string => typeof item === 'string').map((item) => compact(item, 180)).filter(Boolean).slice(0, 10);
  return items.length ? items : fallback;
}

function statusValue(value: unknown): 'PASS' | 'REVISE' | 'BLOCK' {
  return value === 'PASS' || value === 'BLOCK' || value === 'REVISE' ? value : 'REVISE';
}

function deterministicReview(job: AppBuilderJob) {
  const goal = `${job.goal?.normalizedGoal || ''} ${job.goal?.originalGoal || ''}`.toLowerCase();
  const planText = JSON.stringify(job.proposedPlan || {}).toLowerCase();
  const prdText = JSON.stringify(job.prd || {}).toLowerCase();
  const issues: string[] = [];
  const acceptedReasons: string[] = [];

  if (!job.goal) issues.push('GOAL_NOT_LOCKED');
  if (!job.proposedPlan) issues.push('PLAN_MISSING');
  if (!job.prd) issues.push('PRD_MISSING');

  const virtualPc = /virtual pc|pc เสมือน|คอมเสมือน|windows|วินโด้|remote mouse|รีโมตเมาส์|เมาส์|จอ|monitor/i.test(goal);
  if (virtualPc) {
    const checks = [
      ['VIRTUAL_PC_MONITOR', /virtual pc|pc เสมือน|คอมเสมือน|monitor|จอ|screen|desktop|windows|วินโด้/i],
      ['REMOTE_MOUSE_API', /remote mouse|mouse api|เมาส์|เม้า|pointer|cursor/i],
      ['GOVERNANCE_INVARIANT_EVIDENCE', /governance|invariant|policy|gate|audit|evidence|proof|กำกับ|หลักฐาน/i],
    ] as const;
    for (const [code, pattern] of checks) {
      if (!pattern.test(planText) && !pattern.test(prdText)) issues.push(`MISSING_${code}`);
      else acceptedReasons.push(`Plan maps ${code}.`);
    }
  }

  const phases = job.proposedPlan?.steps.map((step) => step.phase) || [];
  for (const phase of ['IMPLEMENT_FRONTEND', 'IMPLEMENT_BACKEND', 'TEST'] as const) {
    if (!phases.includes(phase)) issues.push(`MISSING_PHASE_${phase}`);
  }

  const blocked = issues.includes('GOAL_NOT_LOCKED') || issues.includes('PLAN_MISSING');
  return { status: blocked ? 'BLOCK' as const : issues.length ? 'REVISE' as const : 'PASS' as const, issues, acceptedReasons };
}

async function aiReview(job: AppBuilderJob) {
  const result = await runOpenAIAdapter({
    temperature: 0.1,
    maxOutputTokens: 900,
    messages: [
      {
        role: 'developer',
        content: [
          'You are the DSG App Builder plan reviewer before approval.',
          'Return JSON only. No markdown.',
          'Status PASS only if the plan clearly maps the user goal to UI, API/backend, evidence, governance gates, and test/build proof.',
          'Do not approve a generic CRUD/item plan when the goal asks for a specific app.',
          'Schema: { status:"PASS"|"REVISE"|"BLOCK", score:number, issues:string[], requiredFixes:string[], acceptedReasons:string[] }',
        ].join('\n'),
      },
      { role: 'user', content: JSON.stringify({ goal: job.goal, prd: job.prd, proposedPlan: job.proposedPlan, gateResult: job.gateResult }) },
    ],
  });
  const parsed = extractJsonObject(result.outputText);
  return {
    status: statusValue(parsed.status),
    score: typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 0,
    issues: stringArray(parsed.issues, []),
    requiredFixes: stringArray(parsed.requiredFixes, []),
    acceptedReasons: stringArray(parsed.acceptedReasons, []),
  };
}

export async function reviewAppBuilderPlan(job: AppBuilderJob): Promise<AiPlanReviewResult> {
  const deterministic = deterministicReview(job);
  if (deterministic.status === 'BLOCK') {
    return {
      status: 'BLOCK',
      deterministicStatus: deterministic.status,
      aiStatus: 'UNAVAILABLE',
      score: 0,
      issues: deterministic.issues,
      requiredFixes: ['Regenerate the plan after locking a valid goal and PRD.'],
      acceptedReasons: deterministic.acceptedReasons,
      truthBoundary: 'Plan review blocked before approval. Runtime execution must not run.',
    };
  }

  try {
    const ai = await aiReview(job);
    const pass = deterministic.status === 'PASS' && ai.status === 'PASS';
    const block = ai.status === 'BLOCK';
    return {
      status: pass ? 'PASS' : block ? 'BLOCK' : 'REVISE',
      deterministicStatus: deterministic.status,
      aiStatus: ai.status,
      score: ai.score,
      issues: [...deterministic.issues, ...ai.issues],
      requiredFixes: ai.requiredFixes.length ? ai.requiredFixes : ['Refine or regenerate the plan until it maps the design draft.'],
      acceptedReasons: [...deterministic.acceptedReasons, ...ai.acceptedReasons],
      truthBoundary: pass
        ? 'Plan review passed. Approval may proceed, but runtime output remains IMPLEMENTED_UNVERIFIED until PR/CI/deploy/evidence pass.'
        : 'Plan review did not reach agreement. Do not approve or run runtime execution yet.',
    };
  } catch {
    return {
      status: deterministic.status === 'PASS' ? 'REVISE' : deterministic.status,
      deterministicStatus: deterministic.status,
      aiStatus: 'UNAVAILABLE',
      score: deterministic.status === 'PASS' ? 50 : 0,
      issues: ['AI_PLAN_REVIEW_UNAVAILABLE', ...deterministic.issues],
      requiredFixes: ['Run AI review before auto-approval, or use explicit manual override evidence.'],
      acceptedReasons: deterministic.acceptedReasons,
      truthBoundary: 'AI plan review was unavailable. Auto-approval is blocked unless explicit manual override is recorded.',
    };
  }
}
