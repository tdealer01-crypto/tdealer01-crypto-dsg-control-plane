import { seedData } from '@/lib/dsg/seed/seed-engine';
import { runZ3AgentGate } from '@/lib/dsg/logic/z3-agent-gate';
import { sha256Json } from '@/lib/dsg/runtime/hash';

export interface BrowserResearchInput {
  jobId: string;
  workspaceId: string;
  researchQuery: string;
  targetUrl?: string;
}

export interface BrowserResearchResult {
  ok: boolean;
  jobId: string;
  researchQuery: string;
  content: unknown;
  evidenceHash: string;
  z3ProofHash: string;
  blockedReasons: string[];
}

// Z3 invariant: uses_browser_result requires browser_evidence_hash_set.
// Every result carries a SHA256 hash stored as evidence — no hash = BLOCK.
export async function runBrowserResearch(input: BrowserResearchInput): Promise<BrowserResearchResult> {
  const seedResult = await seedData({
    dataType: 'browser_content',
    query: input.researchQuery,
    requiredEvidence: true,
    context: input.targetUrl ? JSON.stringify({ url: input.targetUrl }) : undefined,
  });

  const browserEvidenceHashSet = seedResult.ok && seedResult.evidenceHash !== 'sha256:none';

  const z3Result = await runZ3AgentGate({
    agentType: 'browser-research',
    jobId: input.jobId,
    workspaceId: input.workspaceId,
    goalLocked: true,
    gateAllow: browserEvidenceHashSet,
    evidenceExists: seedResult.ok,
    mockState: false,
    usesBrowserResult: seedResult.ok,
    browserEvidenceHashSet,
  });

  const evidenceHash = seedResult.ok
    ? sha256Json({ jobId: input.jobId, query: input.researchQuery, data: seedResult.data })
    : 'sha256:none';

  return {
    ok: z3Result.pass && seedResult.ok,
    jobId: input.jobId,
    researchQuery: input.researchQuery,
    content: seedResult.data,
    evidenceHash,
    z3ProofHash: z3Result.z3ProofHash,
    blockedReasons: z3Result.violations.map((v) => v.code),
  };
}
