'use client';

/**
 * DSG Setup Wizard Dashboard
 * Main entry point for one-time infrastructure setup
 */

import { useState } from 'react';
import Link from 'next/link';

interface SetupStep {
  id: string;
  title: string;
  description: string;
  href: string;
  status: 'available' | 'in-progress' | 'completed' | 'disabled';
  icon: string;
}

export default function SetupDashboard() {
  const [selectedOrg, setSelectedOrg] = useState('test-org');

  const setupSteps: SetupStep[] = [
    {
      id: 'analyze',
      title: 'Analyze Project',
      description: 'Scan package.json, docker-compose, workflows to detect services',
      href: '/dashboard/setup/analyze',
      status: 'available',
      icon: '🔍',
    },
    {
      id: 'plan',
      title: 'Build Plan',
      description: 'Resolve dependencies, compute execution phases, estimate time',
      href: '/dashboard/setup/plan',
      status: 'available',
      icon: '📋',
    },
    {
      id: 'approve',
      title: 'Approve Plan',
      description: 'Verify canonical hash, approve for execution (5 min TTL)',
      href: '/dashboard/setup/approve',
      status: 'disabled',
      icon: '✅',
    },
    {
      id: 'execute',
      title: 'Execute',
      description: 'Provision infrastructure, track progress, handle rollback',
      href: '/dashboard/setup/execute',
      status: 'disabled',
      icon: '⚡',
    },
    {
      id: 'audit',
      title: 'Audit Trail',
      description: 'View immutable event hash-chain, verify all actions',
      href: '/dashboard/setup/audit',
      status: 'available',
      icon: '📜',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Infrastructure Setup</h1>
          <p className="text-lg text-slate-600">
            One-time setup wizard for multi-connector provisioning
          </p>
        </div>

        {/* Org Selector */}
        <div className="mb-8 p-4 bg-white rounded-lg border border-slate-200">
          <label className="block text-sm font-medium text-slate-700 mb-2">Organization</label>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900"
          >
            <option value="test-org">Test Organization</option>
            <option value="prod-org">Production Org</option>
          </select>
        </div>

        {/* Setup Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          {setupSteps.map((step) => (
            <div
              key={step.id}
              className={`p-6 rounded-lg border-2 transition-all ${
                step.status === 'available'
                  ? 'border-blue-500 bg-white hover:shadow-lg cursor-pointer'
                  : step.status === 'disabled'
                    ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50'
                    : 'border-green-500 bg-green-50'
              }`}
            >
              <div className="text-4xl mb-2">{step.icon}</div>
              <h3 className="font-semibold text-slate-900 mb-1">{step.title}</h3>
              <p className="text-sm text-slate-600 mb-4">{step.description}</p>

              {step.status === 'available' && (
                <Link
                  href={step.href}
                  className="inline-block px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                >
                  Start
                </Link>
              )}

              {step.status === 'disabled' && (
                <span className="inline-block px-3 py-1 bg-slate-300 text-slate-600 text-sm rounded">
                  Locked
                </span>
              )}

              {step.status === 'completed' && (
                <span className="inline-block px-3 py-1 bg-green-500 text-white text-sm rounded">
                  ✓ Done
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Recent Executions */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Recent Executions</h2>

          <div className="space-y-3">
            {[
              {
                id: 'exec-001',
                plan: 'GitHub → Vercel → Stripe',
                status: 'completed',
                duration: '2m 34s',
              },
              {
                id: 'exec-002',
                plan: 'GitHub → Supabase',
                status: 'failed',
                duration: '45s',
              },
              {
                id: 'exec-003',
                plan: 'GitHub → Vercel',
                status: 'completed',
                duration: '1m 12s',
              },
            ].map((exec) => (
              <div key={exec.id} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div>
                  <div className="font-medium text-slate-900">{exec.plan}</div>
                  <div className="text-sm text-slate-500">{exec.id}</div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600">{exec.duration}</span>
                  <span
                    className={`px-2 py-1 text-sm rounded font-medium ${
                      exec.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {exec.status === 'completed' ? '✓ Completed' : '✗ Failed'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/setup/executions"
            className="mt-4 inline-block text-blue-500 hover:text-blue-700 text-sm font-medium"
          >
            View all executions →
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Setups', value: '3', icon: '📦' },
            { label: 'Success Rate', value: '66%', icon: '📈' },
            { label: 'Connectors', value: '5', icon: '🔌' },
            { label: 'Avg Duration', value: '1m 30s', icon: '⏱️' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="text-3xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm text-slate-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
