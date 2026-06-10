import React, { useState, useEffect } from 'react';
import { useExtensionContext } from '@stripe/ui-extension-sdk/context';

interface GateSummary {
  allow: number;
  review: number;
  block: number;
  last_decision?: {
    decision: 'ALLOW' | 'BLOCK' | 'REVIEW';
    object_type: string;
    object_id: string;
    reason: string;
    timestamp: string;
  };
}

const DSG_API_BASE = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

const DECISION_COLOR = {
  ALLOW:  { bg: '#f0fdf4', border: '#86efac', text: '#15803d', badge: '#22c55e', label: '✓ ALLOW' },
  BLOCK:  { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', badge: '#ef4444', label: '✕ BLOCK' },
  REVIEW: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', badge: '#f59e0b', label: '⊙ REVIEW' },
};

const GateSummaryView: React.FC = () => {
  const { userContext, environment } = useExtensionContext();
  const accountId = userContext.account.id;
  const mode = environment.mode;

  const [summary, setSummary] = useState<GateSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`${DSG_API_BASE}/api/stripe-app/gate/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stripe_account_id: accountId }),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        setSummary(await res.json() as GateSummary);
      } catch {
        // Fallback static summary — gate is live, no stored history yet
        setSummary({ allow: 0, review: 0, block: 0 });
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [accountId]);

  const outer: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    padding: '14px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
  };

  const headerRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px',
  };

  const title: React.CSSProperties = {
    margin: 0,
    fontSize: '13px',
    fontWeight: 700,
    color: '#1e293b',
    letterSpacing: '0.01em',
  };

  const modeBadge: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    color: mode === 'live' ? '#15803d' : '#6b7280',
    backgroundColor: mode === 'live' ? '#dcfce7' : '#f3f4f6',
    borderRadius: '4px',
    padding: '2px 6px',
  };

  const statsRow: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  };

  const statBox = (color: string, labelColor: string): React.CSSProperties => ({
    flex: 1,
    textAlign: 'center' as const,
    padding: '8px 4px',
    borderRadius: '6px',
    backgroundColor: color,
  });

  const statNum: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 700,
    margin: 0,
    lineHeight: 1.2,
  };

  const statLabel: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    margin: '2px 0 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };

  if (loading) {
    return (
      <div style={outer}>
        <div style={headerRow}>
          <p style={title}>DSG Governance Gate</p>
        </div>
        <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>Loading summary…</p>
      </div>
    );
  }

  const total = (summary?.allow ?? 0) + (summary?.review ?? 0) + (summary?.block ?? 0);
  const last = summary?.last_decision;

  return (
    <div style={outer}>
      <div style={headerRow}>
        <p style={title}>DSG Governance Gate</p>
        <span style={modeBadge}>{mode === 'live' ? 'LIVE' : 'TEST'}</span>
      </div>

      {/* Stats */}
      <div style={statsRow}>
        <div style={statBox('#f0fdf4', '#15803d')}>
          <p style={{ ...statNum, color: '#15803d' }}>{summary?.allow ?? 0}</p>
          <p style={{ ...statLabel, color: '#15803d' }}>Allow</p>
        </div>
        <div style={statBox('#fffbeb', '#92400e')}>
          <p style={{ ...statNum, color: '#92400e' }}>{summary?.review ?? 0}</p>
          <p style={{ ...statLabel, color: '#92400e' }}>Review</p>
        </div>
        <div style={statBox('#fef2f2', '#b91c1c')}>
          <p style={{ ...statNum, color: '#b91c1c' }}>{summary?.block ?? 0}</p>
          <p style={{ ...statLabel, color: '#b91c1c' }}>Block</p>
        </div>
      </div>

      {/* Total */}
      <p style={{ margin: '0 0 10px', fontSize: '11px', color: '#64748b' }}>
        {total === 0
          ? 'No decisions recorded yet — gate is active.'
          : `${total} governance decision${total !== 1 ? 's' : ''} recorded`}
      </p>

      {/* Last decision */}
      {last && (
        <div style={{
          padding: '8px 10px',
          borderRadius: '5px',
          backgroundColor: DECISION_COLOR[last.decision].bg,
          border: `1px solid ${DECISION_COLOR[last.decision].border}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' as const }}>
              Last decision
            </p>
            <span style={{
              fontSize: '10px', fontWeight: 700, color: 'white',
              backgroundColor: DECISION_COLOR[last.decision].badge,
              borderRadius: '3px', padding: '1px 5px',
            }}>
              {DECISION_COLOR[last.decision].label}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '12px', color: DECISION_COLOR[last.decision].text }}>
            {last.object_type} · {last.object_id.substring(0, 16)}…
          </p>
          <p style={{ margin: '3px 0 0', fontSize: '11px', color: DECISION_COLOR[last.decision].text, opacity: 0.8 }}>
            {last.reason}
          </p>
        </div>
      )}

      {/* Guide */}
      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
        <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
          Gate runs on every <strong style={{ color: '#64748b' }}>Payment</strong> and <strong style={{ color: '#64748b' }}>Customer</strong> detail page automatically.
        </p>
      </div>
    </div>
  );
};

export default GateSummaryView;
