import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SuperteamAgentClient, Submission } from '@/lib/superteam/agent-client';
import { TelegramSubmitter } from '@/lib/superteam/telegram-submitter';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

interface SubmitRequest {
  agentId: string;
  listingId: string;
  link: string;
  otherInfo: string;
  telegram?: string;
  ask?: number;
  eligibilityAnswers?: Array<{ question: string; answer: string }>;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitRequest;
    const {
      agentId,
      listingId,
      link,
      otherInfo,
      telegram,
      ask,
      eligibilityAnswers,
    } = body;

    let claimCode: string | null = null;

    if (!agentId || !listingId || !link || !otherInfo) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get agent from Supabase or memory store
    let agent: any = null;

    // Prefer real SUPERTEAM_API_KEY if available
    if (process.env.SUPERTEAM_API_KEY) {
      agent = {
        api_key: process.env.SUPERTEAM_API_KEY,
        name: 'superteam-agent-live',
        claim_code: 'LIVE_AGENT',
      };
      console.log('Using real Superteam API key for submission');
    } else {
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
          console.warn(`Supabase agent lookup error: ${error.message}`);
        } else if (dbAgent) {
          agent = dbAgent;
        }
      } catch (e) {
        console.warn(`Supabase unavailable for agent lookup: ${String(e).slice(0, 100)}`);
      }
    }

    // Fallback to memory store
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
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // First submit to Superteam API to get real claim code
    let superteamResult: any = { success: false };

    try {
      const client = new SuperteamAgentClient(agent.api_key, agent.name);
      const submission: Submission = {
        listingId,
        link,
        otherInfo,
        telegram: telegram || undefined,
        ask: ask || null,
        eligibilityAnswers:
          eligibilityAnswers && eligibilityAnswers.length > 0
            ? eligibilityAnswers
            : undefined,
      };
      superteamResult = await client.submitListing(submission);

      // Extract claim code from Superteam response
      if (superteamResult.success && superteamResult.data) {
        claimCode = superteamResult.data.claimCode ||
                   superteamResult.data.claim_code ||
                   superteamResult.data.id ||
                   listingId;
      }
    } catch (apiError) {
      console.error('Superteam API submission error:', apiError);
    }

    // Use Telegram notification if bot token is available
    let result: any = superteamResult;

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramSubmitter = new TelegramSubmitter(
          process.env.TELEGRAM_BOT_TOKEN,
          process.env.TELEGRAM_CHAT_ID
        );
        const telegramResult = await telegramSubmitter.submitBounty({
          listingId,
          title: otherInfo || 'Bounty Submission',
          reward: ask || 0,
          rewardToken: 'USDC',
          link,
          otherInfo: `Agent: ${agent.name} | Info: ${otherInfo}`,
          claimCode: claimCode,
        });
        console.log(`✅ Telegram notification sent for ${listingId}:`, telegramResult);

        // Combine results
        result = {
          ...superteamResult,
          telegram: telegramResult,
        };
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    }

    // Log submission
    const submissionId = `submit-${agentId}-${listingId}-${Date.now()}`;

    // Try to store in Supabase (with fallback)
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { error } = await supabase.from('agent_submissions').insert({
        id: submissionId,
        agent_id: agentId,
        listing_id: listingId,
        listing_title: listingId,
        link,
        other_info: otherInfo,
        status: 'submitted',
        superteam_response: result,
        telegram,
        ask,
        submitted_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
      }

      console.log(`✅ Submission logged to Supabase: ${submissionId}`);
    } catch (dbError) {
      console.warn(
        `⚠️ Supabase unavailable for submission, using memory store: ${String(dbError).slice(0, 100)}`
      );
      testMemoryStore.addSubmission({
        id: submissionId,
        agentId,
        listingId,
        link,
        otherInfo,
        createdAt: Date.now(),
      });
    }

    return NextResponse.json({
      success: result.success || false,
      submissionId,
      claimCode: claimCode || agent.claim_code,
      message:
        result.success
          ? 'Submitted to Superteam. Use claim code to claim bounty.'
          : 'Submission attempted. Check Telegram for details.',
      result,
    });
  } catch (error) {
    console.error('Submission error:', error);
    return NextResponse.json(
      {
        error: 'Submission failed',
        details: String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    let submissions = null;

    // Try Supabase first
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const { data: dbSubmissions, error } = await supabase
        .from('agent_submissions')
        .select('*')
        .eq('agent_id', agentId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.warn(`Supabase submissions fetch error: ${error.message}`);
      } else if (dbSubmissions) {
        submissions = dbSubmissions;
      }
    } catch (e) {
      console.warn(`Supabase unavailable for submissions fetch: ${String(e).slice(0, 100)}`);
    }

    // Fallback to memory store
    if (!submissions) {
      submissions = testMemoryStore.getSubmissions(agentId).map((s) => ({
        id: s.id,
        agent_id: s.agentId,
        listing_id: s.listingId,
        link: s.link,
        other_info: s.otherInfo,
        submitted_at: new Date(s.createdAt).toISOString(),
      }));
    }

    return NextResponse.json({
      success: true,
      submissions,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch submissions',
        details: String(error),
      },
      { status: 500 }
    );
  }
}
