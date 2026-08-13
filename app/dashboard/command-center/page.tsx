'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import {
  formatAgentEventMessage,
  parseSseData,
  type AgentChatEvent,
} from '../../../lib/agent/chat-event';
import styles from './command-center.module.css';

type EndpointStatus = 'loading' | 'ready' | 'unauthorized' | 'unavailable';
type EndpointState<T> = { status: EndpointStatus; data?: T; error?: string };

type RevenueReadinessPayload = {
  ok: boolean;
  stage: 'blocked' | 'configured-idle' | 'flowing';
  env: {
    required: Record<string, boolean>;
    optional: Record<string, boolean>;
    missingRequired: string[];
  };
  pipeline: {
    billingCustomers: number;
    outboxPending: number;
    outboxFailed: number;
    outboxSent: number;
    reachable: boolean;
    detail?: string;
  };
  blockers: string[];
  timestamp: string;
};

type GitHubStatusPayload = {
  ok: boolean;
  repository: string;
  workflow: string;
  run: null | {
    id: number;
    number: number;
    name: string;
    status: string;
    conclusion: string | null;
    branch: string;
    sha: string;
    url: string;
    createdAt: string;
    updatedAt: string;
  };
  checkedAt: string;
};

type ActivationProofPayload = {
  ok: boolean;
  activated: boolean;
  message?: string;
  proof: null | {
    id: string;
    tier: string;
    subscription_status: string;
    proof_version: string;
    proof_hash: string;
    created_at: string;
  };
};

type CapacityPayload = {
  ok?: boolean;
  plan_key?: string;
  subscription_status?: string;
  executions?: number;
  included_executions?: number;
  remaining_executions?: number;
};

type JourneyState = 'complete' | 'active' | 'locked';
type AgentEventWithToken = AgentChatEvent & { text?: string; gateDecision?: string };

const BROWSER_BOUNDARY =
  'Open/read available; live click, type and submit are not enabled';

async function readEndpoint<T>(
  path: string,
  acceptErrorBody = false,
): Promise<EndpointState<T>> {
  try {
    const response = await fetch(path, { cache: 'no-store' });
    const body = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | null;

    if (response.status === 401 || response.status === 403) {
      return {
        status: 'unauthorized',
        error: response.status === 401 ? 'Sign in required' : 'Workspace access required',
      };
    }
    if (response.ok || (acceptErrorBody && body)) {
      return { status: 'ready', data: body || undefined };
    }
    return {
      status: 'unavailable',
      error: body?.error || 'Request failed (' + response.status + ')',
    };
  } catch (error) {
    return {
      status: 'unavailable',
      error: error instanceof Error ? error.message : 'Request unavailable',
    };
  }
}

function displayEndpoint<T>(state: EndpointState<T>, value: string) {
  if (state.status === 'loading') return 'Checking…';
  if (state.status === 'unauthorized') return state.error || 'Sign in required';
  if (state.status === 'unavailable') return 'Not available';
  return value;
}

function shortHash(value?: string | null) {
  if (!value) return '—';
  return value.replace(/^sha256:/, '').slice(0, 10);
}

function journeyClass(state: JourneyState) {
  if (state === 'complete') return styles.journeyComplete;
  if (state === 'active') return styles.journeyActive;
  return styles.journeyLocked;
}

