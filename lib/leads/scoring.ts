import { getSupabaseAdmin } from '../supabase-server';
import { onICPScoreUpdated } from '../emails/lead-integrations';

export type LeadProfile = {
  id: string;
  email: string;
  company?: string;
  job_title?: string;
  github_repo?: string;
  github_stars?: number;
  framework?: string;
  intent_score: number;
  source_platform: string;
};

export type ICPScore = {
  overall: number;
  company_fit: number;
  technical_fit: number;
  engagement_fit: number;
  conversion_readiness: number;
  recommendation: 'high_priority' | 'medium_priority' | 'low_priority' | 'skip';
};

// Sophisticated ICP scoring algorithm
export function calculateICPScore(lead: LeadProfile): ICPScore {
  const companyFit = scoreCompanyFit(lead);
  const technicalFit = scoreTechnicalFit(lead);
  const engagementFit = scoreEngagementFit(lead);
  const conversionReadiness = scoreConversionReadiness(lead);

  // Weighted average
  const overall = Math.round(
    companyFit * 0.25 + technicalFit * 0.35 + engagementFit * 0.25 + conversionReadiness * 0.15
  );

  const recommendation = getRecommendation(overall, companyFit, technicalFit);

  return {
    overall,
    company_fit: companyFit,
    technical_fit: technicalFit,
    engagement_fit: engagementFit,
    conversion_readiness: conversionReadiness,
    recommendation,
  };
}

// Score based on company characteristics
function scoreCompanyFit(lead: LeadProfile): number {
  let score = 0;

  if (!lead.company) {
    // Try to infer from email domain
    const domain = lead.email.split('@')[1];
    if (domain && !isPersonalDomain(domain)) {
      score += 30; // Corporate email
    } else {
      return 0; // No company indicator
    }
  } else {
    score += 40;
  }

  // Company size indicator from job title
  if (lead.job_title) {
    const title = lead.job_title.toLowerCase();
    if (title.includes('founder') || title.includes('cto') || title.includes('vp engineering')) {
      score += 35;
    } else if (title.includes('engineer') || title.includes('developer')) {
      score += 25;
    } else if (title.includes('manager') || title.includes('lead')) {
      score += 20;
    } else {
      score += 10;
    }
  }

  return Math.min(100, score);
}

// Score based on technical stack and alignment
function scoreTechnicalFit(lead: LeadProfile): number {
  let score = 0;

  // GitHub presence and repo quality
  if (lead.github_repo) {
    score += 20;

    if (lead.github_stars) {
      if (lead.github_stars > 5000) score += 30;
      else if (lead.github_stars > 1000) score += 25;
      else if (lead.github_stars > 100) score += 20;
      else score += 10;
    }
  }

  // Framework alignment (AI/automation frameworks indicate higher fit)
  if (lead.framework) {
    const aiFrameworks = ['langchain', 'anthropic', 'openai', 'crewai', 'llamaindex', 'autogpt'];
    if (aiFrameworks.includes(lead.framework.toLowerCase())) {
      score += 25;
    } else {
      score += 10;
    }
  }

  // Source platform technical weight
  if (lead.source_platform === 'github') {
    score += 15; // Technical practitioners
  } else if (lead.source_platform === 'twitter') {
    score += 8; // Some technical signals
  } else if (lead.source_platform === 'reddit') {
    score += 10; // Mixed technical audience
  }

  return Math.min(100, score);
}

// Score based on engagement patterns
function scoreEngagementFit(lead: LeadProfile): number {
  let score = 0;

  // Use intent_score as primary engagement signal
  score = lead.intent_score || 0;

  // Boost if actively searching/questioning (found via discovery)
  if (lead.source_platform === 'twitter' || lead.source_platform === 'reddit') {
    // These sources indicate active engagement
    score = Math.max(score, 40);
  }

  return Math.min(100, score);
}

