import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient } from '@/lib/superteam/agent-client';
import { TelegramSubmitter } from '@/lib/superteam/telegram-submitter';
import {
  getSuperteamSupabase,
  requireSuperteamAgentCredential,
  superteamErrorStatus,
} from '@/lib/superteam/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface SubmitContentRequest {
  agentId: string;
  bountyId: string;
  bountyTitle: string;
  contentType: 'twitter-thread' | 'analysis' | 'deep-dive';
  content: string;
  reward?: number;
  rewardToken?: string;
  proofUrl?: string;
}

const CONTENT_TYPES = new Set(['twitter-thread', 'analysis', 'deep-dive']);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as SubmitContentRequest;
    const agentId = body.agentId?.trim();
    const bountyId = body.bountyId?.trim();
    const bountyTitle = body.bountyTitle?.trim();
    const content = body.content?.trim();
    const proofUrl = body.proofUrl?.trim();

    if (!agentId || !bountyId || !bountyTitle || !content) {
      return NextResponse.json({ error: 'agentId, bountyId, bountyTitle and content are required' }, { status: 400 });
    }
    if (!CONTENT_TYPES.has(body.contentType)) {
      return NextResponse.json({ error: 'invalid contentType' }, { status: 400 });
    }
    if (!proofUrl) {
      return NextResponse.json({
        error: 'proofUrl required',
        reason: 'No verified content-hosting provider is wired; DSG will not fabricate a submission URL.',
      }, { status: 400 });
    }
    try {
      const parsed = new URL(proofUrl);
      if (parsed.protocol !== 'https:') throw new Error('HTTPS_REQUIRED');
    } catch {
      return NextResponse.json({ error: 'proofUrl must be a valid HTTPS URL' }, { status: 400 });
    }
    if (body.reward !== undefined && (!Number.isFinite(body.reward) || body.reward < 0)) {
      return NextResponse.json({ error: 'reward must be a non-negative number' }, { status: 400 });
    }

    const actualWordCount = content.split(/\s+/).filter(Boolean).length;
    const supabase = getSuperteamSupabase();
    const { agent, apiKey } = await requireSuperteamAgentCredential(supabase, agentId);
    const client = new SuperteamAgentClient(apiKey, agent.name);
    const externalResult = await client.submitListing({
      listingId: bountyId,
      link: proofUrl,
      otherInfo: `${body.contentType}; words=${actualWordCount}`,
      ask: body.reward,
    });

    const submissionId = `content-${randomUUID()}`;
    const submittedAt = new Date().toISOString();
    const externalData = externalResult.data as Record<string, unknown> | undefined;
    const claimCode = externalResult.success && externalData
      ? String(externalData.claimCode ?? externalData.claim_code ?? '') || null
      : null;

    const { error: persistError } = await supabase.from('agent_submissions').insert({
      id: submissionId,
      agent_id: agentId,
      listing_id: bountyId,
      listing_title: bountyTitle,
      link: proofUrl,
      other_info: `${body.contentType}; words=${actualWordCount}`,
      status: externalResult.success ? 'submitted' : 'failed',
      superteam_response: externalResult,
      ask: body.reward ?? null,
      submitted_at: submittedAt,
    });

    if (persistError) {
      return NextResponse.json({
        success: false,
        externalSubmitted: Boolean(externalResult.success),
        error: 'SUPERTEAM_CONTENT_AUDIT_PERSIST_FAILED',
        claimCode,
      }, { status: 503 });
    }

    let telegramResult: unknown = null;
    if (externalResult.success && process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
      try {
        const telegramSubmitter = new TelegramSubmitter(
          process.env.TELEGRAM_BOT_TOKEN,
          process.env.TELEGRAM_CHAT_ID,
        );
        telegramResult = await telegramSubmitter.submitBounty({
          listingId: bountyId,
          title: bountyTitle,
          reward: body.reward ?? 0,
          rewardToken: body.rewardToken || 'USDC',
          link: proofUrl,
          otherInfo: `${body.contentType} (${actualWordCount} words)`,
          claimCode: claimCode ?? undefined,
        });
      } catch (error) {
        console.error('[superteam/submit-content] Telegram notification failed:', error);
      }
    }

    if (!externalResult.success) {
      return NextResponse.json({
        success: false,
        submissionId,
        persisted: true,
        status: 'failed',
        error: externalResult.error ?? 'SUPERTEAM_API_SUBMISSION_FAILED',
        telegramResult,
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      source: 'superteam_api',
      persisted: true,
      submissionId,
      status: 'submitted',
      bountyId,
      contentType: body.contentType,
      actualWordCount,
      requestedReward: body.reward ?? null,
      rewardToken: body.rewardToken ?? null,
      proofUrl,
      claimCode,
      telegramResult,
      submittedAt,
    });
  } catch (error) {
    return handleApiError('superteam/submit-content', error, { status: superteamErrorStatus(error) });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId')?.trim();
    const contentType = searchParams.get('contentType')?.trim();
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });
    if (contentType && !CONTENT_TYPES.has(contentType)) {
      return NextResponse.json({ error: 'invalid contentType' }, { status: 400 });
    }

    const supabase = getSuperteamSupabase();
    let query = supabase
      .from('agent_submissions')
      .select('*')
      .eq('agent_id', agentId);
    if (contentType) query = query.ilike('other_info', `${contentType};%`);

    const { data, error } = await query.order('submitted_at', { ascending: false });
    if (error) throw new Error(`SUPERTEAM_CONTENT_FETCH_FAILED:${error.message}`);

    return NextResponse.json({
      success: true,
      source: 'supabase',
      agentId,
      contentType: contentType || 'all',
      submissions: data ?? [],
      count: data?.length ?? 0,
    });
  } catch (error) {
    return handleApiError('superteam/submit-content:get', error, { status: superteamErrorStatus(error) });
  }
}
