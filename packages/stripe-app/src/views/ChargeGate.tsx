import React, { useState, useEffect } from 'react';

interface ChargeGateProps {
  charge: {
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
}

const ChargeGate: React.FC<ChargeGateProps> = ({ charge, stripe_account_id }) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const evaluatePolicy = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${process.env.REACT_APP_DSG_API_BASE || 'https://api.dsg.pics'}/api/stripe-app/gateway/evaluate`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'stripe.charge.create',
              operation_type: 'charge',
              context: {
                stripe_account_id,
                stripe_event_id: charge.id,
                object_type: 'charge',
                object_id: charge.id,
                amount_cents: charge.amount,
                currency: charge.currency,
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data: GatewayDecision = await response.json();
        setDecision(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Policy evaluation failed');
        // Fail-open: allow if DSG is unreachable
        setDecision({
          decision: 'ALLOW',
          reason: 'DSG unavailable - fail-open mode',
        });
      } finally {
        setLoading(false);
      }
    };

    evaluatePolicy();
  }, [charge.id, stripe_account_id]);

  if (loading) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>DSG Governance Gate</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>Evaluating policy...</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>Policy evaluation unavailable</p>
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

  const statusText = {
    ALLOW: '✓ Approved',
    BLOCK: '✗ Blocked',
    REVIEW: '⊙ Review Required',
  }[decision.decision];

  return (
    <div style={{ padding: '16px', backgroundColor: bgColor, borderRadius: '4px' }}>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: textColor }}>
        {statusText}
      </p>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: textColor }}>
        {decision.reason}
      </p>
      {decision.proof && (
        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: textColor, fontFamily: 'monospace' }}>
          Proof: {decision.proof.substring(0, 20)}...
        </p>
      )}
      {error && (
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#999' }}>
          Note: {error}
        </p>
      )}
    </div>
  );
};

export default ChargeGate;
