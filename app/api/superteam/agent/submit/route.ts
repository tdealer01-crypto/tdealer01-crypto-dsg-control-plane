import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { SuperteamAgentClient, type Submission } from '@/lib/superteam/agent-client';
import { TelegramSubmitter } from '@/lib/superteam/telegram-submitter';
import {
  getSuperteamSupabase,
  requireSuperteamAgentCredential,
  superteamErrorStatus,
} from '@/lib/superteam/server';

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
    const agentId = body.agentId?.trim();
    const listingId = body.listingId?.trim();
    const link = body.link?.trim();
    const otherInfo = body.otherInfo?.trim();

    if (!agentId || !listingId || !link || !otherInfo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (body.ask !== undefined && (!Number.isFinite(body.ask) || body.ask < 0)) {
      return NextResponse.json({ error: 'ask must be a non-negative number' }, { status: 400 });
    }

    const supabase = getSuperteamSupabase();
    const { agent, apiKey } = await requireSuperteamAgentCredential(supabase, agentId);
    const client = new SuperteamAgentClient(apiKey, agent.name);
    const submission: Submission = {
      listingId,
      link,
      otherInfo,
      telegram: body.telegram || undefined,
      ask: body.ask ?? null,
      eligibilityAnswers: body.eligibilityAnswers?.length ? body.eligibilityAnswers : undefined,
    };

    const externalResult = await client.submitListing(submission);
    const submissionId = `submit-${randomUUID()}`;
    const submittedAt = new Date().toISOString();
    const externalData = externalResult.data as Record<string, unknown> | undefined;
    const externalClaimCode = externalResult.success && externalData
      ? String(externalData.claimCode ?? externalData.claim_code ?? '') || null
      : null;

    const { error: persistError } = await supabase.from('agent_submissions').insert({
      id: submissionId,
      agent_id: agentId,
      listing_id: listingId,
      listing_title: listingId,
      link,
      other_info: otherInfo,
      status: externalResult.success ? 'submitted' : 'failed',
      superteam_response: externalResult,
      telegram: body.telegram ?? null,
      ask: body.ask ?? null,
      submitted_at: submittedAt,
    });

    if (persistError) {
      console.error('[superteam/submit] external result could not be persisted:', persistError.message);
      return NextResponse.json({
        success: false,
        externalSubmitted: Boolean(externalResult.success),
        error: 'SUPERTEAM_SUBMISSION_AUDIT_PERSIST_FAILED',
        externalClaimCode,
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
          listingId,
          title: otherInfo,
          reward: body.ask ?? 0,
          rewardToken: 'USDC',
          link,
          otherInfo: `Agent: ${agent.name}`,
          claimCode: externalClaimCode ?? undefined,
        });
      } catch (error) {
        console.error('[superteam/submit] Telegram notification failed:', error);
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
      claimCode: externalClaimCode,
      submittedAt,
      telegramResult,
    });
  } catch (error) {
    console.error('[superteam/submit] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message.split(':')[0] : 'SUPERTEAM_SUBMISSION_FAILED' },
      { status: superteamErrorStatus(error) },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = new URL(request.url).searchParams.get('agentId')?.trim();
    if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

    const supabase = getSuperteamSupabase();
    const { data, error } = await supabase
      .from('agent_submissions')
      .select('*')
      .eq('agent_id', agentId)
      .order('submitted_at', { ascending: false });
    if (error) throw new Error(`SUPERTEAM_SUBMISSIONS_FETCH_FAILED:${error.message}`);

    return NextResponse.json({ success: true, source: 'supabase', submissions: data ?? [] });
  } catch (error) {
    console.error('[superteam/submit:get] failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message.split(':')[0] : 'SUPERTEAM_SUBMISSIONS_FETCH_FAILED' },
      { status: superteamErrorStatus(error) },
    );
  }
}
