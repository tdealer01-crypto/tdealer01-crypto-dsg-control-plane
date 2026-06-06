import React, { useState, useEffect } from 'react';

interface PayoutGateProps {
  payout: {
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

const PayoutGate: React.FC<PayoutGateProps> = ({ payout, stripe_account_id }) => {
  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

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
              action: 'stripe.payout.create',
              operation_type: 'payout',
              context: {
                stripe_account_id,
                stripe_event_id: payout.id,
                object_type: 'payout',
                object_id: payout.id,
                amount_cents: payout.amount,
                currency: payout.currency,
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
        setDecision({
          decision: 'REVIEW',
          reason: 'Payout requires approval (DSG unavailable)',
        });
      } finally {
        setLoading(false);
      }
    };

    evaluatePolicy();
  }, [payout.id, stripe_account_id]);

  const handleApprove = async () => {
    if (!decision?.approval_id) return;

    try {
      setApprovalLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_DSG_API_BASE || 'https://api.dsg.pics'}/api/stripe-app/approval/${decision.approval_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }
      );

      if (response.ok) {
        setApprovalStatus('Payout approved and execution pending...');
      } else {
        setApprovalStatus('Approval failed. Please try again.');
      }
    } catch {
      setApprovalStatus('Error submitting approval.');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleReject = async () => {
    if (!decision?.approval_id) return;

    try {
      setApprovalLoading(true);
      const response = await fetch(
        `${process.env.REACT_APP_DSG_API_BASE || 'https://api.dsg.pics'}/api/stripe-app/approval/${decision.approval_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject' }),
        }
      );

      if (response.ok) {
        setApprovalStatus('Payout rejected.');
      }
    } catch {
      setApprovalStatus('Error rejecting payout.');
    } finally {
      setApprovalLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>DSG Governance Gate</p>
        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#999' }}>Evaluating payout policy...</p>
      </div>
    );
  }

  if (!decision) {
    return (
      <div style={{ padding: '16px', backgroundColor: '#fff3cd', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#856404' }}>Payout gate unavailable</p>
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
    REVIEW: '⊙ Awaiting Approval',
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

      {decision.decision === 'REVIEW' && decision.approval_id && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
          <button
            onClick={handleApprove}
            disabled={approvalLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {approvalLoading ? 'Processing...' : 'Approve Payout'}
          </button>
          <button
            onClick={handleReject}
            disabled={approvalLoading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {approvalLoading ? 'Processing...' : 'Reject'}
          </button>
        </div>
      )}

      {approvalStatus && (
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: textColor, fontStyle: 'italic' }}>
          {approvalStatus}
        </p>
      )}
    </div>
  );
};

export default PayoutGate;
