import { describe, expect, it } from 'vitest';
import {
  getDueRevenueAutopilotJobs,
  revenueAutopilotBucket,
  type RevenueAutopilotJob,
} from '@/lib/revenue/autopilot-schedule';

function job(input: RevenueAutopilotJob): RevenueAutopilotJob {
  return input;
}

describe('revenue autopilot schedule', () => {
  it('creates deterministic ten-minute buckets', () => {
    const now = new Date('2026-08-13T03:29:59.000Z');
    expect(revenueAutopilotBucket(job({
      name: 'flush',
      path: '/flush',
      cadence: 'ten-minute',
    }), now)).toBe('2026-08-13T03:20Z');
  });

  it('holds a daily job before target and releases it after target', () => {
    const daily = job({
      name: 'usage-alerts',
      path: '/usage-alerts',
      cadence: 'daily',
      hourUtc: 13,
      minuteUtc: 0,
    });
    expect(revenueAutopilotBucket(daily, new Date('2026-08-13T12:59:59Z'))).toBeNull();
    expect(revenueAutopilotBucket(daily, new Date('2026-08-13T13:07:00Z'))).toBe('2026-08-13');
  });

  it('runs weekday outreach Monday-Friday only', () => {
    const outreach = job({
      name: 'lead-outreach',
      path: '/lead-outreach',
      cadence: 'weekday',
      hourUtc: 9,
      minuteUtc: 0,
    });
    expect(revenueAutopilotBucket(outreach, new Date('2026-08-14T09:05:00Z'))).toBe('2026-08-14');
    expect(revenueAutopilotBucket(outreach, new Date('2026-08-15T09:05:00Z'))).toBeNull();
    expect(revenueAutopilotBucket(outreach, new Date('2026-08-16T09:05:00Z'))).toBeNull();
  });

  it('runs weekly jobs only on the configured UTC weekday after target', () => {
    const weekly = job({
      name: 'weekly-report',
      path: '/weekly-report',
      cadence: 'weekly',
      weekdayUtc: 1,
      hourUtc: 16,
      minuteUtc: 0,
    });
    expect(revenueAutopilotBucket(weekly, new Date('2026-08-17T15:59:00Z'))).toBeNull();
    expect(revenueAutopilotBucket(weekly, new Date('2026-08-17T16:10:00Z'))).toBe('2026-08-17');
    expect(revenueAutopilotBucket(weekly, new Date('2026-08-18T16:10:00Z'))).toBeNull();
  });

  it('never schedules the legacy double-bill billing-sync route', () => {
    const due = getDueRevenueAutopilotJobs(new Date('2026-08-17T16:10:00Z'));
    expect(due.some((entry) => entry.name === 'billing-sync')).toBe(false);
    expect(due.some((entry) => entry.name === 'smart-drip')).toBe(false);
  });
});
