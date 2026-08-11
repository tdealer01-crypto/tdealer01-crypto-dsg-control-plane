import { createHash } from 'node:crypto';

export type VerifiedActionToolResult =
  | { ok: true; result: unknown }
  | { ok: false; code: number; message: string };

type JsonRecord = Record<string, unknown>;
type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
type CompilationVerdict = 'PASS' | 'BLOCK' | 'REVIEW' | 'UNSUPPORTED';

type Binding = {
  arg: string;
  solutionKey: string;
};

type ActionTemplate = {
  id: string;
  action: string;
  executorTool: string;
  risk: RiskLevel;
  when: { solutionKey: string; equals: unknown };
  constants: JsonRecord;
  bindings: Binding[];
  runtimeBindings: Record<string, string>;
  dependsOnTemplates: string[];
  preconditions: string[];
  effects: string[];
  postconditions: Array<{ fact: string; equals: unknown | { fromSolution: string } }>;
  rollback: string | null;
};

export type ActionIrStep = {
  id: string;
  templateId: string;
  action: string;
  executorTool: string;
  risk: RiskLevel;
  args: JsonRecord;
  runtimeBindings: Record<string, string>;
  dependsOn: string[];
  preconditions: string[];
  effects: string[];
  postconditions: Array<{ fact: string; equals: unknown }>;
  rollback: string | null;
};

export type ActionPlan = {
  schemaVersion: 'dsg-action-ir/1.0';
  profile: 'software.deploy.v1';
  planId: string;
  solutionHash: string;
  upstreamProofHash: string;
  registryVersion: string;
  mappingHash: string;
  steps: ActionIrStep[];
  actionPlanHash: string;
};

const REGISTRY_VERSION = 'verified-action-registry/1.0';

const ACTION_REGISTRY: readonly ActionTemplate[] = [
  {
    id: 'supabase.deploy.migrations',
    action: 'supabase.deploy',
    executorTool: 'dsg.deploy.execute',
    risk: 'high',
    when: { solutionKey: 'database', equals: 'supabase' },
    constants: { target: 'supabase', supabaseMode: 'migrations' },
    bindings: [
      { arg: 'environment', solutionKey: 'environment' },
      { arg: 'ref', solutionKey: 'commitSha' },
    ],
    runtimeBindings: { approved: 'approval.exact_plan' },
    dependsOnTemplates: [],
    preconditions: [
      'approval.exact_plan == true',
      'credentials.github.available == true',
      'provider.supabase.ready == true',
    ],
    effects: ['database.migrations.dispatched'],
    postconditions: [
      { fact: 'database.migration.status', equals: 'PASS' },
      { fact: 'database.ref', equals: { fromSolution: 'commitSha' } },
    ],
    rollback: null,
  },
  {
    id: 'render.deploy.service',
    action: 'render.deploy',
    executorTool: 'dsg.deploy.execute',
    risk: 'high',
    when: { solutionKey: 'runtime', equals: 'render' },
    constants: { target: 'render' },
    bindings: [
      { arg: 'environment', solutionKey: 'environment' },
      { arg: 'ref', solutionKey: 'commitSha' },
    ],
    runtimeBindings: { approved: 'approval.exact_plan' },
    dependsOnTemplates: ['supabase.deploy.migrations'],
    preconditions: [
      'approval.exact_plan == true',
      'credentials.github.available == true',
      'provider.render.ready == true',
    ],
    effects: ['runtime.deployment.dispatched'],
    postconditions: [
      { fact: 'deployment.status', equals: 'LIVE' },
      { fact: 'deployment.ref', equals: { fromSolution: 'commitSha' } },
      { fact: 'health.status', equals: 'PASS' },
    ],
    rollback: 'render.rollback',
  },
  {
    id: 'netlify.deploy.site',
    action: 'netlify.deploy',
    executorTool: 'dsg.deploy.execute',
    risk: 'high',
    when: { solutionKey: 'runtime', equals: 'netlify' },
    constants: { target: 'netlify' },
    bindings: [
      { arg: 'environment', solutionKey: 'environment' },
      { arg: 'ref', solutionKey: 'commitSha' },
    ],
    runtimeBindings: { approved: 'approval.exact_plan' },
    dependsOnTemplates: ['supabase.deploy.migrations'],
    preconditions: [
      'approval.exact_plan == true',
      'credentials.github.available == true',
      'provider.netlify.ready == true',
    ],
    effects: ['runtime.deployment.dispatched'],
    postconditions: [
      { fact: 'deployment.status', equals: 'LIVE' },
      { fact: 'deployment.ref', equals: { fromSolution: 'commitSha' } },
      { fact: 'health.status', equals: 'PASS' },
    ],
    rollback: 'netlify.rollback',
  },
];

