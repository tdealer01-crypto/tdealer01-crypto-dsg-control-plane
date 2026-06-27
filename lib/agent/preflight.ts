/**
 * Agent Preflight — ProofGate before every agent action.
 *
 * Pattern: every agent request passes through agentPreflight() before any
 * tool is called, LLM is queried, or code is changed.
 *
 * Mirrors the DSG ONE philosophy: "Block before the AI agent acts."
 * Aligns with AGENTS.md truth boundary: no claim without real evidence.
 *
 * Decision lifecycle:
 *   allow  — proceed with requiredTools routing
 *   review — must supply requiredEvidence before proceeding
 *   block  — hard stop, reason returned to caller
 */

export type ActionType =
  | 'answer'
  | 'edit_code'
  | 'run_test'
  | 'deploy'
  | 'research';

export type PreflightInput = {
  userGoal: string;
  repoContext?: string[];       // file paths, error logs, test output seen so far
  requestedAction: ActionType;
  orgPlan?: string;             // for quota/plan gating
  actorRole?: string;           // for role gating on write/deploy
};

export type PreflightDecision =
  | { decision: 'allow';  requiredTools: string[]; reason: string }
  | { decision: 'review'; requiredEvidence: string[]; reason: string }
  | { decision: 'block';  reason: string };

// Tool routing policy — mirrors the repo's existing toolPolicy pattern
const TOOL_POLICY: Record<string, string[]> = {
  always:             ['dsg-proofgate', 'truth-boundary-check'],
  whenRepoWork:       ['repo-inspector', 'typecheck', 'test-runner'],
  whenScienceResearch:['science-skills', 'citation-checker'],
  whenDeploy:         ['production-readiness-gate', 'smoke-check'],
  whenResearch:       ['web-search', 'docs-reader'],
};

// Patterns that are hard-blocked regardless of role/plan
const BLOCKED_PATTERNS = [
  /delete\s+all/i,
  /drop\s+table/i,
  /truncate/i,
  /bypass\s+(policy|auth|gate|security)/i,
  /override\s+(policy|control|gate)/i,
  /rm\s+-rf/i,
  /exfiltrate/i,
  /steal/i,
  /commit.*secret/i,
  /push.*api.?key/i,
];

const REPO_ACTIONS = new Set<ActionType>(['edit_code', 'run_test', 'deploy']);
const WRITE_ROLES  = new Set(['owner', 'admin', 'finance_admin', 'agent_operator']);
const EXEC_PLANS   = new Set(['enterprise', 'business', 'pro', 'trial']);

function isBlocked(goal: string): string | null {
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(goal)) {
      return `Goal matches blocked pattern: ${pattern.source}`;
    }
  }
  return null;
}

function needsScienceSkills(goal: string): boolean {
  return /paper|science|bio|genomic|literature|citation|pubmed|arxiv|structural\s+biology|cheminformatics/i.test(goal);
}

function selectTools(input: PreflightInput): string[] {
  const tools = [...TOOL_POLICY.always];

  if (REPO_ACTIONS.has(input.requestedAction)) {
    tools.push(...TOOL_POLICY.whenRepoWork);
  }
  if (input.requestedAction === 'deploy') {
    tools.push(...TOOL_POLICY.whenDeploy);
  }
  if (input.requestedAction === 'research' || needsScienceSkills(input.userGoal)) {
    tools.push(...TOOL_POLICY.whenScienceResearch);
  }
  if (input.requestedAction === 'answer') {
    tools.push(...TOOL_POLICY.whenResearch);
  }

  // deduplicate
  return [...new Set(tools)];
}

/**
 * Run preflight checks before any agent action.
 *
 * Call this at the start of every agent turn, before reading files,
 * calling tools, editing code, or querying an LLM.
 */
export async function agentPreflight(input: PreflightInput): Promise<PreflightDecision> {

  // 1. Hard block — dangerous patterns
  const blockReason = isBlocked(input.userGoal);
  if (blockReason) {
    return { decision: 'block', reason: blockReason };
  }

  // 2. Deploy gate — must be privileged role + paid plan
  if (input.requestedAction === 'deploy') {
    if (input.actorRole && !WRITE_ROLES.has(input.actorRole)) {
      return {
        decision: 'block',
        reason: `Deploy requires a write role. Got: ${input.actorRole}`,
      };
    }
    if (input.orgPlan && !EXEC_PLANS.has(input.orgPlan)) {
      return {
        decision: 'block',
        reason: `Deploy requires a paid plan. Got: ${input.orgPlan}`,
      };
    }
  }

  // 3. Repo work without evidence — require files/logs before proceeding
  //    Aligns with AGENTS.md truth boundary: no claim without real evidence.
  if (REPO_ACTIONS.has(input.requestedAction)) {
    if (!input.repoContext || input.repoContext.length === 0) {
      return {
        decision: 'review',
        requiredEvidence: [
          'actual repo files (Read tool output)',
          'exact error logs or test output',
          'relevant file paths',
        ],
        reason:
          'Cannot safely process repo work without inspected evidence. ' +
          'Read the relevant files first, then call preflight again with repoContext.',
      };
    }
  }

  // 4. Allow — route to the right tools
  return {
    decision: 'allow',
    requiredTools: selectTools(input),
    reason: 'Preflight passed. Proceed with required tool routing.',
  };
}
