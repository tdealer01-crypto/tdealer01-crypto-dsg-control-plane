import React, { useState, useEffect } from 'react';

interface PaymentIntentGateProps {
  payment_intent: {
    id: string;
    amount: number;
    currency: string;
    status: string;
  };
  stripe_account_id: string;
}

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
  approval_id?: string;
}

const PaymentIntentGate: React.FC<PaymentIntentGateProps> = ({
  payment_intent,
  stripe_account_id,
}) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const DSG_API_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

  useEffect(() => {
    const evaluatePolicy = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${DSG_API_BASE}/api/stripe-app/gateway/evaluate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              stripe_account_id,
              operation_type: 'payment_intent',
              amount_cents: payment_intent.amount,
              currency: payment_intent.currency,
              stripe_event_id: payment_intent.id,
            }),
          }
        );

        if (response.ok) {
          const data: GatewayDecision = await response.json();
          setDecision(data);
        } else {
          setDecision({
            decision: 'REVIEW',
            reason: 'Payment intent requires governance review',
          });
        }
      } catch {
        setDecision({
          decision: 'REVIEW',
          reason: 'Monitoring enabled (DSG unavailable)',
        });
      } finally {
        setLoading(false);
      }
    };

    evaluatePolicy();
  }, [payment_intent.id, payment_intent.amount, payment_intent.currency, stripe_account_id]);

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
        ? action === 'approve' ? 'Payment intent approved.' : 'Payment intent rejected.'
        : 'Action failed — try again.');
    } catch {
      setApprovalStatus('Network error.');
    } finally {
      setApprovalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>DSG Governance Gate</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>Evaluating payment intent…</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#e2e3e5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#383d41' }}>Payment intent gate unavailable</p>
      </div>
    );
  }

  const bgColor = {
    ALLOW: '#d4edda',
    BLOCK: '#f8d7da',
    REVIEW: '#fff3cd',
  }[decision.decision];

  const textColor = {
    ALLOW: '#155724',
    BLOCK: '#721c24',
    REVIEW: '#856404',
  }[decision.decision];

  const badgeColor = {
    ALLOW: '#28a745',
    BLOCK: '#dc3545',
    REVIEW: '#ffc107',
  }[decision.decision];

  return (
    <div style={{ padding: '16px', backgroundColor: bgColor, borderRadius: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: textColor }}>
          Payment Intent Gate
        </p>
        <span style={{
          fontSize: '11px', fontWeight: 700, color: 'white',
          backgroundColor: badgeColor, borderRadius: '4px', padding: '2px 7px',
        }}>
          {decision.decision}
        </span>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: '12px', color: textColor }}>
        {decision.reason}
      </p>
      {decision.proof && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: textColor, fontFamily: 'monospace' }}>
          proof: {decision.proof.substring(0, 24)}…
        </p>
      )}
      {decision.approval_id && (
        <p style={{ margin: '6px 0 0', fontSize: '11px', color: textColor, fontFamily: 'monospace' }}>
          approval_id: {decision.approval_id.substring(0, 24)}…
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
        <p style={{ margin: '8px 0 0', fontSize: '12px', color: textColor, fontStyle: 'italic' }}>
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

export default PaymentIntentGate;
