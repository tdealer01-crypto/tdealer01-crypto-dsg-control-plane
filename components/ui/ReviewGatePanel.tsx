'use client';

import type { ReviewGate, ReviewGateStatus } from '../../lib/types/hermes';

type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type ReviewGateDecision = Extract<ReviewGateStatus, 'APPROVED' | 'BLOCKED' | 'DELEGATED'>;

type ReviewGatePanelProps = {
  reviewGate: ReviewGate;
  risk?: RiskLevel;
  affectedCount?: number;
  rollbackAvailable?: boolean;
  reason?: string;
  /** Called when the operator resolves the gate. Omit to render read-only. */
  onDecision?: (decision: ReviewGateDecision) => void;
};

const riskBadgeClasses: Record<RiskLevel, string> = {
  HIGH: 'border-red-400/30 bg-red-400/10 text-red-300',
  MEDIUM: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  LOW: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
};

const resolvedLabels: Record<Exclude<ReviewGateStatus, 'PENDING'>, string> = {
  APPROVED: '✅ Approved',
  BLOCKED: '❌ Blocked',
  DELEGATED: '🤔 Delegated',
};

/**
 * Gatekeeper review gate rendered under an agent message whose preflight
 * decision is REVIEW. Presents the risk summary and the operator actions
 * (Confirm / Block / Delegate). Purely presentational: persistence of the
 * decision is the caller's responsibility via onDecision.
 */
export function ReviewGatePanel({
  reviewGate,
  risk = 'HIGH',
  affectedCount,
  rollbackAvailable,
  reason,
  onDecision,
}: ReviewGatePanelProps) {
  const pending = reviewGate.status === 'PENDING';

  return (
    <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-bold text-amber-200">
          {pending ? '⏳ Pending Review' : resolvedLabels[reviewGate.status as Exclude<ReviewGateStatus, 'PENDING'>]}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${riskBadgeClasses[risk]}`}
        >
          {risk} Risk
        </span>
      </div>

      <div className="mb-4 space-y-2 text-xs text-slate-300">
        {reason && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Reason:</span>
            <span className="truncate font-semibold" title={reason}>{reason}</span>
          </div>
        )}
        {typeof affectedCount === 'number' && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Affected:</span>
            <span className="font-semibold">{affectedCount} users</span>
          </div>
        )}
        {typeof rollbackAvailable === 'boolean' && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Rollback:</span>
            <span className={`font-semibold ${rollbackAvailable ? 'text-emerald-300' : 'text-red-300'}`}>
              {rollbackAvailable ? 'Available' : 'Unavailable'}
            </span>
          </div>
        )}
        {reviewGate.expiresAt && (
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Expires:</span>
            <span className="font-semibold">
              {new Date(reviewGate.expiresAt).toLocaleTimeString('th-TH')}
            </span>
          </div>
        )}
      </div>

      {pending && onDecision && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onDecision('APPROVED')}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-400/20"
          >
            ✅ Confirm
          </button>
          <button
            type="button"
            onClick={() => onDecision('BLOCKED')}
            className="flex items-center gap-1.5 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-400/20"
          >
            ❌ Block
          </button>
          <button
            type="button"
            onClick={() => onDecision('DELEGATED')}
            className="flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-400/10 px-3 py-2 text-xs font-bold text-violet-300 transition hover:bg-violet-400/20"
          >
            🤔 Delegate
          </button>
        </div>
      )}
    </div>
  );
}
