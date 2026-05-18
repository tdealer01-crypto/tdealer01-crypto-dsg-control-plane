import { hashAppBuilderObject } from '../app-builder/hash';
import type {
  BuildContextGraphInput,
  ContextGraphBuildResult,
  ContextGraphClaimGate,
  ContextGraphEdge,
  ContextGraphFactInput,
  ContextGraphGate,
  ContextGraphNode,
} from './types';

const BLOCKED_SOURCE_PATTERNS = ['.env', 'node_modules', '.git', '../'];
const SECRET_PATTERNS = ['secret', 'token', 'password', 'private_key', 'service_role'];

function slug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'node';
}

function normalizeFact(fact: ContextGraphFactInput, index: number): ContextGraphNode {
  const source = fact.source.trim();
  const summary = fact.summary.trim();
  const label = fact.label.trim();
  return {
    id: fact.id?.trim() || `${slug(fact.kind)}-${slug(label)}-${index + 1}`,
    label,
    kind: fact.kind,
    source,
    summary,
    evidenceState: fact.evidenceState ?? 'EXTRACTED',
    riskLevel: fact.riskLevel ?? 'MEDIUM',
  };
}

function fallbackFacts(goal: string): ContextGraphFactInput[] {
  return [
    {
      id: 'command-center-route',
      label: 'Command Center route',
      kind: 'route',
      source: 'app/dashboard/command-center/page.tsx',
      summary: 'Operator review surface for runtime status, evidence, blockers, approvals, and claim gates.',
      evidenceState: 'EXTRACTED',
      riskLevel: 'MEDIUM',
    },
    {
      id: 'deterministic-gate-api',
      label: 'Deterministic gate API',
      kind: 'api',
      source: 'app/api/dsg/v1/gates/evaluate/route.ts',
      summary: 'Live deterministic TypeScript static_check gate scaffold. External Z3 is not invoked by this route.',
      evidenceState: 'EXTRACTED',
      riskLevel: 'HIGH',
    },
    {
      id: 'graph-report-required',
      label: 'Graph report required',
      kind: 'evidence',
      source: 'GRAPH_REPORT.md',
      summary: 'Report must list inspected files, extracted edges, inferred edges, missing evidence, risks, and claim boundary.',
      evidenceState: 'MISSING',
      riskLevel: 'HIGH',
    },
    {
      id: 'production-flow-proof',
      label: 'Production flow proof',
      kind: 'evidence',
      source: 'production-flow-proof',
      summary: 'Required before PRODUCTION claim. Not produced by context graph builder.',
      evidenceState: 'MISSING',
      riskLevel: 'CRITICAL',
    },
    {
      id: 'operator-goal',
      label: 'Operator goal',
      kind: 'workflow',
      source: 'request.body.goal',
      summary: goal,
      evidenceState: 'EXTRACTED',
      riskLevel: 'MEDIUM',
    },
  ];
}

function fallbackEdges(): ContextGraphEdge[] {
  return [
    { from: 'operator-goal', to: 'command-center-route', relation: 'requires', evidenceState: 'INFERRED', summary: 'The command center is the operator surface for this goal.' },
    { from: 'command-center-route', to: 'deterministic-gate-api', relation: 'uses', evidenceState: 'EXTRACTED', summary: 'Command Center shows deterministic proof/gate scaffold fields.' },
    { from: 'command-center-route', to: 'graph-report-required', relation: 'requires', evidenceState: 'INFERRED', summary: 'Graph evidence must be exported before treating context as verified.' },
    { from: 'production-flow-proof', to: 'command-center-route', relation: 'blocks', evidenceState: 'EXTRACTED', summary: 'Missing production proof blocks PRODUCTION claim.' },
  ];
}

function normalizeEdges(inputEdges: BuildContextGraphInput['edges'], nodeIds: Set<string>): ContextGraphEdge[] {
  const edges = inputEdges && inputEdges.length > 0 ? inputEdges : fallbackEdges();
  return edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    relation: edge.relation,
    evidenceState: edge.evidenceState ?? (nodeIds.has(edge.from) && nodeIds.has(edge.to) ? 'EXTRACTED' : 'INFERRED'),
    summary: edge.summary ?? `${edge.from} ${edge.relation} ${edge.to}`,
  }));
}

function evaluatePrivacyGate(nodes: ContextGraphNode[]): ContextGraphGate {
  const blockedSources = nodes
    .filter((node) => BLOCKED_SOURCE_PATTERNS.some((pattern) => node.source.includes(pattern)))
    .map((node) => node.source);
  const reviewSources = nodes
    .filter((node) => node.evidenceState === 'INFERRED')
    .map((node) => node.source);

  if (blockedSources.length > 0) {
    return {
      status: 'BLOCK',
      reasons: ['Context graph references blocked source patterns such as .env, .git, node_modules, or parent traversal.'],
      blockedSources,
      reviewSources,
    };
  }

  if (reviewSources.length > 0) {
    return {
      status: 'REVIEW',
      reasons: ['Context graph contains inferred nodes or edges that need human review before runtime handoff.'],
      blockedSources,
      reviewSources,
    };
  }

  return { status: 'PASS', reasons: ['No blocked source patterns detected.'], blockedSources, reviewSources };
}