export default function CommandCenterPage() {
  const [readiness, setReadiness] =
    useState<EndpointState<RevenueReadinessPayload>>({ status: 'loading' });
  const [github, setGithub] =
    useState<EndpointState<GitHubStatusPayload>>({ status: 'loading' });
  const [activation, setActivation] =
    useState<EndpointState<ActivationProofPayload>>({ status: 'loading' });
  const [capacity, setCapacity] =
    useState<EndpointState<CapacityPayload>>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [goal, setGoal] = useState('');
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentEvents, setAgentEvents] = useState<string[]>([]);
  const [agentReply, setAgentReply] = useState('');

  const loadTruth = useCallback(async () => {
    setRefreshing(true);
    const [nextReadiness, nextGithub, nextActivation, nextCapacity] =
      await Promise.all([
        readEndpoint<RevenueReadinessPayload>('/api/revenue-readiness', true),
        readEndpoint<GitHubStatusPayload>('/api/github/revenue-autopilot-status'),
        readEndpoint<ActivationProofPayload>('/api/billing/activation-proof'),
        readEndpoint<CapacityPayload>('/api/capacity'),
      ]);
    setReadiness(nextReadiness);
    setGithub(nextGithub);
    setActivation(nextActivation);
    setCapacity(nextCapacity);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadTruth();
  }, [loadTruth]);

  const paidEntitlement =
    activation.status === 'ready' && activation.data?.activated === true;
  const truthLoaded = [readiness, github, activation, capacity].every(
    (item) => item.status !== 'loading',
  );
  const verificationLoaded =
    readiness.status === 'ready' && github.status === 'ready';
  const executionReady =
    paidEntitlement &&
    readiness.status === 'ready' &&
    readiness.data?.ok === true;

  const blockers = useMemo(() => {
    const items: string[] = [];
    const run = github.data?.run;
    if (
      github.status === 'ready' &&
      run?.conclusion &&
      run.conclusion !== 'success'
    ) {
      items.push(
        'GitHub scheduled run #' + run.number + ': ' + run.conclusion,
      );
    }
    if (readiness.status === 'ready') {
      items.push(...(readiness.data?.blockers || []));
    }
    if (activation.status === 'ready' && !activation.data?.activated) {
      items.push('No Stripe-backed activation proof for this workspace');
    }
    items.push('Live browser click/type/submit executor is not enabled');
    return Array.from(new Set(items));
  }, [activation, github, readiness]);

  const recommendations = useMemo(() => {
    const items = [
      'Type the outcome once; DSG plans and runs supported actions inside that scope.',
    ];
    if (!paidEntitlement) {
      items.push(
        'Start Pro verification to create a paid entitlement through Stripe Checkout.',
      );
    }
    const missing = readiness.data?.env.missingRequired || [];
    if (readiness.status === 'ready' && missing.length) {
      items.push(
        'Configure ' +
          missing.join(', ') +
          ' before the revenue loop can run.',
      );
    }
    items.push(
      'Enable a verified browser mutation executor before delegating click, type or submit actions.',
    );
    return items;
  }, [paidEntitlement, readiness]);

  const verified = useMemo(() => {
    const items: string[] = [];
    const run = github.data?.run;
    if (github.status === 'ready') {
      items.push(
        run
          ? 'GitHub workflow run #' +
              run.number +
              ': ' +
              (run.conclusion || run.status)
          : 'GitHub workflow returned no runs',
      );
    }
    if (readiness.status === 'ready') {
      const required = Object.keys(readiness.data?.env.required || {}).length;
      const missing = readiness.data?.env.missingRequired.length || 0;
      items.push(
        'Revenue configuration: ' +
          (required - missing) +
          '/' +
          required +
          ' required variables present',
      );
    }
    if (activation.status === 'ready') {
      items.push(
        paidEntitlement
          ? 'Activation proof present: ' +
              shortHash(activation.data?.proof?.proof_hash)
          : 'Activation proof query returned no proof',
      );
    }
    items.push('Production verifier boundary: static_check');
    items.push('Browser boundary: ' + BROWSER_BOUNDARY);
    return items;
  }, [activation, github, paidEntitlement, readiness]);

  const journey = useMemo<
    Array<{
      number: number;
      label: string;
      detail: string;
      state: JourneyState;
    }>
  >(
    () => [
      {
        number: 1,
        label: 'Evaluate',
        detail: 'Choose use case & assess',
        state: truthLoaded ? 'complete' : 'active',
      },
      {
        number: 2,
        label: 'Verify',
        detail: 'DSG evaluates readiness',
        state: verificationLoaded
          ? 'complete'
          : truthLoaded
            ? 'active'
            : 'locked',
      },
      {
        number: 3,
        label: 'Buy',
        detail: 'Select Pro package',
        state: paidEntitlement
          ? 'complete'
          : verificationLoaded
            ? 'active'
            : 'locked',
      },
      {
        number: 4,
        label: 'Activate',
        detail: 'Secure activation',
        state: paidEntitlement ? 'complete' : 'locked',
      },
      {
        number: 5,
        label: 'Execute',
        detail: 'Run with DSG guardrails',
        state: executionReady ? 'active' : 'locked',
      },
      {
        number: 6,
        label: 'Evidence',
        detail: 'Measured ROI report',
        state:
          executionReady && Number(capacity.data?.executions || 0) > 0
            ? 'active'
            : 'locked',
      },
    ],
    [
      capacity.data?.executions,
      executionReady,
      paidEntitlement,
      truthLoaded,
      verificationLoaded,
    ],
  );

  const startCheckout = async () => {
    setCheckoutBusy(true);
    setCheckoutError('');
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', interval: 'monthly' }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (response.status === 401) {
        window.location.assign('/login?next=/dashboard/command-center');
        return;
      }
      if (!response.ok || !body.url) {
        throw new Error(body.error || 'Stripe Checkout is not available');
      }
      window.location.assign(body.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : 'Stripe Checkout is not available',
      );
      setCheckoutBusy(false);
    }
  };

  const submitGoal = async () => {
    const message = goal.trim();
    if (!message || agentBusy) return;
    setAgentBusy(true);
    setAgentEvents([
      'Goal accepted as the current plan scope. Checking policy and available tools…',
    ]);
    setAgentReply('');

    try {
      const response = await fetch('/api/agent-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message,
          pageContext: '/dashboard/command-center',
          sessionId: 'command-center-revenue-agent',
        }),
      });
      if (response.status === 401 || response.status === 403) {
        setAgentEvents((current) => [
          ...current,
          'Sign in with an active operator workspace to run this governed plan.',
        ]);
        return;
      }
      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
          reason?: string;
        };
        throw new Error(
          body.reason ||
            body.error ||
            'Agent request failed (' + response.status + ')',
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() || '';

        for (const frame of frames) {
          const line = frame
            .split('\n')
            .find((candidate) => candidate.startsWith('data: '));
          if (!line) continue;
          const event = parseSseData(line) as AgentEventWithToken | null;
          if (!event) continue;
          if (event.type === 'token' && event.text) {
            setAgentReply((current) => current + event.text);
            continue;
          }
          if (event.type === 'synthesis_done' && event.reply) {
            setAgentReply(event.reply);
            continue;
          }
          const formatted = formatAgentEventMessage(event);
          if (formatted) {
            setAgentEvents((current) =>
              current[current.length - 1] === formatted
                ? current
                : [...current, formatted],
            );
          }
        }
      }
    } catch (error) {
      setAgentEvents((current) => [
        ...current,
        'Agent stopped: ' +
          (error instanceof Error ? error.message : 'request unavailable'),
      ]);
    } finally {
      setAgentBusy(false);
    }
  };

  const handleGoalKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void submitGoal();
    }
  };

  const githubRun = github.data?.run;
  const githubLabel = githubRun
    ? githubRun.branch + '@' + shortHash(githubRun.sha)
    : 'No workflow run found';
  const runLabel = githubRun?.conclusion || githubRun?.status || 'No run';
  const activationLabel = paidEntitlement
    ? (activation.data?.proof?.tier || 'paid') +
      ' / ' +
      (activation.data?.proof?.subscription_status || 'active')
    : 'No activation proof';
  const workspacePlan =
    capacity.status === 'ready'
      ? (capacity.data?.plan_key || 'trial') +
        ' / ' +
        (capacity.data?.subscription_status || 'unknown')
      : 'Workspace plan unavailable';
  const metrics = [
    'Actions proposed',
    'Actions verified',
    'Invalid actions rejected',
    'Replay match %',
    'Successful executions',
    'Time saved',
    'Solver latency',
    'Cost / action',
  ];

  return (
    <main className={styles.shell}>
      <section className={styles.frame}>
        <div className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>DSG ONE Command Center</p>
            <h1>Runtime control surface with Graphify context evidence.</h1>
            <p className={styles.lede}>
            Command Center shows what DSG ONE is doing, what it blocked, what
            needs approval, and what evidence supports each claim.
            </p>
            <p className={styles.supportingCopy}>
              The typed agent uses the same workspace context as the operator.
              Supported actions continue inside the stated goal; verified
              constraint, permission, billing and executor boundaries remain
              fail-closed.
            </p>
            <div className={styles.statusRow}>
              <span
                className={
                  verificationLoaded
                    ? styles.statusPass
                    : styles.statusReview
                }
              >
                {verificationLoaded ? 'Truth loaded' : 'Review'}
              </span>
              <span
                className={
                  paidEntitlement ? styles.statusPass : styles.statusReview
                }
              >
                {paidEntitlement ? 'Paid active' : 'Activation needed'}
              </span>
              <span
                className={
                  blockers.length ? styles.statusBlocked : styles.statusPass
                }
              >
                {blockers.length
                  ? blockers.length + ' boundaries'
                  : 'No verified blocker'}
              </span>
            </div>
          </div>

          <aside className={styles.truthPanel} aria-label="Current truth">
            <div className={styles.panelHeadingRow}>
              <p className={styles.panelLabel}>Current truth</p>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => void loadTruth()}
                disabled={refreshing}
                aria-label="Refresh current truth"
                title="Refresh current truth"
              >
                <RefreshCw
                  size={15}
                  className={refreshing ? styles.spin : undefined}
                />
              </button>
            </div>
            <dl className={styles.truthList}>
              <div>
                <dt>GitHub deployment</dt>
                <dd>{displayEndpoint(github, githubLabel)}</dd>
              </div>
              <div>
                <dt>Latest scheduled run</dt>
                <dd>
                  {displayEndpoint(github, runLabel)}
                  {githubRun?.url ? (
                    <a
                      href={githubRun.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Open GitHub workflow run"
                    >
                      <ExternalLink size={13} />
                    </a>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt>Revenue readiness</dt>
                <dd>
                  {displayEndpoint(
                    readiness,
                    readiness.data?.stage || 'unknown',
                  )}
                </dd>
              </div>
              <div>
                <dt>Workspace entitlement</dt>
                <dd>{displayEndpoint(activation, activationLabel)}</dd>
              </div>
              <div>
                <dt>Workspace plan</dt>
                <dd>{displayEndpoint(capacity, workspacePlan)}</dd>
              </div>
              <div>
                <dt>Production verifier</dt>
                <dd>static_check</dd>
              </div>
              <div>
                <dt>External Z3 (production)</dt>
                <dd>Unsupported</dd>
              </div>
              <div>
                <dt>Activation proof</dt>
                <dd>
                  {displayEndpoint(
                    activation,
                    paidEntitlement
                      ? shortHash(activation.data?.proof?.proof_hash)
                      : 'None',
                  )}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        <section
          className={styles.journeySection}
          aria-labelledby="journey-title"
        >
          <p id="journey-title" className={styles.panelLabel}>
            Deployment journey
          </p>
          <ol className={styles.journey}>
            {journey.map((step, index) => (
              <li key={step.label} className={journeyClass(step.state)}>
                <div className={styles.stepTop}>
                  <span className={styles.stepNumber}>
                    {step.state === 'complete' ? (
                      <Check size={15} />
                    ) : (
                      step.number
                    )}
                  </span>
                  <span className={styles.stepLabel}>{step.label}</span>
                  {index < journey.length - 1 ? (
                    <span className={styles.stepLine} />
                  ) : null}
                </div>
                <p>{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.agentPanel} aria-labelledby="agent-title">
          <div className={styles.agentIntro}>
            <span className={styles.agentIcon}>
              <Bot size={20} />
            </span>
            <div>
              <p className={styles.panelLabel}>Typed browser agent</p>
              <h2 id="agent-title">One goal defines the working scope.</h2>
              <p>
                Press Enter once. DSG plans and runs supported in-scope tools
                without asking you to click through every step. Shift+Enter adds
                a new line.
              </p>
            </div>
          </div>
          <div className={styles.commandBox}>
            <textarea
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              onKeyDown={handleGoalKeyDown}
              placeholder="Example: Inspect the failed Revenue Autopilot run, explain the verified blocker, and prepare the safest in-scope next action."
              rows={2}
              disabled={agentBusy}
              aria-label="Agent goal"
            />
            <button
              type="button"
              className={styles.commandButton}
              onClick={() => void submitGoal()}
              disabled={!goal.trim() || agentBusy}
            >
              {agentBusy ? (
                <Loader2 size={17} className={styles.spin} />
              ) : (
                <Terminal size={17} />
              )}
              {agentBusy ? 'Running governed plan…' : 'Run governed plan'}
              {!agentBusy ? <ArrowRight size={17} /> : null}
            </button>
          </div>
          <div className={styles.agentBoundary}>
            <ShieldCheck size={16} />
            <span>
              {BROWSER_BOUNDARY}. High-risk, destructive, payment and
              out-of-scope changes still require explicit approval.
            </span>
          </div>
          {agentEvents.length > 0 || agentReply ? (
            <div className={styles.agentOutput} aria-live="polite">
              <div className={styles.eventList}>
                {agentEvents.map((event, index) => (
                  <p key={event + '-' + index}>{event}</p>
                ))}
              </div>
              {agentReply ? (
                <div className={styles.agentReply}>{agentReply}</div>
              ) : null}
            </div>
          ) : null}
        </section>

        <section
          className={styles.briefGrid}
          aria-label="Verified deployment brief and offer"
        >
          <div className={styles.briefPanel}>
            <p className={styles.panelLabel}>Verified deployment brief</p>
            <div className={styles.briefColumns}>
              <div>
                <h2 className={styles.goldHeading}>What DSG recommends</h2>
                <ul>
                  {recommendations.map((item) => (
                    <li key={item}>
                      <ArrowRight size={15} /> <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className={styles.goldHeading}>What is verified</h2>
                <ul>
                  {verified.map((item) => (
                    <li key={item}>
                      <CheckCircle2
                        size={16}
                        className={styles.checkIcon}
                      />{' '}
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className={styles.redHeading}>What blocks execution</h2>
                <ul>
                  {blockers.slice(0, 6).map((item) => (
                    <li key={item}>
                      <XCircle size={16} className={styles.blockIcon} />{' '}
                      <span>{item}</span>
                    </li>
                  ))}
                  {blockers.length === 0 ? (
                    <li>
                      <CheckCircle2
                        size={16}
                        className={styles.checkIcon}
                      />{' '}
                      <span>No verified blocker from loaded sources.</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            </div>
            <div className={styles.failClosedNote}>
              <LockKeyhole size={15} />
              <span>
                DSG continues supported, plan-authorized actions. It pauses
                only when a verified constraint, permission, billing, risk or
                executor boundary is reached.
              </span>
            </div>
          </div>

          <aside className={styles.offerPanel}>
            <p className={styles.panelLabel}>Recommended Pro package</p>
            <div className={styles.priceRow}>
              <h2>Pro Verification</h2>
              <p>
                <strong>$99</strong>
                <span>/month</span>
              </p>
            </div>
            <p className={styles.offerCopy}>
              Production verification entitlement, DSG verifier access and
              audit-grade evidence reports.
            </p>
            <button
              type="button"
              className={styles.checkoutButton}
              onClick={() => void startCheckout()}
              disabled={checkoutBusy || paidEntitlement}
            >
              {checkoutBusy ? (
                <Loader2 size={18} className={styles.spin} />
              ) : null}
              {paidEntitlement
                ? 'Pro verification active'
                : checkoutBusy
                  ? 'Opening Stripe Checkout…'
                  : 'Start Pro verification — $99/month'}
            </button>
            <Link href="/evidence-pack" className={styles.evidenceLink}>
              View technical evidence <ExternalLink size={14} />
            </Link>
            {checkoutError ? (
              <p className={styles.errorMessage}>
                <X size={14} /> {checkoutError}
              </p>
            ) : null}
            <ul className={styles.offerBenefits}>
              <li>
                <CheckCircle2 size={16} /> Stripe-hosted subscription checkout
              </li>
              <li>
                <CheckCircle2 size={16} /> 14-day Pro trial from the shared
                catalog
              </li>
              <li>
                <CheckCircle2 size={16} /> Append-only entitlement activation
                proof
              </li>
              <li>
                <CheckCircle2 size={16} /> Cancel any time
              </li>
            </ul>
          </aside>
        </section>

        <section
          className={styles.metricsSection}
          aria-labelledby="metrics-title"
        >
          <div className={styles.metricsHeading}>
            <div>
              <p id="metrics-title" className={styles.panelLabel}>
                Outcome contract — measured after real usage
              </p>
              <p>
                No inferred ROI. Values remain unmeasured until a verified
                production event supplies evidence.
              </p>
            </div>
            {capacity.status === 'ready' ? (
              <span className={styles.usageBadge}>
                Usage counter: {Number(capacity.data?.executions || 0)} /{' '}
                {Number(capacity.data?.included_executions || 0)}
              </span>
            ) : null}
          </div>
          <div className={styles.metricGrid}>
            {metrics.map((metric) => (
              <article key={metric}>
                <p>{metric}</p>
                <strong>Not measured</strong>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
