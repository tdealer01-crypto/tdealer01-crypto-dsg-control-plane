'use client';

import { useState, useEffect } from 'react';

export default function SuperteamDashboard() {
  const [stats, setStats] = useState({ agents: 0, bounties: 0, submissions: 0, revenue: 0 });
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [bounties, setBounties] = useState<any[]>([]);
  const [apiUrl, setApiUrl] = useState('');

  const AGENT_ID = 'agent_1784384630740_e7ac817';

  useEffect(() => {
    // Use current origin for API calls (works in both dev and production)
    if (typeof window !== 'undefined') {
      setApiUrl(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!apiUrl) return;

    const loadData = async () => {
      try {
        // Load submissions
        const subRes = await fetch(`${apiUrl}/api/superteam/agent/submit?agentId=${AGENT_ID}`);
        const subData = await subRes.json();
        const subs = subData.submissions || [];
        setSubmissions(subs);

        // Load bounties
        const bounRes = await fetch(`${apiUrl}/api/superteam/agent/discover?agentId=${AGENT_ID}&take=20`);
        const bounData = await bounRes.json();
        const boun = bounData.listings || [];
        setBounties(boun);

        // Update stats
        const totalRevenue = subs.reduce((sum: number, s: any) => sum + (s.ask || 0), 0);
        setStats({
          agents: 1,
          bounties: boun.length,
          submissions: subs.length,
          revenue: totalRevenue,
        });
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, -apple-system, sans-serif', background: '#0f172a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        🤖 Superteam Agent Dashboard
      </h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Registered Agents</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.agents}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Bounties Found</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.bounties}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Submissions</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.submissions}</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Total Revenue</div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.revenue} SOL</div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Bounties */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: 0 }}>🔍 Bounties Available ({bounties.length})</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {bounties.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {bounties.map((b: any, i: number) => (
                  <div key={i} style={{ background: '#0f172a', border: '1px solid #334155', padding: '1rem', borderRadius: '0.375rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{b.title}</div>
                    <div style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '0.5rem' }}>{b.type}</div>
                    <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{b.reward} SOL</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                ⏳ No bounties available
              </div>
            )}
          </div>
        </div>

        {/* Submissions */}
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: 0 }}>✅ Submissions ({submissions.length})</h2>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {submissions.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {submissions.map((s: any, i: number) => (
                  <div key={i} style={{ background: '#0f172a', border: '1px solid #334155', padding: '1rem', borderRadius: '0.375rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                      {s.listing_id}
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: s.status === 'approved' ? '#10b981' : '#3b82f6', borderRadius: '0.25rem' }}>
                        {s.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem' }}>{s.link}</div>
                    <div style={{ color: '#fbbf24', fontWeight: 'bold' }}>{s.ask} SOL</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                ⏳ No submissions yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Info */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem', padding: '1.5rem', marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', marginTop: 0 }}>🤖 Active Agent</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>ID</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>agent_1784384630740_e7ac817</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Username</div>
            <div>revenue-agent-production</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Claim Code</div>
            <div>CLAIM_C72896</div>
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.875rem' }}>Status</div>
            <div style={{ color: '#10b981', fontWeight: 'bold' }}>🟢 ACTIVE</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '2rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
        <p>Superteam Agent System • Live Revenue Generation</p>
        <p style={{ marginTop: '0.5rem' }}>Auto-refresh every 10 seconds</p>
      </div>
    </div>
  );
}
