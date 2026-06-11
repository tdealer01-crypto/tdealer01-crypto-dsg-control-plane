import React from 'react';
import { useRefreshDashboardData } from '@stripe/ui-extension-sdk/context';
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
        const raw = (await res.json()) as Partial<GatewayDecision> | null;
        // Unknown/missing verdicts fall back to REVIEW so the badge/banner
        // lookups never receive an unmapped key and crash the view.
        const verdict =
          raw?.decision === 'ALLOW' || raw?.decision === 'BLOCK' || raw?.decision === 'REVIEW'
            ? raw.decision
            : 'REVIEW';
        setDecision({
          decision: verdict,
          reason: typeof raw?.reason === 'string' && raw.reason.length > 0
            ? raw.reason
            : 'No reason provided — held for review',
          proof: typeof raw?.proof === 'string' ? raw.proof : undefined,
          policy_version: typeof raw?.policy_version === 'string' ? raw.policy_version : undefined,
          evaluated_at: typeof raw?.evaluated_at === 'string' ? raw.evaluated_at : undefined,
        });
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

  const detailRows: Array<[string, string]> = [];
  if (decision.policy_version) detailRows.push(['Policy', decision.policy_version]);
  if (decision.proof) detailRows.push(['Proof reference', decision.proof]);
  if (decision.evaluated_at) {
    const parsed = new Date(decision.evaluated_at);
    detailRows.push([
      'Evaluated',
      Number.isNaN(parsed.getTime()) ? decision.evaluated_at : parsed.toUTCString(),
    ]);
  }

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
        {fetchError && (
          <Banner type="default" description={`Note: ${fetchError}`} />
        )}
      </Box>
    </ContextView>
  );
};

export default ChargeGate;
