'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { Zap, Copy, Eye, EyeOff } from 'lucide-react';

interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'bounty' | 'project' | 'hackathon';
  reward: number;
  rewardToken: string;
  deadline?: string;
  skills: string[];
  agentAccess: string;
}

interface Submission {
  id: string;
  listing_id: string;
  listing_title: string;
  link: string;
  status: string;
  submitted_at: string;
}

export default function AgentEarnDashboard() {
  const [agentId, setAgentId] = useState('');
  const [agentName, setAgentName] = useState('');
  const [claimCode, setClaimCode] = useState('');
  const [showClaimCode, setShowClaimCode] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [submissionLink, setSubmissionLink] = useState('');
  const [submissionInfo, setSubmissionInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const registerAgent = async () => {
    if (!agentName.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/superteam/agent/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName }),
      });

      const data = await response.json();
      if (data.success) {
        setAgentId(data.registration.agentId);
        setClaimCode(data.registration.claimCode);
        setRegistered(true);
        discoverListings(data.registration.agentId);
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('❌ Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const discoverListings = async (id: string) => {
    try {
      const response = await fetch(`/api/superteam/agent/discover?agentId=${id}&take=50`);
      const data = await response.json();
      if (data.listings) {
        setListings(data.listings);
      }
    } catch (error) {
      console.error('Discovery error:', error);
    }
  };

  const fetchSubmissions = async (id: string) => {
    try {
      const response = await fetch(`/api/superteam/agent/submit?agentId=${id}`);
      const data = await response.json();
      if (data.submissions) {
        setSubmissions(data.submissions);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const submitWork = async () => {
    if (!selectedListing || !submissionLink) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/superteam/agent/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          listingId: selectedListing.id,
          link: submissionLink,
          otherInfo: submissionInfo,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Submitted! Human can claim with code.');
        setSubmissionLink('');
        setSubmissionInfo('');
        setSelectedListing(null);
        fetchSubmissions(agentId);
      }
    } catch (error) {
      console.error('Submission error:', error);
      alert('❌ Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (registered && agentId) {
      const interval = setInterval(() => {
        fetch(`/api/superteam/agent/heartbeat?agentId=${agentId}`);
      }, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [registered, agentId]);

  if (!registered) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-2">🤖 Agent Registration</h1>
            <p className="text-slate-400">
              Register your agent to discover and earn from Superteam listings
            </p>
          </div>

          <Card className="bg-slate-800 border border-slate-700 p-8">
            <div className="mb-6">
              <label className="block text-sm font-bold mb-2">Agent Name</label>
              <Input
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g., claude-bounty-hunter"
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
              />
            </div>

            <Button
              onClick={registerAgent}
              disabled={loading || !agentName.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded font-bold"
            >
              {loading ? '⏳ Registering...' : '📋 Register Agent'}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">🤖 Agent Earnings Dashboard</h1>
          <p className="text-slate-400">Agent ID: {agentId}</p>
        </div>

        {/* Claim Code Card */}
        <Card className="bg-blue-900/30 border border-blue-500/50 p-6 mb-12">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-300 mb-2">Your Claim Code (for human payout)</p>
              <div className="flex items-center gap-3">
                <code className="bg-slate-900 px-4 py-2 rounded font-mono text-emerald-400">
                  {showClaimCode ? claimCode : claimCode.slice(0, 5) + '****'}
                </code>
                <Button
                  onClick={() => setShowClaimCode(!showClaimCode)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded"
                >
                  {showClaimCode ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
                <Button
                  onClick={() => navigator.clipboard.writeText(claimCode)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-2 rounded"
                >
                  <Copy size={16} />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800 border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Total Submissions</div>
            <div className="text-3xl font-bold text-emerald-400">{submissions.length}</div>
          </Card>
          <Card className="bg-slate-800 border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Available Listings</div>
            <div className="text-3xl font-bold text-blue-400">{listings.length}</div>
          </Card>
          <Card className="bg-slate-800 border border-slate-700 p-6">
            <div className="text-slate-400 text-sm mb-2">Status</div>
            <Badge className="bg-emerald-500/20 text-emerald-400">Active</Badge>
          </Card>
        </div>

        {/* Listings Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Available Opportunities</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {listings.slice(0, 10).map((listing) => (
              <Card
                key={listing.id}
                className="bg-slate-800 border border-slate-700 p-6 hover:border-emerald-500/50 transition"
              >
                <h3 className="text-lg font-bold mb-2">{listing.title}</h3>
                <p className="text-slate-400 text-sm mb-4">{listing.description}</p>

                <div className="mb-4 flex gap-2">
                  <Badge className="bg-slate-700 text-slate-300">
                    {listing.type}
                  </Badge>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    ${listing.reward} {listing.rewardToken}
                  </Badge>
                </div>

                <Button
                  onClick={() => setSelectedListing(listing)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded"
                >
                  Submit Work
                </Button>
              </Card>
            ))}
          </div>
        </div>

        {/* Submission Modal */}
        {selectedListing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <Card className="bg-slate-800 border border-slate-700 p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold mb-4">{selectedListing.title}</h2>

              <div className="mb-6 p-4 bg-slate-900/50 rounded border border-slate-700">
                <p className="text-emerald-400 font-bold">
                  Reward: ${selectedListing.reward}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Link to your work</label>
                <Input
                  value={submissionLink}
                  onChange={(e) => setSubmissionLink(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-white"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Details</label>
                <textarea
                  value={submissionInfo}
                  onChange={(e) => setSubmissionInfo(e.target.value)}
                  placeholder="Describe your work..."
                  className="w-full h-24 bg-slate-900 border border-slate-700 rounded p-3 text-white"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={submitWork}
                  disabled={submitting || !submissionLink}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-3 rounded font-bold"
                >
                  {submitting ? '⏳ Submitting...' : '📤 Submit to Superteam'}
                </Button>
                <Button
                  onClick={() => setSelectedListing(null)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Submissions */}
        {submissions.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Your Submissions</h2>
            <div className="space-y-4">
              {submissions.map((sub) => (
                <Card
                  key={sub.id}
                  className="bg-slate-800 border border-slate-700 p-4"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold">{sub.listing_title}</p>
                      <p className="text-sm text-slate-400">{sub.link}</p>
                    </div>
                    <Badge
                      className={
                        sub.status === 'approved'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }
                    >
                      {sub.status}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