const PROFILE_ALLOWED_KEYS = new Set([
  'database',
  'runtime',
  'environment',
  'commitSha',
]);

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    const record = value as JsonRecord;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, canonicalize(record[key])]),
    );
  }
  return value;
}

function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function hash(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function readRecord(value: unknown): JsonRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function resolveExpected(value: unknown | { fromSolution: string }, solution: JsonRecord): unknown {
  const record = readRecord(value);
  if (record && typeof record.fromSolution === 'string') {
    return solution[record.fromSolution];
  }
  return value;
}

function registryPublicView() {
  return ACTION_REGISTRY.map((entry) => ({
    id: entry.id,
    action: entry.action,
    executorTool: entry.executorTool,
    risk: entry.risk,
    selector: entry.when,
    constants: entry.constants,
    bindings: entry.bindings,
    runtimeBindings: entry.runtimeBindings,
    dependsOnTemplates: entry.dependsOnTemplates,
    preconditions: entry.preconditions,
    effects: entry.effects,
    postconditions: entry.postconditions,
    rollback: entry.rollback,
  }));
}

function compileActionPlan(args: JsonRecord): VerifiedActionToolResult {
  const solution = readRecord(args.solution);
  const proof = readRecord(args.proof);
  const profile = String(args.profile ?? 'software.deploy.v1');

  if (profile !== 'software.deploy.v1') {
    return { ok: false, code: -32602, message: 'Only profile software.deploy.v1 is registered.' };
  }
  if (!solution) {
    return { ok: false, code: -32602, message: 'solution must be an object.' };
  }
  if (!proof) {
    return { ok: false, code: -32602, message: 'proof must be an object.' };
  }

  const upstreamVerdict = String(proof.verdict ?? '');
  const upstreamProofHash = String(proof.proofHash ?? '').trim();
  if (!['VERIFIED_GLOBAL_OPTIMUM', 'VERIFIED', 'PASS'].includes(upstreamVerdict) || !upstreamProofHash) {
    return {
      ok: true,
      result: {
        verdict: 'BLOCK' satisfies CompilationVerdict,
        executionAllowed: false,
        reason: 'A verified upstream solution verdict and proofHash are required before action compilation.',
      },
    };
  }

  const solutionHash = hash({ solution, upstreamProofHash });
  const unsupportedSolutionKeys = Object.keys(solution)
    .filter((key) => !PROFILE_ALLOWED_KEYS.has(key))
    .sort();

  if (unsupportedSolutionKeys.length > 0) {
    return {
      ok: true,
      result: {
        verdict: 'UNSUPPORTED' satisfies CompilationVerdict,
        executionAllowed: false,
        solutionHash,
        unsupportedSolutionKeys,
        reason:
          'The verified solution contains parameters that the current Action Registry cannot preserve. DSG refuses to drop, reinterpret, or invent mappings for them.',
        registryVersion: REGISTRY_VERSION,
      },
    };
  }

  const selected = ACTION_REGISTRY.filter(
    (entry) => solution[entry.when.solutionKey] === entry.when.equals,
  );
  if (selected.length === 0) {
    return {
      ok: true,
      result: {
        verdict: 'UNSUPPORTED' satisfies CompilationVerdict,
        executionAllowed: false,
        solutionHash,
        reason: 'No registered action template matches this verified solution.',
        registryVersion: REGISTRY_VERSION,
      },
    };
  }

  const missingKeys = new Set<string>();
  for (const entry of selected) {
    for (const binding of entry.bindings) {
      if (solution[binding.solutionKey] === undefined) missingKeys.add(binding.solutionKey);
    }
  }
  if (missingKeys.size > 0) {
    return {
      ok: true,
      result: {
        verdict: 'BLOCK' satisfies CompilationVerdict,
        executionAllowed: false,
        solutionHash,
        missingSolutionKeys: [...missingKeys].sort(),
        reason: 'Required solution parameters are missing; compilation fails closed.',
      },
    };
  }

  const selectedIds = new Set(selected.map((entry) => entry.id));
  const stepIdByTemplate = new Map<string, string>();
  selected.forEach((entry, index) => stepIdByTemplate.set(entry.id, `S${index + 1}`));

  const steps: ActionIrStep[] = selected.map((entry) => {
    const argsFromSolution: JsonRecord = {};
    for (const binding of entry.bindings) {
      argsFromSolution[binding.arg] = solution[binding.solutionKey];
    }
    const stepId = stepIdByTemplate.get(entry.id)!;
    const idempotencyKey = `act_${hash({ solutionHash, templateId: entry.id }).slice(0, 40)}`;
    const argsForStep = { ...entry.constants, ...argsFromSolution, idempotencyKey };
    const dependsOn = entry.dependsOnTemplates
      .filter((templateId) => selectedIds.has(templateId))
      .map((templateId) => stepIdByTemplate.get(templateId)!)
      .sort();

    return {
      id: stepId,
      templateId: entry.id,
      action: entry.action,
      executorTool: entry.executorTool,
      risk: entry.risk,
      args: argsForStep,
      runtimeBindings: { ...entry.runtimeBindings },
      dependsOn,
      preconditions: [...entry.preconditions],
      effects: [...entry.effects],
      postconditions: entry.postconditions.map((condition) => ({
        fact: condition.fact,
        equals: resolveExpected(condition.equals, solution),
      })),
      rollback: entry.rollback,
    };
  });

  const mappingMaterial = selected.map((entry) => ({
    id: entry.id,
    constants: entry.constants,
    bindings: entry.bindings,
    runtimeBindings: entry.runtimeBindings,
    dependsOnTemplates: entry.dependsOnTemplates,
    preconditions: entry.preconditions,
    postconditions: entry.postconditions,
  }));
  const mappingHash = hash({ registryVersion: REGISTRY_VERSION, mappingMaterial });
  const planCore = {
    schemaVersion: 'dsg-action-ir/1.0' as const,
    profile: 'software.deploy.v1' as const,
    solutionHash,
    upstreamProofHash,
    registryVersion: REGISTRY_VERSION,
    mappingHash,
    steps,
  };
  const actionPlanHash = hash(planCore);
  const planId = `plan_${actionPlanHash.slice(0, 24)}`;
  const plan: ActionPlan = { ...planCore, planId, actionPlanHash };

  const parameterChecks = selected.flatMap((entry) =>
    entry.bindings.map((binding) => {
      const step = steps.find((candidate) => candidate.templateId === entry.id)!;
      return {
        templateId: entry.id,
        solutionKey: binding.solutionKey,
        arg: binding.arg,
        preserved: canonicalJson(step.args[binding.arg]) === canonicalJson(solution[binding.solutionKey]),
      };
    }),
  );
  const parameterPreserved = parameterChecks.every((check) => check.preserved);

  const dependencyIds = new Set(steps.map((step) => step.id));
  const dependenciesValid = steps.every((step) =>
    step.dependsOn.every((dependency) => dependencyIds.has(dependency) && dependency !== step.id),
  );

  const compilationProof = {
    parameterPreserved,
    dependenciesValid,
    parameterChecks,
    solutionHash,
    mappingHash,
    actionPlanHash,
    proofHash: hash({ solutionHash, mappingHash, actionPlanHash, parameterChecks, dependenciesValid }),
  };

  if (!parameterPreserved || !dependenciesValid) {
    return {
      ok: true,
      result: {
        verdict: 'BLOCK' satisfies CompilationVerdict,
        executionAllowed: false,
        plan,
        compilationProof,
        reason: 'Solution-to-Action equivalence verification failed.',
      },
    };
  }

  return {
    ok: true,
    result: {
      verdict: 'PASS' satisfies CompilationVerdict,
      executionAllowed: false,
      plan,
      compilationProof,
      nextGate:
        'Managed runtime must resolve live runtimeBindings and preconditions before calling executorTool. Compilation PASS is not execution permission.',
      boundary: {
        upstreamProofAuthenticity:
          'The compiler binds to the supplied upstream proofHash. Authenticity must be established by the upstream DSG/Cinema proof service or evidence store; this tool does not re-prove the optimizer result.',
        executionPerformed: false,
        productionComplete: false,
      },
    },
  };
}

function verifyAcceptance(args: JsonRecord): VerifiedActionToolResult {
  const plan = readRecord(args.plan);
  const observations = readRecord(args.observations);
  const evidence = Array.isArray(args.evidence) ? args.evidence : [];
  const chain = readRecord(args.proofChain) ?? {};

  if (!plan || !observations) {
    return { ok: false, code: -32602, message: 'plan and observations are required objects.' };
  }
  const steps = Array.isArray(plan.steps) ? (plan.steps as unknown[]) : [];
  const claimedPlanHash = String(plan.actionPlanHash ?? '');
  const planCore = {
    schemaVersion: plan.schemaVersion,
    profile: plan.profile,
    solutionHash: plan.solutionHash,
    upstreamProofHash: plan.upstreamProofHash,
    registryVersion: plan.registryVersion,
    mappingHash: plan.mappingHash,
    steps: plan.steps,
  };
  const computedPlanHash = hash(planCore);
  if (!claimedPlanHash || claimedPlanHash !== computedPlanHash) {
    return {
      ok: true,
      result: {
        verdict: 'BLOCK',
        completed: false,
        reason: 'Action plan hash mismatch. The plan was altered or is not a compiler-issued Action IR.',
        claimedPlanHash,
        computedPlanHash,
      },
    };
  }

  const evidenceRecords = evidence
    .map(readRecord)
    .filter((item): item is JsonRecord => item !== null);
  const checks: Array<{
    stepId: string;
    fact: string;
    expected: unknown;
    observed: unknown;
    valueMatches: boolean;
    verifierEvidencePresent: boolean;
  }> = [];

  for (const rawStep of steps) {
    const step = readRecord(rawStep);
    if (!step) continue;
    const postconditions = Array.isArray(step.postconditions) ? step.postconditions : [];
    for (const rawCondition of postconditions) {
      const condition = readRecord(rawCondition);
      if (!condition) continue;
      const fact = String(condition.fact ?? '');
      const expected = condition.equals;
      const observed = observations[fact];
      const matchingEvidence = evidenceRecords.some((entry) =>
        entry.fact === fact &&
        entry.observerRole === 'verifier' &&
        typeof entry.hash === 'string' &&
        entry.hash.length >= 32,
      );
      checks.push({
        stepId: String(step.id ?? ''),
        fact,
        expected,
        observed,
        valueMatches: canonicalJson(observed) === canonicalJson(expected),
        verifierEvidencePresent: matchingEvidence,
      });
    }
  }

  const acceptancePassed =
    checks.length > 0 && checks.every((check) => check.valueMatches && check.verifierEvidencePresent);
  const executionEvidenceHash = hash(evidenceRecords);
  const acceptanceHash = hash({ actionPlanHash: claimedPlanHash, checks, executionEvidenceHash });

  const requiredChainKeys = [
    'problemHash',
    'formalModelHash',
    'encodingHash',
  ];
  const upstreamComplete = requiredChainKeys.every(
    (key) => typeof chain[key] === 'string' && String(chain[key]).length >= 32,
  );
  const finalReceiptHash = acceptancePassed && upstreamComplete
    ? hash({
        problemHash: chain.problemHash,
        formalModelHash: chain.formalModelHash,
        encodingHash: chain.encodingHash,
        solutionHash: plan.solutionHash,
        actionPlanHash: claimedPlanHash,
        executionEvidenceHash,
        acceptanceHash,
      })
    : null;

  return {
    ok: true,
    result: {
      verdict: acceptancePassed ? (upstreamComplete ? 'PASS' : 'REVIEW') : 'BLOCK',
      completed: acceptancePassed && upstreamComplete,
      checks,
      executionEvidenceHash,
      acceptanceHash,
      finalReceiptHash,
      missingProofChainKeys: upstreamComplete
        ? []
        : requiredChainKeys.filter(
            (key) => typeof chain[key] !== 'string' || String(chain[key]).length < 32,
          ),
      truthBoundary:
        'Acceptance PASS requires exact postcondition matches plus evidence explicitly marked as produced by an independent verifier. This function verifies supplied evidence integrity bindings; evidence collection itself must occur outside the executor.',
    },
  };
}

export const VERIFIED_ACTION_TOOL_SCHEMAS = {
  'dsg.action.registry': {
    description:
      'Return the deterministic Action Registry used by the Verified Action Compiler. Registry entries are the only actions the compiler may emit.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  'dsg.action.compile': {
    description:
      'Compile a verified solution into typed Action IR without executing it. Unknown or unmapped solution parameters fail closed as UNSUPPORTED.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: { type: 'string', enum: ['software.deploy.v1'] },
        solution: { type: 'object', additionalProperties: true },
        proof: {
          type: 'object',
          properties: {
            verdict: { type: 'string' },
            proofHash: { type: 'string' },
          },
          required: ['verdict', 'proofHash'],
          additionalProperties: true,
        },
      },
      required: ['solution', 'proof'],
      additionalProperties: false,
    },
  },
  'dsg.action.verifyAcceptance': {
    description:
      'Verify Action IR postconditions against independently observed facts and build the final execution receipt when the complete upstream proof chain is supplied.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: { type: 'object', additionalProperties: true },
        observations: { type: 'object', additionalProperties: true },
        evidence: { type: 'array', items: { type: 'object', additionalProperties: true } },
        proofChain: {
          type: 'object',
          properties: {
            problemHash: { type: 'string' },
            formalModelHash: { type: 'string' },
            encodingHash: { type: 'string' },
          },
          additionalProperties: false,
        },
      },
      required: ['plan', 'observations', 'evidence'],
      additionalProperties: false,
    },
  },
} as const;

export type VerifiedActionToolName = keyof typeof VERIFIED_ACTION_TOOL_SCHEMAS;
export const VERIFIED_ACTION_TOOL_NAMES = Object.keys(
  VERIFIED_ACTION_TOOL_SCHEMAS,
) as VerifiedActionToolName[];

export async function callVerifiedActionTool(
  name: VerifiedActionToolName,
  args: JsonRecord,
): Promise<VerifiedActionToolResult> {
  switch (name) {
    case 'dsg.action.registry':
      return {
        ok: true,
        result: {
          registryVersion: REGISTRY_VERSION,
          profile: 'software.deploy.v1',
          actions: registryPublicView(),
          boundary:
            'Registry presence means the compiler may emit the action. It does not prove provider readiness, permission, approval, execution success, or acceptance.',
        },
      };
    case 'dsg.action.compile':
      return compileActionPlan(args);
    case 'dsg.action.verifyAcceptance':
      return verifyAcceptance(args);
    default:
      return { ok: false, code: -32601, message: `Unknown verified action tool: ${String(name)}` };
  }
}
