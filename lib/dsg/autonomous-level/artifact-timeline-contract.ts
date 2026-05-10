import { createHash } from 'node:crypto';

export type ArtifactTimelineEventKind = 'goal' | 'plan' | 'sandbox' | 'repair' | 'browser' | 'preview' | 'production' | 'report';

export type ArtifactTimelineEvent = {
  id: string;
  kind: ArtifactTimelineEventKind;
  title: string;
  artifactRefs: string[];
  proofHash: string;
};

export type ArtifactTimelineProof = {
  timelineId: string;
  jobId: string;
  events: ArtifactTimelineEvent[];
};

export type ArtifactTimelineResult = {
  ok: boolean;
  status: 'PASS' | 'PROOF_REQUIRED' | 'BLOCKED';
  missing: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const requiredKinds: ArtifactTimelineEventKind[] = ['goal', 'plan', 'sandbox', 'preview', 'production', 'report'];

export function evaluateArtifactTimelineProof(proof?: Partial<ArtifactTimelineProof>): ArtifactTimelineResult {
  const missing: string[] = [];
  if (!proof?.timelineId) missing.push('timelineId');
  if (!proof?.jobId) missing.push('jobId');
  if (!proof?.events?.length) missing.push('events');

  const kinds = new Set((proof?.events ?? []).map((event) => event.kind));
  for (const kind of requiredKinds) {
    if (!kinds.has(kind)) missing.push(`event_${kind}`);
  }
  for (const event of proof?.events ?? []) {
    if (!event.id) missing.push(`${event.kind}_id`);
    if (!event.title) missing.push(`${event.kind}_title`);
    if (!event.proofHash) missing.push(`${event.kind}_proofHash`);
  }

  const ok = missing.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'PROOF_REQUIRED',
    missing,
    proofHash: hash({ proof, missing, ok }),
    nextAction: ok ? 'Use this timeline as the user-visible proof ledger.' : 'Attach all required proof events to one ordered timeline.',
  };
}
