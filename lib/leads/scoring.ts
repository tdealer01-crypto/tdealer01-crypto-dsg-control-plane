/**
 * Lead Scoring Service
 * Calculates ICP match and engagement scores
 */

import { getSupabaseAdmin } from '../supabase-server';

export interface LeadScore {
  leadId: string;
  icpScore: number;
  engagementScore: number;
  overallScore: number;
  reasoning: string;
}

/**
 * Calculate ICP (Ideal Customer Profile) score
 * Factors: company size, industry, seniority level, use case interest
 */
export function calculateICPScore(lead: {
  name?: string;
  company?: string;
  title?: string;
  bio?: string;
}): number {
  let score = 50; // Base score
  const reasoning: string[] = [];

  // Title-based scoring
  if (lead.title) {
    const seniorRoles = ['CTO', 'VP', 'Head of', 'Director', 'Chief', 'Principal'];
    const engRoles = ['Engineer', 'Developer', 'Tech Lead'];

    if (seniorRoles.some((role) => lead.title!.includes(role))) {
      score += 25;
      reasoning.push('Senior technical role');
    } else if (engRoles.some((role) => lead.title!.includes(role))) {
      score += 15;
      reasoning.push('Engineering background');
    }
  }

  // Company size inference (heuristic)
  if (lead.company) {
    // Assume smaller company names indicate smaller companies
    if (lead.company.length < 20) {
      score += 10;
      reasoning.push('Likely startup/SMB');
    }
  }

  // Bio/interest keywords
  if (lead.bio) {
    const bioLower = lead.bio.toLowerCase();
    const interestKeywords = [
      'ai',
      'agent',
      'automation',
      'api',
      'crypto',
      'blockchain',
      'bot',
      'orchestration',
      'workflow',
    ];

    const matchedKeywords = interestKeywords.filter((kw) =>
      bioLower.includes(kw)
    );

    score += Math.min(matchedKeywords.length * 5, 20);
    if (matchedKeywords.length > 0) {
      reasoning.push(`Interest in: ${matchedKeywords.join(', ')}`);
    }
  }

  return Math.min(100, score);
}

/**
 * Calculate engagement score based on recent activity
 */
export async function calculateEngagementScore(
  leadId: string
): Promise<number> {
  const supabase = getSupabaseAdmin() as any;

  // Get recent interactions
  const { data: interactions } = await supabase
    .from('lead_interactions')
    .select('interaction_type,created_at')
    .eq('lead_id', leadId)
    .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
    .order('created_at', { ascending: false });

  if (!interactions || interactions.length === 0) {
    return 0;
  }

  let score = 0;
  const now = Date.now();

  // Weight interactions by recency and type
  const weights: Record<string, number> = {
    link_clicked: 25,
    email_opened: 15,
    trial_signup: 50,
    demo_requested: 35,
    email_sent: 5,
  };

  for (const interaction of interactions) {
    const daysAgo = (now - new Date(interaction.created_at).getTime()) / (24 * 60 * 60 * 1000);
    const recencyFactor = Math.max(0, 1 - daysAgo / 7); // Decay over 7 days

    const baseWeight = weights[interaction.interaction_type] || 5;
    score += baseWeight * recencyFactor;
  }

  return Math.min(100, score);
}

/**
 * Score a single lead
 */
export async function scoreLead(
  leadId: string,
  lead?: {
    name?: string;
    company?: string;
    title?: string;
    bio?: string;
  }
): Promise<LeadScore> {
  // Calculate ICP score
  let icpScore = 50;
  const reasoning: string[] = [];

  if (lead) {
    icpScore = calculateICPScore(lead);
  } else {
    // Fetch from database if not provided
    const supabase = getSupabaseAdmin() as any;
    const { data } = await supabase
      .from('discovered_prospects')
      .select('name,company,title,bio')
      .eq('id', leadId)
      .maybeSingle();

    if (data) {
      icpScore = calculateICPScore(data);
    }
  }

  // Calculate engagement score
  const engagementScore = await calculateEngagementScore(leadId);

  // Overall score (60% ICP, 40% engagement)
  const overallScore = Math.round(icpScore * 0.6 + engagementScore * 0.4);

  return {
    leadId,
    icpScore,
    engagementScore,
    overallScore,
    reasoning: reasoning.join('; '),
  };
}

/**
 * Score all leads and update database
 */
export async function scoreAllLeads(): Promise<number> {
  const supabase = getSupabaseAdmin() as any;

  // Get all leads that need scoring
  const { data: leads } = await supabase
    .from('discovered_prospects')
    .select('id,name,company,title,bio');

  if (!leads || leads.length === 0) {
    return 0;
  }

  let updatedCount = 0;

  for (const lead of leads) {
    const score = await scoreLead(lead.id, lead);

    const { error } = await supabase
      .from('discovered_prospects')
      .update({
        icp_score: score.icpScore,
        engagement_score: score.engagementScore,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead.id);

    if (!error) {
      updatedCount++;
    }
  }

  return updatedCount;
}

/**
 * Get top leads by score
 */
export async function getTopLeads(
  limit: number = 10,
  minScore: number = 60
): Promise<Array<{
  id: string;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  overallScore: number;
  status: string;
}>> {
  const supabase = getSupabaseAdmin() as any;

  const { data } = await supabase
    .from('discovered_prospects')
    .select('id,name,email,company,title,overall_score,status')
    .gte('overall_score', minScore)
    .order('overall_score', { ascending: false })
    .limit(limit);

  return (data || []).map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    company: lead.company,
    title: lead.title,
    overallScore: lead.overall_score,
    status: lead.status,
  }));
}
