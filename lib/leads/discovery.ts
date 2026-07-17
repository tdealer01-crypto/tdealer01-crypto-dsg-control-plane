/**
 * Lead Discovery Service
 * Discovers potential customers from GitHub, Twitter, LinkedIn
 */

import { getSupabaseAdmin } from '../supabase-server';

export type LeadSource = 'github' | 'twitter' | 'linkedin';

export interface DiscoveredLead {
  source: LeadSource;
  source_id: string;
  name: string;
  email?: string;
  company?: string;
  title?: string;
  avatar_url?: string;
  bio?: string;
}

/**
 * Discover leads from GitHub
 * Targets users in trending AI/crypto repositories
 */
export async function discoverLeadsFromGitHub(): Promise<DiscoveredLead[]> {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    console.warn('GITHUB_TOKEN not configured');
    return [];
  }

  try {
    // Search for users in trending AI agent repositories
    const keywords = [
      'AI agents',
      'automation framework',
      'agent orchestration',
      'LLM tools',
    ];

    const leads: DiscoveredLead[] = [];

    for (const keyword of keywords) {
      // Get top repositories matching keyword
      const reposResponse = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(keyword)}&sort=stars&per_page=5`,
        {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        }
      );

      if (!reposResponse.ok) continue;

      const { items: repos } = (await reposResponse.json()) as {
        items: Array<{ owner: { login: string } }>;
      };

      // Get contributors from each repo
      for (const repo of repos) {
        const contributorsResponse = await fetch(
          `https://api.github.com/repos/${repo.owner.login}/${repo.owner.login}/contributors?per_page=10`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              'X-GitHub-Api-Version': '2022-11-28',
            },
          }
        );

        if (!contributorsResponse.ok) continue;

        const contributors = (await contributorsResponse.json()) as Array<{
          login: string;
          avatar_url: string;
        }>;

        // Get detailed user info
        for (const contributor of contributors.slice(0, 3)) {
          const userResponse = await fetch(
            `https://api.github.com/users/${contributor.login}`,
            {
              headers: {
                Authorization: `Bearer ${githubToken}`,
                'X-GitHub-Api-Version': '2022-11-28',
              },
            }
          );

          if (!userResponse.ok) continue;

          const user = (await userResponse.json()) as {
            login: string;
            name?: string;
            email?: string;
            company?: string;
            bio?: string;
            avatar_url: string;
            followers: number;
          };

          // Only include users with some following (indicating active contributor)
          if (user.followers < 5) continue;

          leads.push({
            source: 'github',
            source_id: user.login,
            name: user.name || user.login,
            email: user.email,
            company: user.company,
            title: 'Developer', // Default title for GitHub users
            avatar_url: user.avatar_url,
            bio: user.bio,
          });
        }
      }
    }

    return leads;
  } catch (error) {
    console.error('GitHub discovery error:', error);
    return [];
  }
}

/**
 * Discover leads from Twitter (using search keywords)
 */
export async function discoverLeadsFromTwitter(): Promise<DiscoveredLead[]> {
  const twitterToken = process.env.TWITTER_BEARER_TOKEN;
  if (!twitterToken) {
    console.warn('TWITTER_BEARER_TOKEN not configured');
    return [];
  }

  try {
    const keywords = [
      'AI agents',
      'agent automation',
      'LLM applications',
      'crypto automation',
    ];

    const leads: DiscoveredLead[] = [];

    for (const keyword of keywords) {
      // Search for tweets about keyword from last 7 days
      const searchResponse = await fetch(
        `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(keyword + ' -is:retweet')}&max_results=100&user.fields=username,created_at,public_metrics&expansions=author_id`,
        {
          headers: {
            Authorization: `Bearer ${twitterToken}`,
          },
        }
      );

      if (!searchResponse.ok) continue;

      const data = (await searchResponse.json()) as {
        data?: Array<{ author_id: string }>;
        includes?: { users: Array<{ id: string; name: string; username: string }> };
      };

      if (!data.data || !data.includes) continue;

      // Get unique authors
      const authorIds = [...new Set(data.data.map((t) => t.author_id))].slice(0, 10);

      for (const authorId of authorIds) {
        const user = data.includes.users.find((u) => u.id === authorId);
        if (!user) continue;

        leads.push({
          source: 'twitter',
          source_id: user.username,
          name: user.name,
          bio: user.name, // Twitter doesn't expose bio in this endpoint
        });
      }
    }

    return leads;
  } catch (error) {
    console.error('Twitter discovery error:', error);
    return [];
  }
}

/**
 * Save discovered leads to database
 */
export async function saveLeads(leads: DiscoveredLead[]): Promise<number> {
  const supabase = getSupabaseAdmin() as any;

  let savedCount = 0;

  for (const lead of leads) {
    const { error } = await supabase.from('discovered_prospects').upsert(
      {
        source: lead.source,
        source_id: lead.source_id,
        name: lead.name,
        email: lead.email,
        company: lead.company,
        title: lead.title,
        avatar_url: lead.avatar_url,
        bio: lead.bio,
        status: 'discovered',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'source,source_id' }
    );

    if (!error) {
      savedCount++;
    } else {
      console.error(`Failed to save lead ${lead.source_id}:`, error);
    }
  }

  return savedCount;
}

/**
 * Run full discovery pipeline
 */
export async function runLeadDiscovery(): Promise<{ discovered: number; saved: number }> {
  console.log('Starting lead discovery...');

  const [githubLeads, twitterLeads] = await Promise.all([
    discoverLeadsFromGitHub(),
    discoverLeadsFromTwitter(),
  ]);

  const allLeads = [...githubLeads, ...twitterLeads];
  console.log(`Discovered ${allLeads.length} potential leads`);

  const saved = await saveLeads(allLeads);
  console.log(`Saved ${saved} new leads to database`);

  return { discovered: allLeads.length, saved };
}
