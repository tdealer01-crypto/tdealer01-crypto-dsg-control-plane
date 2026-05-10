import { createHash } from 'node:crypto';
import type { ArtifactTimelineEvent } from './artifact-timeline-contract';

export type TimelineQualityResult = {
  ok: boolean;
  status: 'PASS' | 'BLOCKED';
  blockedReasons: string[];
  proofHash: string;
  nextAction: string;
};

function hash(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export function evaluateTimelineQualityGate(input: { events: ArtifactTimelineEvent[]; requiredKinds: string[] }): TimelineQualityResult {
  const blockedReasons: string[] = [];
  const seenIds = new Set<string>();
  const kinds = new Set(input.events.map((event) => event.kind));

  if (!input.events.length) blockedReasons.push('TIMELINE_EVENTS_EMPTY');
  for (const kind of input.requiredKinds) {
    if (!kinds.has(kind as ArtifactTimelineEvent['kind'])) blockedReasons.push(`TIMELINE_EVENT_KIND_MISSING:${kind}`);
  }
  for (const event of input.events) {
    if (!event.id) blockedReasons.push(`EVENT_ID_EMPTY:${event.kind}`);
    if (seenIds.has(event.id)) blockedReasons.push(`EVENT_ID_DUPLICATE:${event.id}`);
    seenIds.add(event.id);
    if (!event.title) blockedReasons.push(`EVENT_TITLE_EMPTY:${event.id || event.kind}`);
    if (!event.proofHash) blockedReasons.push(`EVENT_PROOF_HASH_EMPTY:${event.id || event.kind}`);
    if (!event.artifactRefs.length) blockedReasons.push(`EVENT_ARTIFACT_REFS_EMPTY:${event.id || event.kind}`);
  }

  const ok = blockedReasons.length === 0;
  return {
    ok,
    status: ok ? 'PASS' : 'BLOCKED',
    blockedReasons,
    proofHash: hash({ input, blockedReasons, ok }),
    nextAction: ok
      ? 'Timeline data is usable as a proof ledger.'
      : 'Fix missing/duplicate timeline events before using timeline as evidence.',
  };
}
