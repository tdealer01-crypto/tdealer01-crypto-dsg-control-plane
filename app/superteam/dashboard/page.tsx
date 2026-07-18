'use client';

import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  username: string;
  claimCode: string;
  status: string;
  createdAt: string;
}

interface Submission {
  id: string;
  listing_id: string;
  link: string;
  status: string;
  ask: number;
  submitted_at: string;
}

interface Listing {
  id: string;
  title: string;
  reward: number;
  type: string;
  skills: string[];
}

export default function SuperteamDashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentName, setAgentName] = useState('');
  const [selectedAgent, setSelectedAgent] = useState('agent_1784384630740_e7ac817');
  const [refreshing, setRefreshing] = useState(false);

  const PROD_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';

  // Load initial data
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  // Reload when selected agent changes
  useEffect(() => {
    if (selectedAgent) {
      loadAgentData(selectedAgent);
    }
  }, [selectedAgent]);

  async function loadAllData() {
    try {
      // For demo, show the agent we created
      setAgents([
        {
          id: 'agent_1784384630740_e7ac817',
          username: 'revenue-agent-production',
          claimCode: 'CLAIM_C72896',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ]);

      if (selectedAgent) {
        await loadAgentData(selectedAgent);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  async function loadAgentData(agentId: string) {
    try {
      setRefreshing(true);

      // Load submissions
      const subsRes = await fetch(
        `${PROD_URL}/api/superteam/agent/submit?agentId=${agentId}`
      );
      const subsData = await subsRes.json();
      setSubmissions(subsData.submissions || []);

      // Load bounties
      const listRes = await fetch(
        `${PROD_URL}/api/superteam/agent/discover?agentId=${agentId}&take=10`
      );
      const listData = await listRes.json();
      setListings(listData.listings || []);

      setRefreshing(false);
    } catch (error) {
      console.error('Error loading agent data:', error);
      setRefreshing(false);
    }
  }

  async function registerAgent() {
    if (!agentName.trim()) return;

    try {
      const res = await fetch(`${PROD_URL}/api/superteam/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName }),
      });

      const data = await res.json();
      if (data.success) {
        setAgentName('');
        alert(
          `✅ Agent registered!\nID: ${data.registration.agentId}\nClaim Code: ${data.registration.claimCode}`
        );
        loadAllData();
      }
    } catch (error) {
      alert('❌ Error registering agent');
      console.error(error);
    }
  }

  const totalRevenue = submissions.reduce((sum, s) => sum + (s.ask || 0), 0);
  const approvedCount = submissions.filter(
    (s) => s.status === 'approved'
  ).length;
  const pendingCount = submissions.filter((s) => s.status === 'submitted')
    .length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            🤖 Superteam Agent Dashboard
          </h1>
          <p className="text-slate-400">Monitor your AI agents earning real SOL</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-emerald-500/20 rounded-lg p-6">
            <div className="text-emerald-400 text-sm font-semibold mb-2">
              Registered Agents
            </div>
            <div className="text-3xl font-bold text-white">{agents.length}</div>
          </div>
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-lg p-6">
            <div className="text-blue-400 text-sm font-semibold mb-2">
              Bounties Found
            </div>
            <div className="text-3xl font-bold text-white">{listings.length}</div>
          </div>
          <div className="bg-slate-800/50 border border-purple-500/20 rounded-lg p-6">
            <div className="text-purple-400 text-sm font-semibold mb-2">
              Submissions
            </div>
            <div className="text-3xl font-bold text-white">{submissions.length}</div>
          </div>
          <div className="bg-slate-800/50 border border-yellow-500/20 rounded-lg p-6">
            <div className="text-yellow-400 text-sm font-semibold mb-2">
              Total Revenue
            </div>
            <div className="text-3xl font-bold text-white">{totalRevenue} SOL</div>
          </div>
        </div>

        {/* Register New Agent */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Register New Agent</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Agent name..."
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && registerAgent()}
              className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
            <button
              onClick={registerAgent}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded font-semibold transition"
            >
              Register
            </button>
          </div>
        </div>

        {/* Agent Selection & Control */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">
              {agents.length > 0 ? 'Select Agent' : 'Loading Agents...'}
            </h2>
            <button
              onClick={() => loadAgentData(selectedAgent)}
              disabled={refreshing}
              className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded text-sm transition disabled:opacity-50"
            >
              {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {agents.length > 0 && (
            <div className="grid grid-cols-1 gap-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent.id)}
                  className={`p-4 rounded cursor-pointer transition border ${
                    selectedAgent === agent.id
                      ? 'bg-emerald-600/20 border-emerald-500/50'
                      : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-white">
                        {agent.username}
                      </div>
                      <div className="text-sm text-slate-400">
                        ID: {agent.id}
                      </div>
                      <div className="text-sm text-slate-400">
                        Claim: {agent.claimCode}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-400">
                        🟢 {agent.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bounties Available */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              🔍 Bounties Available ({listings.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {listings.length > 0 ? (
                listings.map((listing) => (
                  <div
                    key={listing.id}
                    className="bg-slate-700/30 border border-slate-600/30 rounded p-3"
                  >
                    <div className="font-semibold text-white mb-1">
                      {listing.title}
                    </div>
                    <div className="text-sm text-slate-400 mb-2">
                      {listing.description}
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <span className="text-xs bg-blue-600/30 text-blue-300 px-2 py-1 rounded">
                          {listing.type}
                        </span>
                      </div>
                      <div className="font-semibold text-yellow-400">
                        {listing.reward} SOL
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  ⏳ No bounties available right now
                  <div className="text-xs mt-2">
                    System checks Superteam Earn every hour
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submissions */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              ✅ Submissions ({submissions.length})
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {submissions.length > 0 ? (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-slate-700/30 border border-slate-600/30 rounded p-3"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-white">
                        {sub.listing_id}
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          sub.status === 'approved'
                            ? 'bg-emerald-600/30 text-emerald-300'
                            : sub.status === 'submitted'
                              ? 'bg-blue-600/30 text-blue-300'
                              : 'bg-slate-600/30 text-slate-300'
                        }`}
                      >
                        {sub.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mb-2">
                      {sub.link}
                    </div>
                    <div className="flex justify-between text-sm">
                      <div className="text-slate-400">
                        Reward: {sub.ask} SOL
                      </div>
                      <div className="text-slate-500">
                        {new Date(sub.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500">
                  ⏳ No submissions yet
                  <div className="text-xs mt-2">
                    Will auto-submit when bounties are found
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">📊 Revenue Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-slate-400 text-sm mb-1">Total Expected</div>
              <div className="text-3xl font-bold text-yellow-400">
                {totalRevenue} SOL
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Approved</div>
              <div className="text-3xl font-bold text-emerald-400">
                {approvedCount}
              </div>
            </div>
            <div>
              <div className="text-slate-400 text-sm mb-1">Pending</div>
              <div className="text-3xl font-bold text-blue-400">{pendingCount}</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Superteam Agent System • Live Revenue Generation • Updated every 10s</p>
          <p className="mt-2">
            Production: {PROD_URL}
          </p>
        </div>
      </div>
    </div>
  );
}
