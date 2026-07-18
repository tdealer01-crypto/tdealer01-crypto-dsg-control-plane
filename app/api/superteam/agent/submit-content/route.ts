import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { TelegramSubmitter } from '@/lib/superteam/telegram-submitter';
import { testMemoryStore } from '@/lib/superteam/test-store';

export const dynamic = 'force-dynamic';

interface SubmitContentRequest {
  agentId: string;
  bountyId: string;
  bountyTitle: string;
  contentType: 'twitter-thread' | 'analysis' | 'deep-dive';
  content: string;
  wordCount: number;
  reward?: number;
  rewardToken?: string;
  proofUrl?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitContentRequest;
    const {
      agentId,
      bountyId,
      bountyTitle,
      contentType,
      content,
      wordCount,
      reward,
      rewardToken,
      proofUrl,
    } = body;

    if (!agentId || !bountyId || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, bountyId, content' },
        { status: 400 }
      );
    }

    console.log(`[SUBMIT-CONTENT] Submitting ${contentType} for ${bountyTitle}`);

    // Get agent from Supabase or memory store
    let agent: any = null;

    if (process.env.SUPERTEAM_API_KEY) {
      agent = {
        api_key: process.env.SUPERTEAM_API_KEY,
        name: 'superteam-agent-live',
        claim_code: `DSG-${agentId}`,
      };
      console.log('Using real Superteam API key for content submission');
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

        if (!error && dbAgent) {
          agent = dbAgent;
        }
      } catch (e) {
        console.warn(`Supabase unavailable: ${String(e).slice(0, 100)}`);
      }
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
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Format submission link (content-addressed)
    const contentHash = Buffer.from(content)
      .toString('base64')
      .slice(0, 16);
    const submissionLink = proofUrl ||
      `https://tdealer01-crypto-dsg-control-plane.vercel.app/bounty/${bountyId}/submission/${contentHash}`;

    // Format content info
    const contentInfo = `Generated ${contentType}: ${wordCount} words | Quality: Ready`;

    // Submit to Superteam API
    let apiResult: any = { success: false };

    try {
      const client = new SuperteamAgentClient(agent.api_key, agent.name);
      apiResult = await client.submitListing({
        listingId: bountyId,
        link: submissionLink,
        otherInfo: contentInfo,
        ask: reward,
      });

      console.log(`✅ Superteam API submission result:`, apiResult);
    } catch (apiError) {
      console.error('Superteam API submission error:', apiError);
      apiResult = {
        success: false,
        error: `API error: ${apiError instanceof Error ? apiError.message : String(apiError)}`,
      };
    }

    // Send Telegram notification with content summary
    let telegramResult: any = { success: false };

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramSubmitter = new TelegramSubmitter(
          process.env.TELEGRAM_BOT_TOKEN,
          process.env.TELEGRAM_CHAT_ID
        );

        // Create content preview (first 100 chars)
        const contentPreview = content.substring(0, 100).replace(/\n/g, ' ');

        telegramResult = await telegramSubmitter.submitBounty({
          listingId: bountyId,
          title: bountyTitle,
          reward: reward || 0,
          rewardToken: rewardToken || 'USDC',
          link: submissionLink,
          otherInfo: `${contentType} (${wordCount} words) | Preview: ${contentPreview}...`,
          claimCode: agent.claim_code,
        });

        console.log(`✅ Telegram notification sent:`, telegramResult);
      } catch (telegramError) {
        console.error('Telegram notification error:', telegramError);
      }
    }

    // Log submission to memory store
    const submissionId = `content-${agentId}-${bountyId}-${Date.now()}`;

    try {
      testMemoryStore.addSubmission({
        id: submissionId,
        agentId,
        listingId: bountyId,
        link: submissionLink,
        otherInfo: contentInfo,
        createdAt: Date.now(),
      });
    } catch (e) {
      console.warn(`Memory store logging failed: ${String(e).slice(0, 100)}`);
    }

    // Calculate completion metrics
    const completionMetrics = {
      bountyId,
      contentType,
      wordCount,
      reward,
      rewardToken,
      submission: {
        id: submissionId,
        link: submissionLink,
        timestamp: new Date().toISOString(),
      },
      apiStatus: apiResult.success ? 'submitted' : 'failed',
      telegramStatus: telegramResult.success ? 'notified' : 'skipped',
    };

    return NextResponse.json({
      success: apiResult.success || telegramResult.success,
      submissionId,
      contentType,
      bountyId,
      bountyTitle,
      reward,
      rewardToken,
      metrics: completionMetrics,
      apiResult,
      telegramResult,
      claimCode: agent.claim_code,
      message: apiResult.success
        ? `Content submitted to Superteam. Claim with code: ${agent.claim_code}`
        : 'Content logged for submission. Telegram notification sent.',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Content submission error:', error);
    return NextResponse.json(
      {
        error: 'Content submission failed',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const contentType = searchParams.get('contentType');

    if (!agentId) {
      return NextResponse.json(
        { error: 'agentId required' },
        { status: 400 }
      );
    }

    let submissions: any[] = [];

    // Try Supabase first
    try {
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      const query = supabase
        .from('agent_submissions')
        .select('*')
        .eq('agent_id', agentId);

      if (contentType) {
        query.filter('other_info', 'ilike', `%${contentType}%`);
      }

      const { data, error } = await query.order('submitted_at', {
        ascending: false,
      });

      if (!error && data) {
        submissions = data;
      }
    } catch (e) {
      console.warn(`Supabase fetch failed: ${String(e).slice(0, 100)}`);
    }

    // Fallback to memory store
    if (submissions.length === 0) {
      const memSubmissions = testMemoryStore.getSubmissions(agentId);
      submissions = memSubmissions.map((s) => ({
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
      agentId,
      contentType: contentType || 'all',
      submissions: submissions.filter((s) =>
        !contentType ? true : s.other_info?.includes(contentType)
      ),
      count: submissions.length,
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch submissions',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
