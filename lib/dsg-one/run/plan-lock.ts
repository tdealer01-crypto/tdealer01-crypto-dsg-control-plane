/**
 * DSG ONE — Plan Lock (product layer 1).
 *
 * Turns a plain-language intent into a plan the user can check and the gate can
 * enforce. The user sees what the agent will do, which systems it will touch,
 * and what it explicitly will not do, then approves once.
 *
 * Claim boundary: this is a deterministic compiler, not an LLM planner. It maps
 * a recognised intent shape onto a template plan. That is a real limitation and
 * is stated in the API response as `planner: 'deterministic'` rather than
 * papered over — an unrecognised intent yields no plan instead of a guess.
 */

import { randomUUID } from 'crypto';
import { DETERMINISTIC_POLICY_VERSION } from '../../dsg/deterministic/policy-manifest';
import type { RunPlan, RunPlanStep, RunRiskLevel } from './types';

/** Integrations a plan may name. Deliberately the customer's existing systems. */
export const SUPPORTED_TARGET_SYSTEMS = ['github', 'vercel', 'supabase'] as const;

export type SupportedTargetSystem = (typeof SUPPORTED_TARGET_SYSTEMS)[number];

export function isSupportedTargetSystem(value: string): value is SupportedTargetSystem {
  return (SUPPORTED_TARGET_SYSTEMS as readonly string[]).includes(value);
}

interface StepTemplate {
  summary: string;
  actionType: string;
  targetSystem: SupportedTargetSystem;
  operation: string;
  riskLevel: RunRiskLevel;
  phase: RunPlanStep['phase'];
}

interface PlanTemplate {
  id: string;
  /** Lower-cased keywords; all of `requires` must appear in the intent. */
  requires: string[][];
  maxRiskLevel: RunRiskLevel;
  exclusions: string[];
  steps: StepTemplate[];
}

/**
 * Templates are ordered; the first whose keywords all match wins. Keep the
 * narrowest template first so "deploy to production" does not fall into the
 * broader "deploy" case.
 */
const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'deploy-release',
    requires: [['deploy', 'release', 'ship'], ['production', 'prod', 'live']],
    maxRiskLevel: 'high',
    exclusions: [
      'Will not change environment variables or secrets',
      'Will not run database migrations',
      'Will not delete or roll back existing deployments',
    ],
    steps: [
      {
        summary: 'Confirm the release commit is green on CI',
        actionType: 'READ',
        targetSystem: 'github',
        operation: 'checks.read',
        riskLevel: 'low',
        phase: 'Verifying',
      },
      {
        summary: 'Promote the verified build to production',
        actionType: 'DEPLOY',
        targetSystem: 'vercel',
        operation: 'deployment.promote',
        riskLevel: 'high',
        phase: 'Executing',
      },
      {
        summary: 'Check production health after the deploy',
        actionType: 'READ',
        targetSystem: 'vercel',
        operation: 'deployment.health',
        riskLevel: 'low',
        phase: 'Checking',
      },
    ],
  },
  {
    id: 'deploy-preview',
    requires: [['deploy', 'preview', 'ship']],
    maxRiskLevel: 'medium',
    exclusions: [
      'Will not touch the production deployment',
      'Will not change environment variables or secrets',
    ],
    steps: [
      {
        summary: 'Build a preview deployment from the current branch',
        actionType: 'DEPLOY',
        targetSystem: 'vercel',
        operation: 'deployment.create',
        riskLevel: 'medium',
        phase: 'Executing',
      },
      {
        summary: 'Check the preview responds',
        actionType: 'READ',
        targetSystem: 'vercel',
        operation: 'deployment.health',
        riskLevel: 'low',
        phase: 'Checking',
      },
    ],
  },
  {
    id: 'open-pull-request',
    requires: [['pull request', 'pr', 'branch'], ['open', 'create', 'raise', 'push']],
    maxRiskLevel: 'medium',
    exclusions: [
      'Will not merge the pull request',
      'Will not push to the default branch',
      'Will not modify repository settings',
    ],
    steps: [
      {
        summary: 'Push the working branch',
        actionType: 'WRITE',
        targetSystem: 'github',
        operation: 'branch.push',
        riskLevel: 'medium',
        phase: 'Executing',
      },
      {
        summary: 'Open a pull request for review',
        actionType: 'WRITE',
        targetSystem: 'github',
        operation: 'pull_request.create',
        riskLevel: 'low',
        phase: 'Executing',
      },
    ],
  },
  {
    id: 'apply-migration',
    requires: [['migration', 'schema', 'database'], ['apply', 'run', 'migrate']],
    maxRiskLevel: 'critical',
    exclusions: [
      'Will not drop tables or columns',
      'Will not disable row level security',
      'Will not modify data outside the migration',
    ],
    steps: [
      {
        summary: 'Check the migration is idempotent and non-destructive',
        actionType: 'READ',
        targetSystem: 'github',
        operation: 'file.read',
        riskLevel: 'low',
        phase: 'Verifying',
      },
      {
        summary: 'Apply the migration to the target database',
        actionType: 'WRITE',
        targetSystem: 'supabase',
        operation: 'migration.apply',
        riskLevel: 'critical',
        phase: 'Executing',
      },
      {
        summary: 'Confirm the expected schema objects exist',
        actionType: 'READ',
        targetSystem: 'supabase',
        operation: 'schema.read',
        riskLevel: 'low',
        phase: 'Checking',
      },
    ],
  },
];

