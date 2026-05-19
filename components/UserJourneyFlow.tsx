import Link from 'next/link';

type JourneyPhase = 'discovery' | 'signup' | 'onboarding' | 'proof';

type JourneyStep = {
  num: string;
  phase: JourneyPhase;
  path: string;
  label: string;
  href?: string;
};

export const JOURNEY_STEPS: JourneyStep[] = [
  { num: '01', phase: 'discovery',  path: '/enterprise-ready',     label: 'Read product',       href: '/enterprise-ready' },
  { num: '02', phase: 'signup',     path: '/signup',               label: 'Create workspace',   href: '/signup' },
  { num: '03', phase: 'signup',     path: 'Email',                 label: 'Confirm email' },
  { num: '04', phase: 'signup',     path: '/auth/confirm',         label: 'Identity confirmed' },
  { num: '05', phase: 'onboarding', path: '/dashboard/welcome',    label: 'Auto setup',         href: '/dashboard/welcome' },
  { num: '06', phase: 'onboarding', path: '/dashboard/api-keys',   label: 'API key',            href: '/dashboard/api-keys' },
  { num: '07', phase: 'onboarding', path: '/dashboard/integrations', label: 'Connect agent',    href: '/dashboard/integrations' },
  { num: '08', phase: 'proof',      path: '/api/try/gate',         label: 'First proof' },
  { num: '09', phase: 'proof',      path: '/dashboard/audit',      label: 'Audit packet',       href: '/dashboard/audit' },
];

const phaseRing: Record<JourneyPhase, string> = {
  discovery: 'border-slate-500/60 text-slate-400',
  signup:    'border-emerald-400/60 text-emerald-400',
  onboarding:'border-amber-400/60 text-amber-400',
  proof:     'border-sky-400/60 text-sky-400',
};

const phaseActiveBg: Record<JourneyPhase, string> = {
  discovery: 'bg-slate-500 text-white',
  signup:    'bg-emerald-400 text-slate-950',
  onboarding:'bg-amber-400 text-slate-950',
  proof:     'bg-sky-400 text-slate-950',
};

const phaseConnector: Record<JourneyPhase, string> = {
  discovery: 'bg-slate-500/30',
  signup:    'bg-emerald-400/30',
  onboarding:'bg-amber-400/30',
  proof:     'bg-sky-400/40',
};

type Props = {
  /** Path of the current page, e.g. '/dashboard/api-keys'. Matched against JOURNEY_STEPS[].href. */
  currentPath: string;
  /** Compact single-row variant (default: false — shows labels below each node) */
  compact?: boolean;
};

/**
 * Horizontal user journey breadcrumb.
 * Shows all 9 steps with the current step highlighted and earlier steps marked done.
 */
export function UserJourneyFlow({ currentPath, compact = false }: Props) {
  const currentIdx = JOURNEY_STEPS.findIndex((s) => s.href === currentPath);

  return (
    <div className="w-full overflow-x-auto">
      <div className={`flex items-start ${compact ? 'gap-0' : 'gap-0'} min-w-max`}>
        {JOURNEY_STEPS.map((step, i) => {
          const isDone    = currentIdx > i;
          const isCurrent = currentIdx === i;

          const nodeClass = isCurrent
            ? phaseActiveBg[step.phase]
            : isDone
            ? 'bg-white/10 text-slate-400 border-white/20'
            : phaseRing[step.phase];

          const labelClass = isCurrent
            ? 'text-white font-bold'
            : isDone
            ? 'text-slate-500'
            : 'text-slate-600';

          const node = (
            <div key={step.num} className="flex flex-col items-center">
              {/* Node circle */}
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-black transition-colors ${nodeClass}`}>
                {isDone ? '✓' : step.num}
              </div>

              {/* Label */}
              {!compact && (
                <div className="mt-1.5 flex flex-col items-center">
                  <span className={`max-w-[72px] text-center text-[10px] font-semibold leading-tight ${labelClass}`}>
                    {step.label}
                  </span>
                  <span className="mt-0.5 max-w-[72px] truncate text-center font-mono text-[9px] text-slate-600">
                    {step.path}
                  </span>
                </div>
              )}
            </div>
          );

          return (
            <div key={step.num} className="flex items-start">
              {/* Connector line before this node (except first) */}
              {i > 0 && (
                <div className={`mt-3.5 h-0.5 w-8 shrink-0 ${isDone || isCurrent ? phaseConnector[step.phase] : 'bg-white/5'}`} />
              )}

              {step.href && !isCurrent ? (
                <Link href={step.href}>{node}</Link>
              ) : (
                node
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
