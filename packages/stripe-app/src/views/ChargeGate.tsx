import React from 'react';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { ContextView, Box, Badge, Banner, Spinner } from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
  policy_version?: string;
  evaluated_at?: string;
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

  const [decision, setDecision] = React.useState<GatewayDecision | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!chargeId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

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

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = (await res.json()) as Partial<GatewayDecision> | null;
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

    evaluate();

    return () => {
      cancelled = true;
    };
  }, [chargeId, accountId]);

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
