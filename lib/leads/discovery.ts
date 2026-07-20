import { getSupabaseAdmin } from '../supabase-server';
import { onLeadDiscovered } from '../emails/lead-integrations';

export type DiscoveryLead = {
  email: string;
  source: string;
  source_platform: 'github' | 'twitter' | 'reddit';
  github_repo?: string;
  github_stars?: number;
  framework?: string;
  company?: string;
  intent_score: number;
};

// GitHub lead discovery (existing pattern)
export async function discoverGitHubLeads(): Promise<DiscoveryLead[]> {
  if (!process.env.GITHUB_API_KEY) {
    console.log('[GitHub Lead Discovery] GITHUB_API_KEY not configured, skipping');
    return [];
  }

  try {
    const headers = {
      Authorization: `token ${process.env.GITHUB_API_KEY}`,
      Accept: 'application/vnd.github.v3+json',
    };

    // Search for top projects using AI/automation related frameworks
    const queries = [
      'language:python stars:>100 topic:ai-agents',
      'language:typescript stars:>100 topic:automation',
      'language:javascript stars:>100 topic:langchain',
      'language:rust stars:>50 topic:ai-runtime',
    ];

    const allLeads: DiscoveryLead[] = [];

    for (const query of queries) {
      const response = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=30`,
        { headers }
      );

      if (!response.ok) continue;

      const data = (await response.json()) as any;
      const repos = data.items || [];

      for (const repo of repos.slice(0, 10)) {
        if (repo.owner?.email) {
          allLeads.push({
            email: repo.owner.email,
            source: 'github-signal',
            source_platform: 'github',
            github_repo: repo.full_name,
            github_stars: repo.stargazers_count,
            framework: inferFramework(repo),
            intent_score: calculateGitHubIntentScore(repo),
          });
        }
      }
    }

    return allLeads;
  } catch (err) {
    console.error('[GitHub Lead Discovery] Error:', err);
    return [];
  }
}

// Twitter lead discovery - searches for posts/discussions about AI automation
export async function discoverTwitterLeads(): Promise<DiscoveryLead[]> {
  if (!process.env.TWITTER_BEARER_TOKEN) {
    console.log('[Twitter Lead Discovery] TWITTER_BEARER_TOKEN not configured, skipping');
    return [];
  }

  try {
    const headers = {
      Authorization: `Bearer ${process.env.TWITTER_BEARER_TOKEN}`,
    };

    // Search for tweets about AI automation, agents, and related topics
    const keywords = [
      'AI agents automation',
      'LLM orchestration',
      'AI workflow automation',
      'agent framework',
    ];

    const allLeads: DiscoveryLead[] = [];

    for (const keyword of keywords) {
      const response = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(keyword + ' -is:retweet')}&max_results=100&tweet.fields=public_metrics,created_at&user.fields=email,username,verified`,
        { headers }
      );

      if (!response.ok) {
        console.log(`[Twitter Lead Discovery] API error for keyword "${keyword}":`, response.status);
        continue;
      }

      const data = (await response.json()) as any;
      const tweets = data.data || [];
      const includes = data.includes || {};
      const usersMap = new Map((includes.users || []).map((u: any) => [u.id, u]));

      for (const tweet of tweets) {
        const author = usersMap.get(tweet.author_id) as any;
        if (author && author.email) {
          const intentScore = calculateTwitterIntentScore(tweet);

          allLeads.push({
            email: author.email,
            source: 'twitter-signal',
            source_platform: 'twitter',
            framework: inferFrameworkFromText(tweet.text),
            intent_score: intentScore,
          });
        }
      }
    }

    return allLeads;
  } catch (err) {
    console.error('[Twitter Lead Discovery] Error:', err);
    return [];
  }
}

// Reddit lead discovery - searches for discussions in relevant subreddits
export async function discoverRedditLeads(): Promise<DiscoveryLead[]> {
  if (!process.env.REDDIT_CLIENT_ID || !process.env.REDDIT_CLIENT_SECRET || !process.env.REDDIT_USER_AGENT) {
    console.log('[Reddit Lead Discovery] Reddit credentials not configured, skipping');
    return [];
  }

  try {
    // Get Reddit OAuth token
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'User-Agent': process.env.REDDIT_USER_AGENT,
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.REDDIT_CLIENT_ID,
        client_secret: process.env.REDDIT_CLIENT_SECRET,
      }),
    });

    if (!authResponse.ok) {
      console.error('[Reddit Lead Discovery] Auth failed:', authResponse.status);
      return [];
    }

    const auth = (await authResponse.json()) as any;
    const accessToken = auth.access_token;

    const headers = {
      'User-Agent': process.env.REDDIT_USER_AGENT,
      Authorization: `Bearer ${accessToken}`,
    };

    // Search relevant subreddits
    const subreddits = ['r/MachineLearning', 'r/OpenAI', 'r/Anthropic', 'r/LanguageModels', 'r/agents'];
    const allLeads: DiscoveryLead[] = [];

    for (const subreddit of subreddits) {
      const response = await fetch(
        `https://oauth.reddit.com/${subreddit}/top?t=week&limit=50`,
        { headers }
      );

      if (!response.ok) continue;

      const data = (await response.json()) as any;
      const posts = data.data?.children || [];

      for (const post of posts) {
        const author = post.data?.author;
        const text = post.data?.selftext || post.data?.title || '';

        // Extract email from post if available (some posts include contact info)
        const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
        if (emailMatch) {
          const intentScore = calculateRedditIntentScore(post.data);

          allLeads.push({
            email: emailMatch[0],
            source: 'reddit-signal',
            source_platform: 'reddit',
            framework: inferFrameworkFromText(text),
            intent_score: intentScore,
          });
        }
      }
    }

    return allLeads;
  } catch (err) {
    console.error('[Reddit Lead Discovery] Error:', err);
    return [];
  }
}

