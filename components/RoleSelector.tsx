'use client';

import { useState } from 'react';

export type OnboardingRole = 'developer' | 'finance_operator' | 'executive';

interface RoleSelectorProps {
  onRoleSelect: (role: OnboardingRole) => Promise<void>;
  isLoading?: boolean;
}

const ROLES: Array<{
  id: OnboardingRole;
  title: string;
  description: string;
  features: string[];
}> = [
  {
    id: 'developer',
    title: 'Developer',
    description: 'Build integrations and webhooks',
    features: ['REST API integration', 'Webhook management', 'Execution logs', 'Custom workflows'],
  },
  {
    id: 'finance_operator',
    title: 'Finance Operator',
    description: 'Approvals and compliance',
    features: ['Create policies', 'Approval workflows', 'Audit trail', 'Compliance evidence'],
  },
  {
    id: 'executive',
    title: 'Executive',
    description: 'Governance and oversight',
    features: ['Dashboard overview', 'Audit reports', 'Team management', 'Risk insights'],
  },
];

export default function RoleSelector({ onRoleSelect, isLoading = false }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<OnboardingRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = async (role: OnboardingRole) => {
    if (submitting) return;
    setSelectedRole(role);
    setSubmitting(true);
    try {
      const response = await fetch('/api/user/onboarding-role', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        throw new Error('Failed to save role');
      }

      await onRoleSelect(role);

      // Reload page to show role-specific content
      window.location.reload();
    } finally {
      setSubmitting(false);
    }
  };

  const isDisabled = isLoading || submitting;

  return (
    <div className="mb-12 rounded-2xl border border-slate-700 bg-slate-900/50 p-8">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white">
          What&apos;s your primary role?
        </h2>
        <p className="mt-2 text-slate-400">
          We&apos;ll customize your onboarding experience
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {ROLES.map((role) => (
          <button
            key={role.id}
            onClick={() => handleSelect(role.id)}
            disabled={isDisabled}
            className={`group relative overflow-hidden rounded-xl border-2 p-6 text-left transition ${
              selectedRole === role.id
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
            } ${isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            {/* Selection indicator */}
            {selectedRole === role.id && (
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent" />
            )}

            <div className="relative z-10">
              <h3 className="text-lg font-bold text-white">{role.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{role.description}</p>

              <div className="mt-4 space-y-1">
                {role.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="h-1 w-1 rounded-full bg-slate-600" />
                    {feature}
                  </div>
                ))}
              </div>

              {selectedRole === role.id && (
                <div className="mt-4 pt-4 border-t border-emerald-400/30">
                  <span className="text-xs font-semibold text-emerald-300">
                    {submitting ? 'Saving...' : '✓ Selected'}
                  </span>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={() => onRoleSelect('developer')}
          disabled={isDisabled}
          className="text-sm text-slate-500 hover:text-slate-300 disabled:opacity-50"
        >
          Skip role selection →
        </button>
      </div>
    </div>
  );
}
