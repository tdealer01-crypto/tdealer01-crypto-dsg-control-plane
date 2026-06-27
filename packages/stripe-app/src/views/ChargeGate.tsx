import React, { useState, useEffect } from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { ContextView, Box, Badge, Banner, Spinner, Button } from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
  policy_version?: string;
  evaluated_at?: string;
  approval_id?: string;
}

const DSG_API_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const BADGE_TYPE = {
  ALLOW: 'positive',
  REVIEW: 'warning',
  BLOCK: 'negative',
} as const;

const BANNER_TYPE = {
  ALLOW: 'default',
  REVIEW: 'caution',
  BLOCK: 'critical',
} as const;

function SafeFallback({ description }: { description: string }) {
  return (
    <ContextView title="DSG Governance Gate">
      <Banner type="default" title="DSG Governance Gate" description={description} />
    </ContextView>
  );
}

class DrawerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[DSG Stripe App] Drawer render error:', error);
  }

  render() {
    if (this.state.hasError) {
      return <SafeFallback description="DSG panel could not read this Stripe view context. Please open a payment detail view and refresh." />;
    }

    return this.props.children;
  }
}

function ChargeGateInner({ extensionContext }: { extensionContext?: ExtensionContextValue | null }) {
  const environment = extensionContext?.environment;
  const userContext = extensionContext?.userContext;
  const chargeId = environment?.objectContext?.id ?? null;
  const accountId = userContext?.account?.id ?? null;

  const [decision, setDecision] = useState<GatewayDecision | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);

  const evaluate = async () => {
    if (!chargeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    try {
      setLoading(true);
      const res = await fetch(`${DSG_API_BASE}/api/stripe-app/gateway/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stripe_account_id: accountId,
          operation_type: 'charge',
          stripe_event_id: chargeId,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let raw: Partial<GatewayDecision> | null = null;
      try {
        raw = (await res.json()) as Partial<GatewayDecision> | null;
      } catch (parseErr) {
        throw new Error(`Failed to parse response: ${parseErr instanceof Error ? parseErr.message : 'Invalid JSON'}`);
      }
      const verdict =
        raw?.decision === 'ALLOW' || raw?.decision === 'BLOCK' || raw?.decision === 'REVIEW'
          ? raw.decision
          : 'REVIEW';

      if (!cancelled) {
        setDecision({
          decision: verdict,
          reason: typeof raw?.reason === 'string' && raw.reason.length > 0
            ? raw.reason
            : 'No reason provided — held for review',
          proof: typeof raw?.proof === 'string' ? raw.proof : undefined,
          policy_version: typeof raw?.policy_version === 'string' ? raw.policy_version : undefined,
          evaluated_at: typeof raw?.evaluated_at === 'string' ? raw.evaluated_at : undefined,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (!cancelled) {
        setFetchError(msg);
        setDecision({ decision: 'REVIEW', reason: 'DSG unavailable — held for review' });
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
  };

  useEffect(() => {
    evaluate();
  }, [chargeId, accountId]);

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
        ? action === 'approve' ? 'Charge approved.' : 'Charge rejected.'
        : 'Action failed — try again.');
    } catch {
      setApprovalStatus('Network error.');
    } finally {
      setApprovalLoading(false);
    }
  };

  if (!extensionContext) {
    return <SafeFallback description="Initializing Stripe context…" />;
  }

  if (!chargeId) {
    return <SafeFallback description="No payment context available. Open a payment detail page to evaluate governance." />;
  }

  if (loading) {
    return (
      <ContextView title="DSG Governance Gate">
        <Box css={{ alignX: 'center', padding: 'large' }}>
          <Spinner />
        </Box>
      </ContextView>
    );
  }

  const safeDecision = decision ?? { decision: 'REVIEW' as const, reason: 'No decision returned — held for review' };
  const detailRows: Array<[string, string]> = [];

  if (safeDecision.policy_version) detailRows.push(['Policy', safeDecision.policy_version]);
  if (safeDecision.proof) detailRows.push(['Proof reference', safeDecision.proof]);
  if (safeDecision.approval_id) detailRows.push(['Approval ID', safeDecision.approval_id]);
  if (safeDecision.evaluated_at) {
    const parsed = new Date(safeDecision.evaluated_at);
    detailRows.push([
      'Evaluated',
      Number.isNaN(parsed.getTime()) ? safeDecision.evaluated_at : parsed.toUTCString(),
    ]);
  }

  return (
    <ContextView title="DSG Governance Gate">
      <Box css={{ stack: 'y', gapY: 'medium' }}>
        <Badge type={BADGE_TYPE[safeDecision.decision]}>{safeDecision.decision}</Badge>
        <Banner
          type={BANNER_TYPE[safeDecision.decision]}
          title={safeDecision.decision}
          description={safeDecision.reason}
        />
        {detailRows.length > 0 && (
          <Box css={{ stack: 'y', gapY: 'small' }}>
            {detailRows.map(([label, value]) => (
              <Box key={label} css={{ stack: 'y' }}>
                <Box css={{ font: 'caption', color: 'secondary' }}>{label}</Box>
                <Box css={{ font: 'caption', wordBreak: 'break-all' }}>{value}</Box>
              </Box>
            ))}
          </Box>
        )}

        {safeDecision.decision === 'REVIEW' && safeDecision.approval_id && !approvalStatus && (
          <Box css={{ stack: 'y', gapY: 'small', marginTop: 'medium' }}>
            <Box css={{ font: 'caption', color: 'secondary' }}>Governance Action Required</Box>
            <Box css={{ stack: 'x', gapX: 'small' }}>
              <button
                onClick={() => sendApproval('approve')}
                disabled={approvalLoading}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                  backgroundColor: '#16a34a',
                  opacity: approvalLoading ? 0.6 : 1,
                }}
              >
                {approvalLoading ? '…' : 'Approve'}
              </button>
              <button
                onClick={() => sendApproval('reject')}
                disabled={approvalLoading}
                style={{
                  padding: '6px 14px', fontSize: '12px', fontWeight: 600,
                  color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer',
                  backgroundColor: '#dc2626',
                  opacity: approvalLoading ? 0.6 : 1,
                }}
              >
                {approvalLoading ? '…' : 'Reject'}
              </button>
            </Box>
          </Box>
        )}

        {approvalStatus && (
          <Banner type="default" description={approvalStatus} />
        )}

        {fetchError && <Banner type="default" description={`Note: ${fetchError}`} />}
      </Box>
    </ContextView>
  );
}

const ChargeGate = ({ extensionContext }: { extensionContext?: ExtensionContextValue | null }) => (
  <DrawerErrorBoundary>
    <ChargeGateInner extensionContext={extensionContext} />
  </DrawerErrorBoundary>
);

export default ChargeGate;
