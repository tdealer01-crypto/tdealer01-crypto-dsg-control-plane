import { createHash } from "node:crypto";

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: "audit" | "memory" | "metric" | "policy" | "external";
  description: string;
  metadata: Record<string, unknown>;
}

export interface TimelineLink {
  from: string;
  to: string;
  timeDeltaMs: number;
  causality: number; // 0-1, confidence that 'from' caused 'to'
  type: "direct" | "temporal" | "correlated";
}

export interface Timeline {
  events: TimelineEvent[];
  links: TimelineLink[];
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

/**
 * Reconstruct incident timeline from events
 * Groups events temporally and detects causal chains
 */
export function reconstructTimeline(events: TimelineEvent[]): Timeline {
  if (events.length === 0) {
    throw new Error("No events provided");
  }

  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const startTime = sorted[0].timestamp;
  const endTime = sorted[sorted.length - 1].timestamp;
  const durationMs = endTime.getTime() - startTime.getTime();

  // Build causality links
  const links: TimelineLink[] = [];

  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i];
    const next = sorted[i + 1];
    const timeDeltaMs = next.timestamp.getTime() - current.timestamp.getTime();

    // Direct causality: event types that typically cause subsequent events
    let causality = 0;
    let type: "direct" | "temporal" | "correlated" = "temporal";

    if (current.type === "policy" && next.type === "audit") {
      causality = 0.9; // Policy evaluation likely caused audit
      type = "direct";
    } else if (current.type === "metric" && next.type === "audit") {
      causality = 0.7; // Metric anomaly might trigger audit
      type = "correlated";
    } else if (timeDeltaMs < 1000) {
      causality = 0.6; // Events <1s apart might be related
      type = "temporal";
    } else if (timeDeltaMs < 5000) {
      causality = 0.3; // Events 1-5s apart have weak temporal link
      type = "temporal";
    }

    if (causality > 0) {
      links.push({
        from: current.id,
        to: next.id,
        timeDeltaMs,
        causality,
        type,
      });
    }
  }

  return {
    events: sorted,
    links,
    startTime,
    endTime,
    durationMs,
  };
}

/**
 * Find the critical path in the event timeline
 * Returns the sequence of events most likely to have caused the incident
 */
export function findCriticalPath(timeline: Timeline): string[] {
  const { events, links } = timeline;
  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Build adjacency for forward traversal
  const forward = new Map<string, Array<{ to: string; causality: number }>>();
  for (const event of events) {
    forward.set(event.id, []);
  }

  for (const link of links) {
    const targets = forward.get(link.from) || [];
    targets.push({ to: link.to, causality: link.causality });
    forward.set(link.from, targets);
  }

  // Find highest-confidence path from first to last event
  const firstId = events[0].id;
  const path: string[] = [firstId];
  let current = firstId;

  while (current !== events[events.length - 1].id) {
    const targets = forward.get(current) || [];
    if (targets.length === 0) break;

    // Choose target with highest causality
    const best = targets.reduce((a, b) => (a.causality > b.causality ? a : b));
    path.push(best.to);
    current = best.to;
  }

  return path;
}

/**
 * Calculate confidence in causal relationship strength
 */
export function calculatePathConfidence(timeline: Timeline, path: string[]): number {
  if (path.length < 2) return 0;

  const { links } = timeline;
  let totalConfidence = 0;
  let linkCount = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const link = links.find((l) => l.from === path[i] && l.to === path[i + 1]);
    if (link) {
      totalConfidence += link.causality;
      linkCount++;
    }
  }

  return linkCount > 0 ? totalConfidence / linkCount : 0;
}

/**
 * Generate timeline hash for replay/audit purposes
 */
export function hashTimeline(timeline: Timeline): string {
  const eventHashes = timeline.events
    .map((e) => `${e.id}:${e.timestamp.getTime()}:${e.type}`)
    .join("|");

  return createHash("sha256").update(eventHashes).digest("hex");
}