// Save discovered leads to database
export async function saveDiscoveredLeads(leads: DiscoveryLead[]): Promise<{ saved: number; skipped: number }> {
  const supabase = getSupabaseAdmin();
  let saved = 0;
  let skipped = 0;

  for (const lead of leads) {
    const { data: upsertResult, error } = await (supabase as any)
      .from('leads')
      .upsert(
        {
          email: lead.email,
          source: lead.source,
          source_platform: lead.source_platform,
          github_repo: lead.github_repo,
          github_stars: lead.github_stars,
          framework: lead.framework,
          company: lead.company,
          intent_score: lead.intent_score,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: 'email,source,coalesce(github_repo, \'\')' }
      )
      .select('id');

    if (error) {
      console.error(`[Save Lead] Error saving ${lead.email}:`, error);
      skipped++;
    } else {
      saved++;
      // Trigger email sequence for newly discovered lead
      if (upsertResult && upsertResult.length > 0) {
        await onLeadDiscovered({
          id: upsertResult[0].id,
          email: lead.email,
          source_platform: lead.source_platform,
        });
      }
    }
  }

  return { saved, skipped };
}

// Scoring helpers
function calculateGitHubIntentScore(repo: any): number {
  let score = 0;

  // Star count indicates popularity/maturity
  if (repo.stargazers_count > 1000) score += 30;
  else if (repo.stargazers_count > 500) score += 25;
  else if (repo.stargazers_count > 100) score += 20;
  else score += 10;

  // Recent activity indicates active maintenance
  const lastUpdate = new Date(repo.updated_at);
  const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceUpdate < 30) score += 25;
  else if (daysSinceUpdate < 90) score += 15;
  else if (daysSinceUpdate < 180) score += 5;

  // Language and topic alignment
  const language = repo.language?.toLowerCase() || '';
  if (['typescript', 'python', 'rust'].includes(language)) score += 15;

  return Math.min(100, score);
}

function calculateTwitterIntentScore(tweet: any): number {
  let score = 0;

  // Engagement metrics
  const engagement = (tweet.public_metrics?.like_count || 0) + (tweet.public_metrics?.reply_count || 0);
  if (engagement > 100) score += 25;
  else if (engagement > 50) score += 20;
  else if (engagement > 10) score += 15;
  else score += 5;

  // Text signals
  const text = (tweet.text || '').toLowerCase();
  const signals = ['looking for', 'need', 'want', 'evaluate', 'tool', 'automation', 'workflow'];
  const matchingSignals = signals.filter((s) => text.includes(s)).length;
  score += matchingSignals * 10;

  return Math.min(100, score);
}

function calculateRedditIntentScore(post: any): number {
  let score = 0;

  // Score based on upvotes and comments
  const engagement = (post.ups || 0) + (post.num_comments || 0);
  if (engagement > 100) score += 25;
  else if (engagement > 50) score += 20;
  else if (engagement > 10) score += 15;
  else score += 5;

  // Post type (self-posts are usually questions/discussions)
  if (post.is_self) score += 15;

  // Text signals
  const text = ((post.title || '') + ' ' + (post.selftext || '')).toLowerCase();
  const signals = ['help', 'question', 'need', 'looking for', 'evaluate', 'recommend', 'best'];
  const matchingSignals = signals.filter((s) => text.includes(s)).length;
  score += matchingSignals * 10;

  return Math.min(100, score);
}

function inferFramework(repo: any): string {
  const keywords: Record<string, string> = {
    langchain: 'langchain',
    openai: 'openai',
    huggingface: 'huggingface',
    anthropic: 'anthropic',
    llamaindex: 'llamaindex',
    autogpt: 'autogpt',
    crewai: 'crewai',
  };

  const text = (repo.topics || []).join(' ').toLowerCase() + ' ' + (repo.description || '').toLowerCase();
  for (const [key, value] of Object.entries(keywords)) {
    if (text.includes(key)) return value;
  }

  return 'other';
}

function inferFrameworkFromText(text: string): string {
  const keywords: Record<string, string> = {
    langchain: 'langchain',
    openai: 'openai',
    huggingface: 'huggingface',
    anthropic: 'anthropic',
    llamaindex: 'llamaindex',
    autogpt: 'autogpt',
    crewai: 'crewai',
  };

  const lower = text.toLowerCase();
  for (const [key, value] of Object.entries(keywords)) {
    if (lower.includes(key)) return value;
  }

  return 'other';
}
