import React, { useState, useEffect } from 'react';
import { useExtensionContext } from '@stripe/ui-extension-sdk/context';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
}

const DSG_API_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const ChargeGate: React.FC = () => {
  const { environment, userContext } = useExtensionContext();
  const chargeId = environment.objectContext?.id ?? null;
  const accountId = userContext.account.id;

  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chargeId) {
      setLoading(false);
      return;
    }

    const evaluate = async () => {
      try {
        const res = await fetch(`${DSG_API_BASE}/api/stripe-app/gate/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            object_type: 'charge',
            object_id: chargeId,
            stripe_account_id: accountId,
          }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        setDecision(await res.json() as GatewayDecision);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'error');
        setDecision({ decision: 'ALLOW', reason: 'DSG unavailable — fail-open mode' });
      } finally {
        setLoading(false);
      }
    };

    evaluate();
  }, [chargeId, accountId]);

  const containerStyle: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  };

  if (!chargeId) {
    return (
      <div style={containerStyle}>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
          DSG Governance Gate — no charge context
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
          Evaluating policy…
        </p>
      </div>
    );
  }

  if (!decision) return null;

  const palette = {
    ALLOW:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#22c55e', label: '✓ ALLOW' },
    BLOCK:  { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '#ef4444', label: '✕ BLOCK' },
    REVIEW: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: '⊙ REVIEW' },
  }[decision.decision];

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
      {error && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#94a3b8' }}>
          Note: {error}
        </p>
      )}
    </div>
  );
};

export default ChargeGate;
