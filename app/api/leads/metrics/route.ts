// Lead metrics — returns conversion funnel, metrics, and live lead distributions.

import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase/server';
import { getConversionMetrics, getConversionFunnel, getHighConversionPotential } from '../../../../lib/leads/conversion-tracking';
import { getHighPriorityLeads } from '../../../../lib/leads/scoring';
import { handleApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

type LeadDistributionRow = {
  icp_score: number | null;
  source_platform: string | null;
};

async function loadLeadDistributionRows(supabase: any): Promise<LeadDistributionRow[]> {
  const rows: LeadDistributionRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('leads')
      .select('icp_score,source_platform')
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as LeadDistributionRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function buildICPDistribution(rows: LeadDistributionRow[]) {
  const buckets = [
    { range: '0-20', min: 0, max: 20, count: 0 },
    { range: '21-40', min: 21, max: 40, count: 0 },
    { range: '41-60', min: 41, max: 60, count: 0 },
    { range: '61-80', min: 61, max: 80, count: 0 },
    { range: '81-100', min: 81, max: 100, count: 0 },
  ];

  const scored = rows.filter((row) => Number.isFinite(row.icp_score));
  for (const row of scored) {
    const score = Number(row.icp_score);
    const bucket = buckets.find((item) => score >= item.min && score <= item.max);
    if (bucket) bucket.count += 1;
  }

  return buckets.map(({ range, count }) => ({
    range,
    count,
    percentage: scored.length > 0 ? Math.round((count / scored.length) * 1000) / 10 : 0,
  }));
}

function buildPlatformDistribution(rows: LeadDistributionRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const platform = row.source_platform?.trim();
    if (!platform) continue;
    counts.set(platform, (counts.get(platform) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();

    if (!auth?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const founderEmail = process.env.FOUNDER_EMAIL;
    if (founderEmail && auth.user.email !== founderEmail) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get('days') || '30', 10);

    const [
      conversionMetrics,
      conversionFunnel,
      highPriorityLeads,
      highConversionPotential,
      distributionRows,
    ] = await Promise.all([
      getConversionMetrics(),
      getConversionFunnel(daysBack),
      getHighPriorityLeads(20),
      getHighConversionPotential(20),
      loadLeadDistributionRows(supabase),
    ]);

    return NextResponse.json({
      ok: true,
      metrics: conversionMetrics,
      funnel: conversionFunnel,
      high_priority_leads: highPriorityLeads,
      high_conversion_potential: highConversionPotential,
      icp_distribution: buildICPDistribution(distributionRows),
      platform_distribution: buildPlatformDistribution(distributionRows),
      distribution_row_count: distributionRows.length,
      period_days: daysBack,
    });
  } catch (err) {
    return handleApiError(err, { status: 500 });
  }
}
