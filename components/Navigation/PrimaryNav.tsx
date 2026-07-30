'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Eye,
  CheckCircle,
  FileText,
  Zap,
  ChevronDown,
  BarChart3,
  Lock,
  AlertCircle,
  DollarSign,
} from 'lucide-react';

/**
 * 4-Pillar Navigation Architecture
 *
 * This component organizes the DSG control plane into four semantic pillars:
 * - Monitor: Observe runtime state, execution, and health
 * - Verify: Govern policies, verify decisions, and approve actions
 * - Audit: Compliance tracking, evidence collection, and breach signals
 * - Optimize: Performance tuning, billing, and capacity planning
 */

interface PillarRoute {
  path: string;
  label: string;
  icon?: React.ReactNode;
  featureFlag?: string;
}

interface Pillar {
  id: 'monitor' | 'verify' | 'audit' | 'optimize';
  name: string;
  ariaLabel: string;
  icon: React.ReactNode;
  description: string;
  routes: PillarRoute[];
}

const PILLARS: Pillar[] = [
  {
    id: 'monitor',
    name: 'Monitor',
    ariaLabel: 'Monitor and observe runtime state',
    icon: <Eye className="h-4 w-4" />,
    description: 'Track execution, health, and agent status',
    routes: [
      { path: '/dashboard', label: 'Dashboard', featureFlag: 'ENABLE_MONITOR_DASHBOARD' },
      { path: '/dashboard/executions', label: 'Executions' },
      { path: '/dashboard/agents', label: 'Agents' },
      { path: '/dashboard/capacity', label: 'Capacity' },
      { path: '/dashboard/live-control', label: 'Live Control' },
    ],
  },
  {
    id: 'verify',
    name: 'Verify',
    ariaLabel: 'Verify and govern policies',
    icon: <CheckCircle className="h-4 w-4" />,
    description: 'Define policies, verify decisions, and approve actions',
    routes: [
      { path: '/dashboard/policies', label: 'Policies' },
      { path: '/dashboard/verification', label: 'Verification' },
      { path: '/dashboard/proofs', label: 'Proofs' },
      { path: '/approvals', label: 'Approvals' },
      { path: '/dashboard/audit', label: 'Audit Log' },
    ],
  },
  {
    id: 'audit',
    name: 'Audit',
    ariaLabel: 'View audit trails and compliance evidence',
    icon: <FileText className="h-4 w-4" />,
    description: 'Compliance evidence, breach detection, and risk analysis',
    routes: [
      { path: '/dashboard/compliance-evidence-pack', label: 'Evidence Pack' },
      { path: '/dashboard/breach-signal', label: 'Breach Signal' },
      { path: '/dashboard/integration', label: 'Integrations' },
      { path: '/gateway/monitor', label: 'Gateway Monitor' },
    ],
  },
  {
    id: 'optimize',
    name: 'Optimize',
    ariaLabel: 'Optimize performance and cost',
    icon: <Zap className="h-4 w-4" />,
    description: 'Billing, capacity planning, and performance tuning',
    routes: [
      { path: '/dashboard/billing', label: 'Billing', featureFlag: 'ENABLE_BILLING_UI' },
      { path: '/dashboard/capacity', label: 'Capacity' },
      { path: '/dashboard/ledger', label: 'Ledger' },
      { path: '/dashboard/payout-safety', label: 'Payout Safety' },
      { path: '/dashboard/settings/security', label: 'Security' },
    ],
  },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

interface PrimaryNavProps {
  expandedPillar?: string | null;
  onPillarToggle?: (pillarId: string) => void;
}

export default function PrimaryNav({
  expandedPillar: controlledExpandedPillar,
  onPillarToggle,
}: PrimaryNavProps) {
  const pathname = usePathname();
  const [uncontrolledExpandedPillar, setUncontrolledExpandedPillar] = useState<string | null>(
    null
  );

  // Use controlled or uncontrolled state
  const expandedPillar =
    controlledExpandedPillar !== undefined ? controlledExpandedPillar : uncontrolledExpandedPillar;

  const handlePillarToggle = (pillarId: string) => {
    if (onPillarToggle) {
      onPillarToggle(pillarId);
    } else {
      setUncontrolledExpandedPillar(
        expandedPillar === pillarId ? null : pillarId
      );
    }
  };

  // Determine which pillar contains the current route
  const getActivePillarId = () => {
    for (const pillar of PILLARS) {
      if (pillar.routes.some((route) => isActive(pathname, route.path))) {
        return pillar.id;
      }
    }
    return null;
  };

  const activePillarId = getActivePillarId();

  return (
    <nav
      className="flex items-center gap-2 overflow-x-auto pb-0.5"
      aria-label="Main navigation: Monitor, Verify, Audit, Optimize"
      role="navigation"
    >
      {PILLARS.map((pillar) => {
        const isExpanded = expandedPillar === pillar.id;
        const isPillarActive = activePillarId === pillar.id;

        return (
          <div key={pillar.id} className="relative">
            {/* Pillar button */}
            <button
              onClick={() => handlePillarToggle(pillar.id)}
              aria-expanded={isExpanded}
              aria-haspopup="true"
              aria-label={pillar.ariaLabel}
              className={[
                'flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                isPillarActive
                  ? 'border-emerald-400/50 bg-emerald-400/10 text-emerald-200'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-emerald-400/30 hover:text-slate-100',
              ].join(' ')}
            >
              {pillar.icon}
              <span>{pillar.name}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </button>

            {/* Routes dropdown */}
            {isExpanded && (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-56 rounded-2xl border border-slate-800 bg-slate-900 py-2 shadow-2xl"
                role="region"
                aria-label={`${pillar.name} routes`}
              >
                {pillar.routes.map((route) => {
                  const routeIsActive = isActive(pathname, route.path);
                  return (
                    <Link
                      key={route.path}
                      href={route.path}
                      onClick={() => handlePillarToggle(pillar.id)}
                      className={[
                        'block px-4 py-2 text-sm font-medium transition-colors',
                        routeIsActive
                          ? 'bg-emerald-400/10 text-emerald-200'
                          : 'text-slate-300 hover:bg-white/5 hover:text-slate-100',
                      ].join(' ')}
                    >
                      {route.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

export type { Pillar, PillarRoute };
