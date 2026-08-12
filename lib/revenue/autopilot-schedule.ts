export type RevenueAutopilotCadence =
  | 'ten-minute'
  | 'thirty-minute'
  | 'hourly'
  | 'daily'
  | 'weekday'
  | 'weekly';

export type RevenueAutopilotJob = {
  name: string;
  path: string;
  cadence: RevenueAutopilotCadence;
  hourUtc?: number;
  minuteUtc?: number;
  weekdayUtc?: number;
};

export type DueRevenueAutopilotJob = RevenueAutopilotJob & {
  bucket: string;
};

/**
 * Canonical automated-revenue schedule for the Render deployment.
 *
 * The GitHub Actions scheduler invokes the revenue-autopilot route every 10
 * minutes. Daily/weekly jobs become due on the first invocation at or after
 * their target time and are de-duplicated by (job,bucket) in Postgres. This
 * deliberately tolerates delayed GitHub scheduled-workflow starts.
 *
 * Cold outreach is included only because app/api/cron/lead-outreach obeys
 * MARKETING_OUTREACH_MODE. Production defaults to queue, so an agent may
 * discover and draft prospects while a human remains the send authority.
 */
export const REVENUE_AUTOPILOT_JOBS: readonly RevenueAutopilotJob[] = [
  { name: 'flush-meter-outbox', path: '/api/cron/flush-meter-outbox', cadence: 'ten-minute' },
  { name: 'send-pending-emails', path: '/api/cron/send-pending-emails', cadence: 'ten-minute' },
  { name: 'agent-health-check', path: '/api/cron/agent-health-check', cadence: 'thirty-minute' },
  { name: 'reconcile-meter', path: '/api/cron/reconcile-meter', cadence: 'hourly' },
  { name: 'cleanup-expired-leases', path: '/api/cron/cleanup-expired-leases', cadence: 'hourly' },

  { name: 'github-leads', path: '/api/cron/github-leads', cadence: 'daily', hourUtc: 6, minuteUtc: 0 },
  { name: 'marketing-agent', path: '/api/cron/marketing-agent', cadence: 'daily', hourUtc: 7, minuteUtc: 0 },
  { name: 'update-icp-scores', path: '/api/cron/update-icp-scores', cadence: 'daily', hourUtc: 8, minuteUtc: 30 },
  { name: 'lead-outreach', path: '/api/cron/lead-outreach', cadence: 'weekday', hourUtc: 9, minuteUtc: 0 },
  { name: 'lead-followup', path: '/api/cron/lead-followup', cadence: 'weekday', hourUtc: 10, minuteUtc: 0 },
  { name: 'usage-alerts', path: '/api/cron/usage-alerts', cadence: 'daily', hourUtc: 13, minuteUtc: 0 },
  { name: 'drip-emails', path: '/api/cron/drip-emails', cadence: 'daily', hourUtc: 14, minuteUtc: 0 },
  { name: 'smart-drip', path: '/api/cron/smart-drip', cadence: 'daily', hourUtc: 14, minuteUtc: 30 },
  { name: 'trial-invite', path: '/api/cron/trial-invite', cadence: 'daily', hourUtc: 15, minuteUtc: 0 },

  { name: 'content-gen', path: '/api/cron/content-gen', cadence: 'weekly', weekdayUtc: 1, hourUtc: 6, minuteUtc: 30 },
  { name: 'weekly-report', path: '/api/cron/weekly-report', cadence: 'weekly', weekdayUtc: 1, hourUtc: 16, minuteUtc: 0 },
] as const;

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function utcDateKey(now: Date): string {
  return `${now.getUTCFullYear()}-${pad2(now.getUTCMonth() + 1)}-${pad2(now.getUTCDate())}`;
}

function utcHourKey(now: Date): string {
  return `${utcDateKey(now)}T${pad2(now.getUTCHours())}`;
}

function reachedTarget(now: Date, hourUtc = 0, minuteUtc = 0): boolean {
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  return minutesNow >= hourUtc * 60 + minuteUtc;
}

export function revenueAutopilotBucket(job: RevenueAutopilotJob, now: Date): string | null {
  switch (job.cadence) {
    case 'ten-minute': {
      const minute = Math.floor(now.getUTCMinutes() / 10) * 10;
      return `${utcHourKey(now)}:${pad2(minute)}Z`;
    }
    case 'thirty-minute': {
      const minute = now.getUTCMinutes() < 30 ? 0 : 30;
      return `${utcHourKey(now)}:${pad2(minute)}Z`;
    }
    case 'hourly':
      return `${utcHourKey(now)}Z`;
    case 'daily':
      return reachedTarget(now, job.hourUtc, job.minuteUtc) ? utcDateKey(now) : null;
    case 'weekday': {
      const weekday = now.getUTCDay();
      if (weekday === 0 || weekday === 6) return null;
      return reachedTarget(now, job.hourUtc, job.minuteUtc) ? utcDateKey(now) : null;
    }
    case 'weekly': {
      if (now.getUTCDay() !== job.weekdayUtc) return null;
      return reachedTarget(now, job.hourUtc, job.minuteUtc) ? utcDateKey(now) : null;
    }
    default:
      return null;
  }
}

export function getDueRevenueAutopilotJobs(now = new Date()): DueRevenueAutopilotJob[] {
  return REVENUE_AUTOPILOT_JOBS.flatMap((job) => {
    const bucket = revenueAutopilotBucket(job, now);
    return bucket ? [{ ...job, bucket }] : [];
  });
}
