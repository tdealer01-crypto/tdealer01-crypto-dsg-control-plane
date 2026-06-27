import React, { useState, useEffect } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
  approval_id?: string;
}

const DSG_API_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const PayoutGate: React.FC<{ extensionContext: ExtensionContextValue }> = ({ extensionContext }) => {
  const { environment, userContext } = extensionContext;
  const payoutId = environment?.objectContext?.id ?? null;
  const accountId = userContext?.account?.id ?? null;

  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payoutId) {
      setLoading(false);
      return;
    }

    const evaluate = async () => {
      try {
        const res = await fetch(`${DSG_API_BASE}/api/stripe-app/gate/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            object_type: 'payout',
            object_id: payoutId,
            stripe_account_id: accountId,
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        setDecision(await res.json() as GatewayDecision);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error');
        setDecision({ decision: 'REVIEW', reason: 'DSG unavailable — payout held for review' });
      } finally {
        setLoading(false);
      }
    };

    evaluate();
  }, [payoutId, accountId]);

  const sendApproval = async (action: 'approve' | 'reject') => {
    if (!decision?.approval_id) return;
    setApprovalLoading(true);
    try {
      const res = await fetch(`${DSG_API_BASE}/api/stripe-app/gate/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approval_id: decision.approval_id, action }),
      });
      setApprovalStatus(res.ok
        ? action === 'approve' ? 'Payout approved.' : 'Payout rejected.'
        : 'Action failed — try again.');
    } catch {
      setApprovalStatus('Network error.');
    } finally {
      setApprovalLoading(false);
    }
  };

  const containerStyle: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  };

  if (!payoutId || !accountId) {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          DSG Governance Gate — {!payoutId ? 'no payout context' : 'initializing…'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#374151' }}>
          DSG Governance Gate
        </p>
        <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#94a3b8' }}>
          Evaluating payout policy…
        </p>
      </div>
    );
  }

  if (!decision) return null;

  const palette = ({
    ALLOW:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#22c55e', label: '✓ ALLOW' },
    BLOCK:  { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '#ef4444', label: '✕ BLOCK' },
    REVIEW: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: '⊙ REVIEW' },
  } as Record<string, { bg: string; border: string; text: string; badge: string; label: string }>)[decision.decision]
    ?? { bg: '#f8fafc', border: '#e2e8f0', text: '#374151', badge: '#64748b', label: decision.decision };

  return (
    <div style={{ ...containerStyle, backgroundColor: palette.bg, border: `1px solid ${palette.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          DSG Governance Gate
        </p>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'white',
          backgroundColor: palette.badge, borderRadius: '4px', padding: '2px 7px',
        }}>
          {palette.label}
        </span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '13px', color: palette.text }}>
        {decision.reason}
      </p>
      {decision.proof && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: palette.text, fontFamily: 'monospace', opacity: 0.8 }}>
          proof: {decision.proof.substring(0, 24)}…
        </p>
      )}

      {decision.decision === 'REVIEW' && decision.approval_id && !approvalStatus && (
        <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
          {(['approve', 'reject'] as const).map((action) => (
            <button
              key={action}
              onClick={() => sendApproval(action)}
              disabled={approvalLoading}
              style={{
                padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                backgroundColor: action === 'approve' ? '#16a34a' : '#dc2626',
                opacity: approvalLoading ? 0.6 : 1,
              }}
            >
              {approvalLoading ? '…' : action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          ))}
        </div>
      )}

      {approvalStatus && (
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: palette.text, fontStyle: 'italic' }}>
          {approvalStatus}
        </p>
      )}
      {error && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>
          Note: {error}
        </p>
      )}
    </div>
  );
};

export default PayoutGate;
