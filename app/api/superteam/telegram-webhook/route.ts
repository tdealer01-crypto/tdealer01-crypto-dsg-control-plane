import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
    };
    chat?: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
  };
  channel_post?: {
    message_id: number;
    chat?: {
      id: number;
      title: string;
    };
    date: number;
    text?: string;
  };
}

interface ParsedListing {
  title: string;
  reward: number;
  rewardToken: string;
  category?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  deadline?: string;
  link?: string;
}

function parseBountyMessage(text: string): ParsedListing | null {
  if (!text) return null;

  // Parse Superteam listing format from Telegram
  // Example: "🎯 Smart Contract Audit\n💰 500 SOL\n⏰ Due: July 25"

  const titleMatch = text.match(/^[🎯📌📝]?\s*(.+?)(?:\n|$)/);
  const rewardMatch = text.match(/💰\s*(\d+)\s*(SOL|USDC|USD)/i);
  const difficultyMatch = text.match(/⭐\s*(easy|medium|hard|beginner|intermediate|advanced)/i);
  const deadlineMatch = text.match(/⏰\s*(?:Due:|Deadline:)?\s*(.+?)(?:\n|$)/i);
  const linkMatch = text.match(/(https?:\/\/[^\s]+)/);

  if (!titleMatch || !rewardMatch) {
    return null;
  }

  const title = titleMatch[1].trim();
  const reward = parseInt(rewardMatch[1]);
  const rewardToken = rewardMatch[2].toUpperCase();

  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    beginner: 'easy',
    easy: 'easy',
    intermediate: 'medium',
    medium: 'medium',
    advanced: 'hard',
    hard: 'hard',
  };

  return {
    title,
    reward,
    rewardToken,
    difficulty: difficultyMatch
      ? difficultyMap[difficultyMatch[1].toLowerCase()] || 'medium'
      : undefined,
    deadline: deadlineMatch ? deadlineMatch[1].trim() : undefined,
    link: linkMatch ? linkMatch[1] : undefined,
  };
}

async function autoSubmitToListing(
  agentId: string,
  listing: ParsedListing
): Promise<boolean> {
  try {
    // Get agent info
    let agent: any = null;

    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: dbAgent, error } = await supabase
        .from('dsg_agents')
        .select('api_key, name, claim_code')
        .eq('id', agentId)
        .single();

      if (error) {
        console.warn(`Agent lookup error: ${error.message}`);
      } else if (dbAgent) {
        agent = dbAgent;
      }
    } catch (e) {
      console.warn(`Supabase unavailable, checking memory store: ${String(e).slice(0, 100)}`);
    }

    if (!agent) {
      const memAgent = testMemoryStore.getAgent(agentId);
      if (memAgent) {
        agent = {
          api_key: memAgent.apiKey,
          name: memAgent.name,
          claim_code: memAgent.claimCode,
        };
      }
    }

    if (!agent) {
      console.error(`Agent ${agentId} not found`);
      return false;
    }

    // Auto-generate submission for this listing
    const submissionId = `telegram-${agentId}-${Date.now()}`;
    const listingId = `telegram-${listing.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}`;

    // Store auto-submission
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase.from('agent_submissions').insert({
        id: submissionId,
        agent_id: agentId,
        listing_id: listingId,
        listing_title: listing.title,
        link: listing.link || `https://superteam.fun/earn/${listingId}`,
        other_info: `Auto-submitted from Telegram. Reward: ${listing.reward} ${listing.rewardToken}. Difficulty: ${listing.difficulty || 'unknown'}`,
        status: 'submitted',
        telegram: 'telegram_auto_submit',
        ask: Math.floor(listing.reward * 0.8), // Ask 80% of listed reward
        submitted_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Insert error: ${error.message}`);
      }

      console.log(`✅ Auto-submission created: ${submissionId}`);
      return true;
    } catch (dbError) {
      console.warn(`Supabase unavailable, using memory store: ${String(dbError).slice(0, 100)}`);
      testMemoryStore.addSubmission({
        id: submissionId,
        agentId,
        listingId,
        link: listing.link || `https://superteam.fun/earn/${listingId}`,
        otherInfo: `Auto: ${listing.title} - ${listing.reward} ${listing.rewardToken}`,
        createdAt: Date.now(),
      });
      return true;
    }
  } catch (error) {
    console.error('Auto-submission failed:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as TelegramUpdate;

    // Verify webhook secret (optional but recommended)
    const secretFromHeader = request.headers.get('x-telegram-bot-api-secret-token');
    const secretFromEnv = process.env.TELEGRAM_BOT_SECRET;

    if (secretFromEnv && secretFromHeader !== secretFromEnv) {
      console.warn('Invalid Telegram webhook secret');
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    // Extract message text
    const messageText = body.message?.text || body.channel_post?.text;
    const chatId = body.message?.chat?.id || body.channel_post?.chat?.id;

    if (!messageText || !chatId) {
      return NextResponse.json({ ok: true }); // Silently ignore
    }

    console.log(`📨 Telegram message from chat ${chatId}:`, messageText.slice(0, 100));

    // Parse bounty from message
    const listing = parseBountyMessage(messageText);

    if (!listing) {
      console.log('ℹ️  Message does not contain bounty listing');
      return NextResponse.json({ ok: true });
    }

    console.log('🎯 Parsed listing:', listing);

    // Get all active agents
    let agents: any[] = [];

    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: dbAgents, error } = await supabase
        .from('dsg_agents')
        .select('id, name, status')
        .eq('status', 'active')
        .limit(10);

      if (error) {
        console.warn(`Agent list fetch error: ${error.message}`);
      } else if (dbAgents) {
        agents = dbAgents;
      }
    } catch (e) {
      console.warn(`Supabase unavailable, checking memory store: ${String(e).slice(0, 100)}`);
    }

    // Fallback: get agents from memory store
    if (agents.length === 0) {
      console.log('📍 No active agents in DB, checking memory store');
      // Memory store doesn't track all agents, so we'll note this
      console.warn(
        'No active agents found. Agents need to be registered first.'
      );
    }

    // Auto-submit for each active agent (if reward is good enough)
    let submittedCount = 0;
    const minRewardThreshold = 100; // Only submit if >= 100 SOL

    if (listing.reward >= minRewardThreshold) {
      for (const agent of agents) {
        const submitted = await autoSubmitToListing(agent.id, listing);
        if (submitted) {
          submittedCount++;
        }
      }
    } else {
      console.log(
        `⏭️  Reward ${listing.reward} ${listing.rewardToken} below threshold (${minRewardThreshold})`
      );
    }

    console.log(`✅ Auto-submitted to ${submittedCount} agents`);

    // Log webhook activity
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase.from('agent_discovery_log').insert({
        id: `telegram-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        agent_id: 'telegram-bot',
        listing_id: `telegram-${Date.now()}`,
        listing_title: listing.title,
        listing_type: 'bounty',
        reward: listing.reward,
        discovered_at: new Date().toISOString(),
      });

      if (error) {
        console.warn(`Discovery log insert error: ${error.message}`);
      }
    } catch (e) {
      console.warn(`Could not log telegram activity: ${String(e).slice(0, 100)}`);
    }

    return NextResponse.json({
      ok: true,
      message: 'Webhook processed',
      listing: listing.title,
      submitted: submittedCount,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}

// GET for webhook verification
export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    service: 'Superteam Telegram Webhook',
    status: 'ready',
    endpoint: '/api/superteam/telegram-webhook',
    features: ['parse-bounties', 'auto-submit', 'agent-tracking'],
  });
}
