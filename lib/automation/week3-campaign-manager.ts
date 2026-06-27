/**
 * Week 3-4 Customer Acquisition Automation
 * Manages ProductHunt launch, email campaign, and lead scoring
 *
 * Timeline:
 * - June 10, 00:00 UTC: ProductHunt submission + Twitter
 * - June 10, 12:00 UTC: Email 1 (cold outreach - 20 companies)
 * - June 12: Email 2 (demo video)
 * - June 14: Email 3 (interview offer)
 * - June 18: Email 4 (pricing clarity)
 * - June 21: Email 5 (limited offer)
 */

export interface CampaignConfig {
  launchDate: Date;
  producthuntUrl?: string;
  twitterThreadUrl?: string;
  targetCompanies: number;
  emailSequence: EmailCampaign[];
  metrics: CampaignMetrics;
}

export interface EmailCampaign {
  day: number;
  hour: number;
  subject: string;
  templateId: string;
  batchSize: number;
  retryEnabled: boolean;
}

export interface CampaignMetrics {
  producthuntUpvotes: number;
  emailsScheduled: number;
  emailsDelivered: number;
  emailsOpened: number;
  clickThroughRate: number;
  conversionRate: number;
  pilotContractsSignd: number;
  totalMRR: number;
}

export interface LeadScore {
  companyName: string;
  email: string;
  score: number;
  engagementLevel: 'high' | 'medium' | 'low' | 'cold';
  lastContact: Date;
  nextFollowUp: Date;
  status: 'new' | 'contacted' | 'engaged' | 'pilot' | 'customer';
}

/**
 * Initialize Week 3-4 campaign configuration
 */
export function initializeCampaign(): CampaignConfig {
  const launchDate = new Date('2026-06-10T00:00:00Z');

  return {
    launchDate,
    producthuntUrl: 'https://www.producthunt.com/posts/dsg-one',
    twitterThreadUrl: 'https://twitter.com/dsg_platform/status/...',
    targetCompanies: 20,
    emailSequence: [
      {
        day: 0,
        hour: 12,
        subject: 'DSG ONE: AI Governance Made Simple',
        templateId: 'email-intro-week3',
        batchSize: 20,
        retryEnabled: true,
      },
      {
        day: 2,
        hour: 9,
        subject: 'See DSG ONE in Action (2-min demo)',
        templateId: 'email-demo-week3',
        batchSize: 20,
        retryEnabled: true,
      },
      {
        day: 4,
        hour: 10,
        subject: 'Let\'s chat about AI governance for your team',
        templateId: 'email-interview-week3',
        batchSize: 20,
        retryEnabled: true,
      },
      {
        day: 8,
        hour: 14,
        subject: 'DSG ONE Pricing: Start with what you need',
        templateId: 'email-pricing-week3',
        batchSize: 20,
        retryEnabled: true,
      },
      {
        day: 11,
        hour: 15,
        subject: '⏰ Limited Launch Offer: 3 Months Free (Ends June 30)',
        templateId: 'email-offer-week3',
        batchSize: 20,
        retryEnabled: true,
      },
    ],
    metrics: {
      producthuntUpvotes: 0,
      emailsScheduled: 0,
      emailsDelivered: 0,
      emailsOpened: 0,
      clickThroughRate: 0,
      conversionRate: 0,
      pilotContractsSignd: 0,
      totalMRR: 0,
    },
  };
}

/**
 * Calculate lead engagement score based on interactions
 */
export function calculateLeadScore(
  interactions: {
    emailOpened?: boolean;
    linkClicked?: boolean;
    productHuntUpvote?: boolean;
    demoRequested?: boolean;
    interviewScheduled?: boolean;
  },
  daysSinceContact: number
): number {
  let score = 0;

  // Email engagement
  if (interactions.emailOpened) score += 10;
  if (interactions.linkClicked) score += 25;

  // ProductHunt engagement
  if (interactions.productHuntUpvote) score += 20;

  // Active interest signals
  if (interactions.demoRequested) score += 50;
  if (interactions.interviewScheduled) score += 75;

  // Time decay: reduce score if no recent engagement
  const decayFactor = Math.max(0.5, 1 - daysSinceContact / 30);
  score *= decayFactor;

  return Math.round(score);
}

/**
 * Determine engagement level from lead score
 */
export function getEngagementLevel(
  score: number
): 'high' | 'medium' | 'low' | 'cold' {
  if (score >= 75) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 10) return 'low';
  return 'cold';
}

/**
 * Schedule next follow-up based on engagement level
 */
export function scheduleNextFollowUp(
  engagementLevel: 'high' | 'medium' | 'low' | 'cold',
  lastContact: Date
): Date {
  const daysUntilFollowUp = {
    high: 2,
    medium: 5,
    low: 7,
    cold: 14,
  };

  const nextDate = new Date(lastContact);
  nextDate.setDate(nextDate.getDate() + daysUntilFollowUp[engagementLevel]);
  return nextDate;
}

/**
 * Export campaign progress for monitoring
 */
export function exportCampaignMetrics(config: CampaignConfig): string {
  const elapsed = Math.floor(
    (Date.now() - config.launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return `
## 🚀 Week 3-4 Campaign Progress (Day ${elapsed})

### ProductHunt Launch
- Upvotes: ${config.metrics.producthuntUpvotes}
- Target: 100+ by Day 1
- URL: ${config.producthuntUrl}

### Email Campaign (5-Email Sequence)
- Scheduled: ${config.metrics.emailsScheduled}/${config.emailSequence.length * config.targetCompanies}
- Delivered: ${config.metrics.emailsDelivered}
- Open Rate: ${((config.metrics.emailsOpened / config.metrics.emailsDelivered) * 100).toFixed(1)}%
- CTR: ${config.metrics.clickThroughRate.toFixed(1)}%

### Business Results
- Pilot Contracts: ${config.metrics.pilotContractsSignd}/3
- Monthly Recurring Revenue (MRR): $${config.metrics.totalMRR.toLocaleString()}
- Conversion Rate: ${config.metrics.conversionRate.toFixed(1)}%

### Next Actions
${getNexEmailActions(config)}
`;
}

function getNexEmailActions(config: CampaignConfig): string {
  const now = new Date();
  const daysSinceLaunch = Math.floor(
    (now.getTime() - config.launchDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return config.emailSequence
    .map((email) => {
      if (daysSinceLaunch >= email.day) {
        return `✅ Email ${email.day}: Sent`;
      }
      const daysUntil = email.day - daysSinceLaunch;
      return `⏳ Email ${email.day}: In ${daysUntil} days (${new Date(
        config.launchDate.getTime() + email.day * 24 * 60 * 60 * 1000 + email.hour * 60 * 60 * 1000
      ).toUTCString()})`;
    })
    .join('\n');
}
