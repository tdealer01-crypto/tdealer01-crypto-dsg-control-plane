'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Input } from '@/components/ui';
import { Zap, DollarSign, TrendingUp, CheckCircle, Clock } from 'lucide-react';

interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardToken: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  status: string;
  skills: string[];
  deadline?: string;
}

interface Submission {
  id: string;
  bountyId: string;
  content: string;
  status: string;
  dsgGateStatus: string;
  paymentStatus: string;
}

export default function EarnDashboard() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchBounties();
    fetchSubmissions();
  }, []);

  const fetchBounties = async () => {
    try {
      const response = await fetch('/api/superteam/bounties');
      const data = await response.json();
      if (data.bounties) {
        setBounties(data.bounties);
      }
    } catch (error) {
      console.error('Error fetching bounties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch('/api/superteam/submissions');
      const data = await response.json();
      if (data.submissions) {
        setSubmissions(data.submissions);
        // Calculate earnings from paid submissions
        const paid = data.submissions.filter((s: any) => s.payment_status === 'paid');
        setTotalEarnings(paid.reduce((sum: number, s: any) => sum + (s.reward || 0), 0));
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBounty || !submissionContent.trim()) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/superteam/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bountyId: selectedBounty.id,
          content: submissionContent,
          userId: 'current-user-id', // TODO: Get from auth context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Submission sent! Trinity agents are reviewing...');
        setSubmissionContent('');
        setSelectedBounty(null);
        fetchSubmissions();
      }
    } catch (error) {
      console.error('Error submitting:', error);
      alert('❌ Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBounties = bounties.filter(
    (b) => filterLevel === 'all' || b.level === filterLevel
  );

  const getLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      beginner: 'bg-green-500/20 text-green-400',
      intermediate: 'bg-amber-500/20 text-amber-400',
      advanced: 'bg-red-500/20 text-red-400',
    };
    return colors[level] || 'bg-slate-500/20 text-slate-400';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            💰 Earn with DSG
          </h1>
          <p className="text-slate-400">
            Complete Superteam bounties, earn crypto via Trinity governance gates
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          <Card className="bg-slate-800 border border-emerald-500/20 p-6">
            <div className="text-slate-400 text-sm mb-2">Total Earned</div>
            <div className="text-3xl font-bold text-emerald-400">
              ${totalEarnings.toFixed(2)}
            </div>
          </Card>
          <Card className="bg-slate-800 border border-blue-500/20 p-6">
            <div className="text-slate-400 text-sm mb-2">Active Bounties</div>
            <div className="text-3xl font-bold text-blue-400">{filteredBounties.length}</div>
          </Card>
          <Card className="bg-slate-800 border border-amber-500/20 p-6">
            <div className="text-slate-400 text-sm mb-2">Submissions</div>
            <div className="text-3xl font-bold text-amber-400">{submissions.length}</div>
          </Card>
        </div>

        {/* Filter */}
        <div className="mb-8 flex gap-3">
          {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
            <Button
              key={level}
              onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded ${
                filterLevel === level
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {level.charAt(0).toUpperCase() + level.slice(1)}
            </Button>
          ))}
        </div>

        {/* Bounties Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredBounties.map((bounty) => (
            <Card
              key={bounty.id}
              className="bg-slate-800 border border-slate-700 p-6 hover:border-emerald-500/50 transition cursor-pointer"
              onClick={() => setSelectedBounty(bounty)}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-bold">{bounty.title}</h3>
                <Badge className={getLevelColor(bounty.level)}>
                  {bounty.level}
                </Badge>
              </div>

              <p className="text-slate-400 text-sm mb-4">{bounty.description}</p>

              <div className="mb-4 flex flex-wrap gap-2">
                {bounty.skills.map((skill) => (
                  <Badge key={skill} className="bg-slate-700 text-slate-300">
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-emerald-400 font-bold">
                  💵 ${bounty.reward} {bounty.rewardToken}
                </div>
                <Button
                  onClick={() => setSelectedBounty(bounty)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded"
                >
                  Submit
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Submission Modal */}
        {selectedBounty && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
            <Card className="bg-slate-800 border border-slate-700 p-8 max-w-2xl w-full">
              <h2 className="text-2xl font-bold mb-4">{selectedBounty.title}</h2>

              <div className="mb-6 p-4 bg-slate-900/50 rounded border border-slate-700">
                <p className="text-slate-300">{selectedBounty.description}</p>
                <p className="text-emerald-400 font-bold mt-2">
                  Reward: ${selectedBounty.reward}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Your Submission</label>
                <textarea
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  placeholder="Describe your work, include links, proof, etc..."
                  className="w-full h-32 bg-slate-900 border border-slate-700 rounded p-3 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
                <p className="text-sm text-slate-300">
                  ✨ <strong>Trinity Multi-Agent Review:</strong>
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Your submission will be reviewed by 5 AI agents (Mind, Hand, Eye, Nerve, Spine).
                  If approved by 4+, you'll receive instant payment via Stripe or Crypto.
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !submissionContent.trim()}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded font-bold"
                >
                  {submitting ? '⏳ Submitting...' : '📤 Submit & Review'}
                </Button>
                <Button
                  onClick={() => setSelectedBounty(null)}
                  className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white"
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Recent Submissions */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6">Your Submissions</h2>
          <div className="space-y-4">
            {submissions.length === 0 ? (
              <p className="text-slate-400">No submissions yet</p>
            ) : (
              submissions.map((sub) => (
                <Card
                  key={sub.id}
                  className="bg-slate-800 border border-slate-700 p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-bold">{sub.id}</p>
                    <p className="text-sm text-slate-400">
                      Gate: <span className="text-emerald-400">{sub.dsgGateStatus}</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Badge
                      className={
                        sub.dsgGateStatus === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : sub.dsgGateStatus === 'blocked'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }
                    >
                      {sub.dsgGateStatus}
                    </Badge>
                    {sub.paymentStatus === 'paid' && (
                      <Badge className="bg-green-500/20 text-green-400">✓ Paid</Badge>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
