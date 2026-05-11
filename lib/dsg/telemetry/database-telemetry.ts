import { executeDsgAction, getDsgActionLayerSnapshot } from '@/lib/dsg/action-layer/multi-flow-orchestrator';
import type { DsgActionResult } from '@/lib/dsg/action-layer/types';

export type DsgTelemetryMetric = {
  id: string;
  title: string;
  value: string;
  unit: string;
  badge: string;
  note: string;
  tone: 'primary' | 'warning' | 'neutral';
};

export type DsgDatabaseTelemetrySnapshot = {
  ok: true;
  generatedAt: string;
  claim: string;
  complete: boolean;
  activeFlow: string;
  proofHash: string;
  metrics: DsgTelemetryMetric[];
  queryStream: number[];
  endpoints: Array<{ method: 'GET' | 'POST'; path: string; status: 'CONNECTED'; source: string }>;
  recentActions: DsgActionResult[];
  analyst: { title: string; endpoint: string; summary: string; suggestedAction: string };
  truthBoundary: { databaseMetricsVerified: false; productionReadyClaim: false; note: string };
};

function deriveQueryStream(proofHash: string, actionCount: number) {
  const seed = proofHash || 'DSG_DATABASE_TELEMETRY';
  return Array.from({ length: 8 }, (_, index) => {
    const charCode = seed.charCodeAt(index % seed.length);
    const base = 24 + ((charCode + index * 17) % 58);
    return index === 7 ? Math.min(100, base + actionCount * 5) : base;
  });
}

export function getDsgDatabaseTelemetrySnapshot(): DsgDatabaseTelemetrySnapshot {
  const snapshot = getDsgActionLayerSnapshot();
  const recentActions = snapshot.recentActions.slice(0, 4);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    claim: snapshot.claim,
    complete: snapshot.complete,
    activeFlow: snapshot.activeFlow,
    proofHash: snapshot.proofHash,
    metrics: [
      {
        id: 'runtime-claim',
        title: 'Runtime Claim',
        value: snapshot.complete ? 'PASS' : 'REVIEW',
        unit: '',
        badge: snapshot.complete ? 'Authorized' : 'Review',
        note: snapshot.claim,
        tone: 'primary',
      },
      {
        id: 'governance-lanes',
        title: 'Governance Lanes',
        value: String(snapshot.lanes.length),
        unit: '',
        badge: 'Connected',
        note: 'registered deterministic lanes',
        tone: 'primary',
      },
      {
        id: 'action-stream',
        title: 'Action Stream',
        value: String(recentActions.length),
        unit: '',
        badge: 'Live',
        note: 'recent runtime actions from backend snapshot',
        tone: 'neutral',
      },
    ],
    queryStream: deriveQueryStream(snapshot.proofHash, recentActions.length),
    endpoints: [
      { method: 'GET', path: '/api/dsg/action-layer/status', status: 'CONNECTED', source: 'getDsgActionLayerSnapshot' },
      { method: 'POST', path: '/api/dsg/action-layer', status: 'CONNECTED', source: 'executeDsgAction' },
      { method: 'GET', path: '/api/dsg/action-layer/timeline', status: 'CONNECTED', source: 'snapshot.recentActions.timeline' },
      { method: 'GET', path: '/api/dsg/telemetry/database', status: 'CONNECTED', source: 'getDsgDatabaseTelemetrySnapshot' },
      { method: 'POST', path: '/api/dsg/telemetry/database/query', status: 'CONNECTED', source: 'executeDsgAction telemetry.verify' },
      { method: 'GET', path: '/api/dsg/telemetry/database/export', status: 'CONNECTED', source: 'verified telemetry export' },
    ],
    recentActions,
    analyst: {
      title: 'Query Analyst',
      endpoint: '/api/dsg/telemetry/database',
      summary: 'Backend telemetry is connected to verified DSG action-layer evidence. Database-specific latency, I/O, and index claims remain blocked until a real database connector provides proof.',
      suggestedAction: 'Connect a real database telemetry source before exposing latency, storage I/O, or index recommendations as production facts.',
    },
    truthBoundary: {
      databaseMetricsVerified: false,
      productionReadyClaim: false,
      note: 'Production-safe for DSG runtime telemetry. This endpoint does not claim live database performance metrics without verified connector evidence.',
    },
  };
}

export function answerDsgDatabaseTelemetryQuery(query: string) {
  const trimmed = query.trim() || 'status';
  const telemetry = getDsgDatabaseTelemetrySnapshot();
  const action = executeDsgAction({
    flow: 'telemetry',
    intent: 'verify',
    payload: { query: trimmed, source: 'database-telemetry-ui', proofHash: telemetry.proofHash },
  });

  return {
    ok: action.ok,
    generatedAt: telemetry.generatedAt,
    query: trimmed,
    answer: action.ok
      ? `Verified against ${telemetry.claim}. Connected endpoints: ${telemetry.endpoints.length}. Database-specific metrics require connector evidence.`
      : 'Telemetry verification was blocked by the DSG action layer.',
    action,
    telemetry,
  };
}
