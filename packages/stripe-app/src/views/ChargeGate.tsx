import React from 'react';
import { useRefreshDashboardData } from '@stripe/ui-extension-sdk/context';
import type { ExtensionContextValue } from '@stripe/ui-extension-sdk/context';
import { ContextView, Box, Badge, Banner, Spinner } from '@stripe/ui-extension-sdk/ui';

interface GatewayDecision {
  decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
  reason: string;
  proof?: string;
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

const ChargeGate = ({ extensionContext }: { extensionContext: ExtensionContextValue }) => {
  const refresh = useRefreshDashboardData();
  const { environment, userContext } = extensionContext;
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
        setDecision(await res.json() as GatewayDecision);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setFetchError(msg);
        setDecision({ decision: 'REVIEW', reason: 'DSG unavailable — held for review' });
      } finally {
        setLoading(false);
      }
    };
    evaluate();
  }, [chargeId, accountId]);

  if (!chargeId) {
    return (
      <ContextView title="DSG Governance Gate">
        <Banner type="default" description="No payment context available." />
      </ContextView>
    );
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

  if (!decision) return null;

  return (
    <ContextView title="DSG Governance Gate">
      <Box css={{ stack: 'y', gapY: 'medium' }}>
        <Badge type={BADGE_TYPE[decision.decision]}>
          {decision.decision}
        </Badge>
        <Banner
          type={BANNER_TYPE[decision.decision]}
          title={decision.decision}
          description={decision.reason}
        />
        {fetchError && (
          <Banner type="default" description={`Note: ${fetchError}`} />
        )}
      </Box>
    </ContextView>
  );
};

export default ChargeGate;