function matches(intent: string, template: PlanTemplate): boolean {
  const haystack = intent.toLowerCase();
  return template.requires.every((group) => group.some((word) => haystack.includes(word)));
}

export interface CompilePlanResult {
  ok: boolean;
  templateId: string | null;
  plan: RunPlan | null;
  /** Why no plan was produced. Shown to the user verbatim. */
  reason: string | null;
}

/**
 * Compile an intent into a lockable plan.
 *
 * Returns `ok: false` when no template matches. That is the honest outcome: a
 * plan the user cannot check is worse than no plan, because approving it would
 * freeze a planHash over steps nobody agreed to.
 */
export function compilePlan(intent: string): CompilePlanResult {
  const trimmed = intent.trim();

  if (trimmed.length < 4) {
    return {
      ok: false,
      templateId: null,
      plan: null,
      reason: 'Tell DSG what you want the agent to do, in a sentence.',
    };
  }

  const template = PLAN_TEMPLATES.find((candidate) => matches(trimmed, candidate));
  if (!template) {
    return {
      ok: false,
      templateId: null,
      plan: null,
      reason:
        'DSG cannot build a checkable plan for that yet. Supported today: deploy a release, ' +
        'create a preview deployment, open a pull request, or apply a database migration.',
    };
  }

  const steps: RunPlanStep[] = template.steps.map((step, index) => ({
    stepId: randomUUID(),
    ordinal: index + 1,
    summary: step.summary,
    actionType: step.actionType,
    targetSystem: step.targetSystem,
    operation: step.operation,
    riskLevel: step.riskLevel,
    phase: step.phase,
  }));

  const plan: RunPlan = {
    intent: trimmed,
    steps,
    allowedTargetSystems: [...new Set(steps.map((step) => step.targetSystem))].sort(),
    allowedOperations: [...new Set(steps.map((step) => step.operation))].sort(),
    maxRiskLevel: template.maxRiskLevel,
    exclusions: template.exclusions,
    policyVersion: DETERMINISTIC_POLICY_VERSION,
  };

  return { ok: true, templateId: template.id, plan, reason: null };
}

/** Intent shapes the planner currently understands, for the empty Run screen. */
export function listSupportedIntents(): Array<{ id: string; example: string }> {
  return [
    { id: 'deploy-release', example: 'Deploy the latest verified version to production' },
    { id: 'deploy-preview', example: 'Deploy a preview of this branch' },
    { id: 'open-pull-request', example: 'Push this branch and open a pull request' },
    { id: 'apply-migration', example: 'Apply the pending database migration' },
  ];
}