// Score likelihood of conversion based on profile
function scoreConversionReadiness(lead: LeadProfile): number {
  let score = 0;

  // Recent activity (older leads may have moved on)
  // This would need to track lead discovery time, using intent_score as proxy
  if (lead.intent_score > 70) {
    score += 50;
  } else if (lead.intent_score > 50) {
    score += 35;
  } else {
    score += 15;
  }

  // Decision maker indicators
  if (lead.job_title) {
    const decisionMaker = lead.job_title.toLowerCase();
    if (['founder', 'ceo', 'cto', 'vp', 'manager', 'lead'].some((role) => decisionMaker.includes(role))) {
      score += 30;
    }
  }

  // Technical stack indicates real use case
  if (lead.github_repo && lead.github_stars && lead.github_stars > 100) {
    score += 20;
  }

  return Math.min(100, score);
}

// Get recommendation based on scores
function getRecommendation(
  overall: number,
  companyFit: number,
  technicalFit: number
): 'high_priority' | 'medium_priority' | 'low_priority' | 'skip' {
  if (overall >= 75 && companyFit >= 60 && technicalFit >= 70) {
    return 'high_priority';
  } else if (overall >= 60 && (companyFit >= 50 || technicalFit >= 60)) {
    return 'medium_priority';
  } else if (overall >= 40) {
    return 'low_priority';
  }
  return 'skip';
}

// Batch update ICP scores for leads
export async function updateLeadICPScores(limit: number = 100): Promise<{ updated: number; failed: number }> {
  const supabase = getSupabaseAdmin();

  // Fetch leads without ICP scores
  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id,email,company,job_title,github_repo,github_stars,framework,intent_score,source_platform,icp_score')
    .is('icp_score', null)
    .limit(limit);

  if (error) {
    console.error('[ICP Scoring] Query failed:', error);
    return { updated: 0, failed: 0 };
  }

  let updated = 0;
  let failed = 0;

  for (const lead of leads || []) {
    try {
      const icpScore = calculateICPScore({
        id: lead.id,
        email: lead.email,
        company: lead.company,
        job_title: lead.job_title,
        github_repo: lead.github_repo,
        github_stars: lead.github_stars,
        framework: lead.framework,
        intent_score: lead.intent_score || 0,
        source_platform: lead.source_platform || 'other',
      });

      const { error: updateErr } = await (supabase as any)
        .from('leads')
        .update({
          icp_score: icpScore.overall,
          engagement_score: icpScore.engagement_fit,
        })
        .eq('id', lead.id);

      if (!updateErr) {
        updated++;
        // Trigger email sequence if score crosses high-priority threshold (75+)
        await onICPScoreUpdated(
          { id: lead.id, email: lead.email, icp_score: icpScore.overall },
          lead.icp_score || null
        );
      } else {
        failed++;
      }
    } catch (err) {
      console.error(`[ICP Scoring] Error scoring lead ${lead.id}:`, err);
      failed++;
    }
  }

  return { updated, failed };
}

// Get high-priority leads ready for outreach
export async function getHighPriorityLeads(limit: number = 20): Promise<any[]> {
  const supabase = getSupabaseAdmin();

  const { data: leads, error } = await (supabase as any)
    .from('leads')
    .select('id,email,company,framework,github_repo,icp_score,intent_score')
    .gt('icp_score', 70)
    .eq('outreach_sent', false)
    .order('icp_score', { ascending: false })
    .order('intent_score', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Get High Priority] Query failed:', error);
    return [];
  }

  return leads || [];
}

// Helper to check if domain is personal/generic
function isPersonalDomain(domain: string): boolean {
  const personalDomains = [
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'protonmail.com',
    'aol.com',
    'mail.com',
    'icloud.com',
    'msn.com',
    'yandex.com',
    'qq.com',
    '163.com',
    'sina.com',
  ];

  return personalDomains.includes(domain.toLowerCase());
}
