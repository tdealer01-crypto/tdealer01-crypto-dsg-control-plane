'use client';

import { useSyncExternalStore, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  X,
  Rocket,
  AppWindow,
  Puzzle,
  Globe,
  Users,
} from 'lucide-react';
import { checklistStore } from '@/store/checklistStore';

type Step = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: { label: string; href: string };
  storageFlag?: string;
};

const STEPS: Step[] = [
  {
    id: 'create_account',
    icon: Rocket,
    title: 'Create your account',
    description: 'Sign up and confirm your email to unlock full access.',
    cta: { label: 'Go to account', href: '/account' },
    storageFlag: 'dsg_visited_account',
  },
  {
    id: 'build_first_app',
    icon: AppWindow,
    title: 'Build your first app',
    description: 'Use the guided App Builder to generate your first project.',
    cta: { label: 'Open App Builder', href: '/#chat' },
    storageFlag: 'dsg_visited_builder',
  },
  {
    id: 'connect_template',
    icon: Puzzle,
    title: 'Connect to a template',
    description: 'Bootstrap faster using a curated starter template.',
    cta: { label: 'Browse templates', href: '/templates' },
    storageFlag: 'dsg_visited_templates',
  },
  {
    id: 'deploy_production',
    icon: Globe,
    title: 'Deploy to production',
    description: 'Approve your plan and generate a GitHub PR with evidence.',
    cta: { label: 'View executions', href: '/#executions' },
    storageFlag: 'dsg_visited_executions',
  },
  {
    id: 'invite_team',
    icon: Users,
    title: 'Invite a team member',
    description: 'Collaborate by inviting colleagues to your workspace.',
    cta: { label: 'Invite now', href: '/team' },
    storageFlag: 'dsg_visited_team',
  },
];

export function OnboardingChecklist() {
  const [collapsed, setCollapsed] = useState(false);

  const { dismissed, completedSteps } = useSyncExternalStore(
    checklistStore.subscribe,
    checklistStore.getSnapshot,
    checklistStore.getServerSnapshot,
  );

  if (dismissed) return null;

  const completed = new Set(completedSteps);
  const total = STEPS.length;
  const done = STEPS.filter((s) => completed.has(s.id) || completed.has(s.storageFlag ?? '')).length;
  const progress = Math.round((done / total) * 100);

  function dismiss() {
    checklistStore.update({ dismissed: true });
  }

  function toggleStep(id: string) {
    const next = new Set(completedSteps);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    checklistStore.update({ completedSteps: [...next] });
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/60">
      {/* Header */}
      <div
        className="flex cursor-pointer items-center justify-between gap-3 rounded-t-2xl border-b border-slate-800 px-4 py-3 select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-100">Complete your setup</span>
          <span className="rounded-full bg-indigo-600/30 px-2 py-0.5 text-xs font-semibold text-indigo-300">
            {done}/{total}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
          <button
            onClick={(e) => { e.stopPropagation(); dismiss(); }}
            className="rounded-md p-0.5 text-slate-500 transition hover:bg-slate-800 hover:text-slate-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {!collapsed && (
        <div className="h-1 w-full bg-slate-800">
          <div
            className="h-1 bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Steps */}
      {!collapsed && (
        <div className="divide-y divide-slate-800/60 px-1 py-1">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isComplete =
              completed.has(step.id) || completed.has(step.storageFlag ?? '');
            return (
              <div key={step.id} className="flex items-start gap-3 rounded-xl px-3 py-3">
                <button
                  onClick={() => toggleStep(step.id)}
                  className="mt-0.5 shrink-0 text-slate-400 transition hover:text-indigo-400"
                  aria-label={isComplete ? 'Mark incomplete' : 'Mark complete'}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
                    <p className={`text-sm font-semibold leading-5 ${isComplete ? 'text-slate-500 line-through' : 'text-slate-100'}`}>
                      {step.title}
                    </p>
                  </div>
                  {!isComplete && (
                    <p className="mt-0.5 text-xs leading-4 text-slate-500">{step.description}</p>
                  )}
                  {!isComplete && (
                    <Link
                      href={step.cta.href}
                      className="mt-1.5 inline-block rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      {step.cta.label} →
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer when all done */}
      {!collapsed && done === total && (
        <div className="px-4 pb-4 pt-2 text-center">
          <p className="text-xs font-semibold text-emerald-400">All steps complete — you&apos;re ready to ship!</p>
          <button
            onClick={dismiss}
            className="mt-2 rounded-lg border border-slate-700 px-4 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-800"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
