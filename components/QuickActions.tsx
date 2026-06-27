'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Zap,
  FileText,
  GitPullRequest,
  Users,
  ChevronRight,
  Loader2,
} from 'lucide-react';

type QuickAction = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  href?: string;
  onClick?: () => Promise<void>;
};

export function QuickActions() {
  const [running, setRunning] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; message: string } | null>(null);

  async function runTestAction() {
    setRunning('test_action');
    setResult(null);
    try {
      const requestId = crypto.randomUUID();
      const res = await fetch('/api/dsg/v1/gates/evaluate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planId: 'quick_actions_test_ping',
          riskLevel: 'low',
          nonce: `qa_nonce_${requestId}`,
          idempotencyKey: `qa_idem_${requestId}`,
          context: {
            source: 'quick_actions_widget',
            test: true,
            requirement_clear: true,
            tool_available: true,
            // Client-side quick checks cannot prove permission or secret binding.
            // Keep these false so the gate cannot be mistaken for production audit evidence.
            permission_granted: false,
            secret_bound: false,
            dependency_resolved: true,
            testable: true,
            deploy_target_ready: false,
            audit_hook_available: false,
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      setResult({
        id: 'test_action',
        ok: res.ok && json.ok === true,
        message: res.ok
          ? `Gate result: ${json.gateStatus ?? json.proofStatus ?? 'UNKNOWN'} (client-only check, not audit evidence)`
          : json.error ?? `Error ${res.status}`,
      });
    } catch (err) {
      setResult({
        id: 'test_action',
        ok: false,
        message: err instanceof Error ? err.message : 'Request failed',
      });
    } finally {
      setRunning(null);
    }
  }

  const actions: QuickAction[] = [
    {
      id: 'test_action',
      icon: Zap,
      label: 'Run a test action',
      description: 'Check the gate contract without claiming production audit evidence.',
      onClick: runTestAction,
    },
    {
      id: 'view_evidence',
      icon: FileText,
      label: 'View latest evidence',
      description: 'Inspect the most recent cryptographic evidence pack.',
      href: '/evidence-pack',
    },
    {
      id: 'check_approvals',
      icon: GitPullRequest,
      label: 'Check approval queue',
      description: 'Review actions pending human approval.',
      href: '/approvals',
    },
    {
      id: 'invite_team',
      icon: Users,
      label: 'Invite team member',
      description: 'Add an operator or reviewer to your workspace.',
      href: '/dashboard/team',
    },
  ];

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
      {/* Card header */}
      <div className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Quick Actions</p>
        <h2 className="mt-1.5 text-lg font-semibold text-white">Get things done fast</h2>
      </div>

      {/* Action rows */}
      <div className="space-y-1">
        {actions.map((action) => {
          const Icon = action.icon;
          const isRunning = running === action.id;

          const rowContent = (
            <>
              {/* Icon */}
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#D4AF37] transition group-hover:border-[#D4AF37]/35 group-hover:bg-[#D4AF37]/10">
                {isRunning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </span>
              {/* Text */}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">{action.label}</p>
                <p className="text-xs leading-4 text-slate-500">{action.description}</p>
              </div>
              {/* Arrow */}
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600 transition group-hover:text-[#D4AF37]" />
            </>
          );

          const rowClass =
            'group flex w-full items-center gap-4 rounded-2xl border border-transparent px-3 py-3 text-left transition hover:border-white/10 hover:bg-white/[0.03]';

          if (action.href) {
            return (
              <Link key={action.id} href={action.href} className={rowClass}>
                {rowContent}
              </Link>
            );
          }

          return (
            <button
              key={action.id}
              className={rowClass}
              onClick={() => void action.onClick?.()}
              disabled={isRunning}
            >
              {rowContent}
            </button>
          );
        })}
      </div>

      {/* Inline result feedback for test action */}
      {result && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            result.ok
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100'
              : 'border-red-400/30 bg-red-500/10 text-red-100'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  );
}
