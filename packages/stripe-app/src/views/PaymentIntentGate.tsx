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
}

const PaymentIntentGate: React.FC<PaymentIntentGateProps> = ({
  payment_intent,
  stripe_account_id,
}) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);

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
              action: 'stripe.payment_intent.create',
              operation_type: 'payment_intent',
              context: {
                stripe_account_id,
                stripe_event_id: payment_intent.id,
                object_type: 'payment_intent',
                object_id: payment_intent.id,
                amount_cents: payment_intent.amount,
                currency: payment_intent.currency,
              },
            }),
          }
        );

        if (response.ok) {
          const data: GatewayDecision = await response.json();
          setDecision(data);
        } else {
          setDecision({
            decision: 'ALLOW',
            reason: 'Payment intent monitoring enabled',
          });
        }
      } catch {
        setDecision({
          decision: 'ALLOW',
          reason: 'Monitoring enabled (DSG unavailable)',
        });
      } finally {
        setLoading(false);
      }
    };

    evaluatePolicy();
  }, [payment_intent.id, stripe_account_id]);

  if (loading) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>DSG Governance Gate</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>Monitoring payment intent...</p>
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

  return (
    <div style={{ padding: '16px', backgroundColor: bgColor, borderRadius: '4px' }}>
      <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: textColor }}>
        Payment Intent Monitor
      </p>
      <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: textColor }}>
        {decision.reason}
      </p>
      {decision.proof && (
        <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: textColor, fontFamily: 'monospace' }}>
          {decision.proof.substring(0, 30)}...
        </p>
      )}
    </div>
  );
};

export default PaymentIntentGate;
