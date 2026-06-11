export interface PayoutPolicy {
  max_payout_amount: number;
  daily_limit: number;
  weekly_limit: number;
  monthly_limit: number;
  max_payouts_per_day: number;
  min_minutes_between_payouts: number;
  allowed_currency: string;
  allowed_destinations: string[];
  new_destination_hold_hours: number;
  low_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  medium_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  high_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  critical_risk_action: 'ALLOW' | 'REVIEW' | 'BLOCK';
  approval_threshold_amount: number;
  two_person_approval_threshold: number | null;
  allowed_days: string[];
  allowed_time_start: string;
  allowed_time_end: string;
  automation_enabled: boolean;
  emergency_paused: boolean;
}

export interface PayoutRequest {
  amount: number;
  currency: string;
  destination_id?: string;
  destination_is_new?: boolean;
  daily_total_so_far?: number;
  weekly_total_so_far?: number;
  monthly_total_so_far?: number;
  payout_count_today?: number;
  minutes_since_last_payout?: number | null;
  requested_at?: string;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export type Decision = 'ALLOW' | 'REVIEW' | 'BLOCK';

export interface CheckResult {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface GateResult {
  decision: Decision;
  reason: string;
  reason_code: string;
  matched_rule: string | null;
  required_approval: 'ADMIN' | 'TWO_PERSON' | null;
  evidence: Record<string, unknown>;
  checks: CheckResult[];
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

function severityRank(d: Decision): number {
  return d === 'BLOCK' ? 2 : d === 'REVIEW' ? 1 : 0;
}

function worst(a: Decision, b: Decision): Decision {
  return severityRank(a) >= severityRank(b) ? a : b;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function evaluatePayoutGate(policy: PayoutPolicy, req: PayoutRequest): GateResult {
  const checks: CheckResult[] = [];
  const violations: Array<{ decision: Decision; reason: string; code: string }> = [];
  const now = req.requested_at ? new Date(req.requested_at) : new Date();

  const push = (rule: string, passed: boolean, detail: string, onFail?: { d: Decision; code: string }) => {
    checks.push({ rule, passed, detail });
    if (!passed && onFail) violations.push({ decision: onFail.d, reason: detail, code: onFail.code });
  };

  // 1. Emergency pause
  push(
    'emergency_pause',
    !policy.emergency_paused,
    policy.emergency_paused ? 'All payouts are paused by emergency stop' : 'No emergency pause active',
    policy.emergency_paused ? { d: 'BLOCK', code: 'EMERGENCY_PAUSE' } : undefined,
  );
  if (policy.emergency_paused) {
    return finalResult('BLOCK', 'All payouts are paused by emergency stop', 'EMERGENCY_PAUSE', null, checks, violations, req, policy);
  }

  // 2. Automation disabled
  push(
    'automation_enabled',
    policy.automation_enabled,
    policy.automation_enabled ? 'Automation is enabled' : 'Automation is disabled — all payouts require review',
    !policy.automation_enabled ? { d: 'REVIEW', code: 'AUTOMATION_DISABLED' } : undefined,
  );

  // 3. Currency
  const currencyOk = !req.currency || req.currency.toUpperCase() === policy.allowed_currency.toUpperCase();
  push(
    'currency',
    currencyOk,
    currencyOk ? `Currency ${req.currency} is allowed` : `Currency ${req.currency} is not allowed (policy: ${policy.allowed_currency})`,
    !currencyOk ? { d: 'BLOCK', code: 'CURRENCY_NOT_ALLOWED' } : undefined,
  );

  // 4. Amount per payout
  const amountOk = req.amount <= policy.max_payout_amount;
  push(
    'max_payout_amount',
    amountOk,
    amountOk
      ? `Amount ${req.amount} ≤ limit ${policy.max_payout_amount}`
      : `Amount ${req.amount} exceeds single payout limit of ${policy.max_payout_amount}`,
    !amountOk ? { d: 'REVIEW', code: 'PAYOUT_AMOUNT_EXCEEDS_SINGLE_LIMIT' } : undefined,
  );

  // 5. Daily limit
  const dailyTotal = (req.daily_total_so_far ?? 0) + req.amount;
  const dailyOk = dailyTotal <= policy.daily_limit;
  push(
    'daily_limit',
    dailyOk,
    dailyOk
      ? `Daily total ${dailyTotal} ≤ daily limit ${policy.daily_limit}`
      : `Daily total ${dailyTotal} would exceed daily limit ${policy.daily_limit}`,
    !dailyOk ? { d: 'REVIEW', code: 'DAILY_LIMIT_EXCEEDED' } : undefined,
  );

  // 6. Weekly limit
  const weeklyTotal = (req.weekly_total_so_far ?? 0) + req.amount;
  const weeklyOk = weeklyTotal <= policy.weekly_limit;
  push(
    'weekly_limit',
    weeklyOk,
    weeklyOk
      ? `Weekly total ${weeklyTotal} ≤ weekly limit ${policy.weekly_limit}`
      : `Weekly total ${weeklyTotal} would exceed weekly limit ${policy.weekly_limit}`,
    !weeklyOk ? { d: 'REVIEW', code: 'WEEKLY_LIMIT_EXCEEDED' } : undefined,
  );

  // 7. Monthly limit
  const monthlyTotal = (req.monthly_total_so_far ?? 0) + req.amount;
  const monthlyOk = monthlyTotal <= policy.monthly_limit;
  push(
    'monthly_limit',
    monthlyOk,
    monthlyOk
      ? `Monthly total ${monthlyTotal} ≤ monthly limit ${policy.monthly_limit}`
      : `Monthly total ${monthlyTotal} would exceed monthly limit ${policy.monthly_limit}`,
    !monthlyOk ? { d: 'REVIEW', code: 'MONTHLY_LIMIT_EXCEEDED' } : undefined,
  );

  // 8. Payout count per day
  const countOk = (req.payout_count_today ?? 0) < policy.max_payouts_per_day;
  push(
    'payout_frequency_count',
    countOk,
    countOk
      ? `${req.payout_count_today ?? 0} payouts today < max ${policy.max_payouts_per_day}`
      : `Max payouts per day (${policy.max_payouts_per_day}) already reached`,
    !countOk ? { d: 'BLOCK', code: 'MAX_DAILY_COUNT_EXCEEDED' } : undefined,
  );

  // 9. Min time between payouts
  const minsSince = req.minutes_since_last_payout ?? null;
  const intervalOk = minsSince === null || minsSince >= policy.min_minutes_between_payouts;
  push(
    'payout_frequency_interval',
    intervalOk,
    intervalOk
      ? minsSince === null ? 'No prior payout today' : `Last payout was ${minsSince} min ago (min: ${policy.min_minutes_between_payouts})`
      : `Last payout was only ${minsSince} min ago — minimum is ${policy.min_minutes_between_payouts} min`,
    !intervalOk ? { d: 'BLOCK', code: 'PAYOUT_FREQUENCY_TOO_HIGH' } : undefined,
  );

  // 10. Destination allowlist
  const destAllowlistActive = policy.allowed_destinations.length > 0;
  const destInAllowlist = !destAllowlistActive || !req.destination_id || policy.allowed_destinations.includes(req.destination_id);
  push(
    'destination_allowlist',
    destInAllowlist,
    destInAllowlist
      ? destAllowlistActive ? 'Destination is in allowlist' : 'No allowlist configured'
      : `Destination ${req.destination_id} is not in the allowed list`,
    !destInAllowlist ? { d: 'BLOCK', code: 'DESTINATION_NOT_ALLOWED' } : undefined,
  );

  // 11. New destination hold
  const newDestOk = !req.destination_is_new || policy.new_destination_hold_hours === 0;
  push(
    'new_destination_hold',
    newDestOk,
    newDestOk
      ? 'Destination is not new or hold is waived'
      : `New destination — ${policy.new_destination_hold_hours}h hold applies before automatic payout`,
    !newDestOk ? { d: 'REVIEW', code: 'NEW_DESTINATION_HOLD' } : undefined,
  );

  // 12. Time window
  const dayName = DAY_NAMES[now.getUTCDay()];
  const dayOk = policy.allowed_days.includes(dayName);
  push(
    'allowed_day',
    dayOk,
    dayOk ? `${dayName} is an allowed payout day` : `${dayName} is not an allowed payout day`,
    !dayOk ? { d: 'REVIEW', code: 'OUTSIDE_ALLOWED_DAY' } : undefined,
  );

  const nowMins = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMins = timeToMinutes(policy.allowed_time_start);
  const endMins = timeToMinutes(policy.allowed_time_end);
  const timeOk = nowMins >= startMins && nowMins <= endMins;
  push(
    'allowed_time_window',
    timeOk,
    timeOk
      ? `Current time is within payout window ${policy.allowed_time_start}–${policy.allowed_time_end}`
      : `Current time is outside payout window ${policy.allowed_time_start}–${policy.allowed_time_end}`,
    !timeOk ? { d: 'REVIEW', code: 'OUTSIDE_ALLOWED_TIME_WINDOW' } : undefined,
  );

  // 13. Risk level action
  const riskLevel = req.risk_level;
  if (riskLevel) {
    const riskAction = {
      LOW: policy.low_risk_action,
      MEDIUM: policy.medium_risk_action,
      HIGH: policy.high_risk_action,
      CRITICAL: policy.critical_risk_action,
    }[riskLevel];
    const riskOk = riskAction === 'ALLOW';
    push(
      'risk_level_action',
      riskOk,
      `Risk level ${riskLevel} → action: ${riskAction}`,
      !riskOk ? { d: riskAction as Decision, code: `RISK_LEVEL_${riskLevel}` } : undefined,
    );
  }

  // Determine final decision
  let finalDecision: Decision = 'ALLOW';
  let primaryViolation = violations[0] ?? null;
  for (const v of violations) {
    if (severityRank(v.decision) > severityRank(finalDecision)) {
      finalDecision = v.decision;
      primaryViolation = v;
    }
  }

  // Determine approval requirement
  let required_approval: 'ADMIN' | 'TWO_PERSON' | null = null;
  if (finalDecision === 'REVIEW' || finalDecision === 'ALLOW') {
    if (policy.two_person_approval_threshold !== null && req.amount >= policy.two_person_approval_threshold) {
      required_approval = 'TWO_PERSON';
    } else if (req.amount >= policy.approval_threshold_amount) {
      required_approval = 'ADMIN';
    }
  }

  return finalResult(
    finalDecision,
    primaryViolation?.reason ?? 'All checks passed',
    primaryViolation?.code ?? 'PASS',
    required_approval,
    checks,
    violations,
    req,
    policy,
  );
}

function finalResult(
  decision: Decision,
  reason: string,
  reason_code: string,
  required_approval: 'ADMIN' | 'TWO_PERSON' | null,
  checks: CheckResult[],
  violations: Array<{ decision: Decision; reason: string; code: string }>,
  req: PayoutRequest,
  policy: PayoutPolicy,
): GateResult {
  return {
    decision,
    reason,
    reason_code,
    matched_rule: violations[0]?.code ?? null,
    required_approval,
    evidence: {
      amount: req.amount,
      currency: req.currency,
      violations: violations.map((v) => v.code),
      policy_max: policy.max_payout_amount,
      policy_daily: policy.daily_limit,
    },
    checks,
  };
}