function evaluateSecretGate(nodes: ContextGraphNode[]): ContextGraphGate {
  const blockedSources = nodes
    .filter((node) => SECRET_PATTERNS.some((pattern) => `${node.label} ${node.source} ${node.summary}`.toLowerCase().includes(pattern)))
    .map((node) => node.source);

  if (blockedSources.length > 0) {
    return {
      status: 'BLOCK',
      reasons: ['Potential secret/token/service-role reference found in graph input. Remove secrets and submit redacted evidence only.'],
      blockedSources,
      reviewSources: [],
    };
  }

  return { status: 'PASS', reasons: ['No secret-pattern references detected in graph input.'], blockedSources: [], reviewSources: [] };
}

function evaluateClaimGate(nodes: ContextGraphNode[], edges: ContextGraphEdge[], privacyGate: ContextGraphGate, secretGate: ContextGraphGate): ContextGraphClaimGate {
  const missingEvidence = nodes.filter((node) => node.evidenceState === 'MISSING').map((node) => node.label);
  const reasons: string[] = [];

  if (privacyGate.status === 'BLOCK') reasons.push('Privacy gate BLOCK prevents runtime handoff.');
  if (secretGate.status === 'BLOCK') reasons.push('Secret gate BLOCK prevents runtime handoff.');
  if (missingEvidence.length > 0) reasons.push(`Missing evidence: ${missingEvidence.join(', ')}.`);
  if (edges.some((edge) => edge.evidenceState === 'INFERRED')) reasons.push('Graph contains inferred edges requiring review.');

  return {
    buildable: 'PASS',
    implemented: nodes.some((node) => node.source.includes('command-center')) ? 'PASS' : 'REVIEW',
    verified: missingEvidence.length === 0 && privacyGate.status === 'PASS' && secretGate.status === 'PASS' ? 'REVIEW' : 'BLOCK',
    deployable: 'BLOCK',
    production: 'BLOCK',
    reasons: reasons.length > 0 ? reasons : ['Graph built, but deployment and production claims still require independent evidence.'],
  };
}

function buildReport(result: Omit<ContextGraphBuildResult, 'report'>) {
  const lines = [
    '# DSG Context Graph Report',
    '',
    `Generated at: ${result.generatedAt}`,
    `Data mode: ${result.dataMode}`,
    `Graph hash: ${result.graphHash}`,
    '',
    '## Gate Summary',
    `- Privacy gate: ${result.privacyGate.status}`,
    `- Secret gate: ${result.secretGate.status}`,
    `- VERIFIED claim: ${result.claimGate.verified}`,
    `- DEPLOYABLE claim: ${result.claimGate.deployable}`,
    `- PRODUCTION claim: ${result.claimGate.production}`,
    '',
    '## Nodes',
    ...result.nodes.map((node) => `- ${node.id} [${node.evidenceState}/${node.riskLevel}] ${node.label} — ${node.source}`),
    '',
    '## Edges',
    ...result.edges.map((edge) => `- ${edge.from} --${edge.relation}/${edge.evidenceState}--> ${edge.to}`),
    '',
    '## Claim Boundary',
    '- This graph is context evidence only.',
    '- It is not production proof, certification, WORM storage, third-party audit, or external Z3 proof.',
  ];
  return lines.join('\n');
}

export function buildContextGraph(input: BuildContextGraphInput): ContextGraphBuildResult {
  const goal = input.goal?.trim();
  if (!goal) throw new Error('CONTEXT_GRAPH_MISSING_GOAL');

  const dataMode = input.mode ?? (input.facts?.length ? 'supplied_facts' : 'command_center_scaffold');
  const nodes = (input.facts?.length ? input.facts : fallbackFacts(goal)).map(normalizeFact);
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = normalizeEdges(input.edges, nodeIds);
  const privacyGate = evaluatePrivacyGate(nodes);
  const secretGate = evaluateSecretGate(nodes);
  const claimGate = evaluateClaimGate(nodes, edges, privacyGate, secretGate);
  const generatedAt = new Date().toISOString();
  const hashPayload = { dataMode, goal, nodes, edges, privacyGate, secretGate, claimGate };
  const graphHash = hashAppBuilderObject(hashPayload);

  const partial: Omit<ContextGraphBuildResult, 'report'> = {
    ok: privacyGate.status !== 'BLOCK' && secretGate.status !== 'BLOCK',
    type: 'dsg-context-graph-build',
    generatedAt,
    dataMode,
    graphHash,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodes,
    edges,
    privacyGate,
    secretGate,
    claimGate,
    boundary: {
      statement: 'DSG context graph is a repo/navigation evidence layer. It does not execute production actions and does not prove production readiness.',
      productionProof: false,
      externalZ3Invoked: false,
      wormStorageClaim: false,
      thirdPartyAuditClaim: false,
    },
  };

  return {
    ...partial,
    report: buildReport(partial),
  };
}
