import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSuperteamSupabase, superteamErrorStatus } from '@/lib/superteam/server';
import { handleApiError } from '@/lib/security/api-error';

export const dynamic = 'force-dynamic';

interface TelegramUpdate {
  update_id: number;
  message?: { chat?: { id: number }; text?: string };
  channel_post?: { chat?: { id: number }; text?: string };
}

interface ParsedListing {
  title: string;
  reward: number;
  rewardToken: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  deadline?: string;
  link?: string;
}

function parseBountyMessage(text: string): ParsedListing | null {
  if (!text) return null;
  const titleMatch = text.match(/^[🎯📌📝]?\s*(.+?)(?:\n|$)/);
  const rewardMatch = text.match(/💰\s*(\d+(?:\.\d+)?)\s*(SOL|USDC|USD)/i);
  const difficultyMatch = text.match(/⭐\s*(easy|medium|hard|beginner|intermediate|advanced)/i);
  const deadlineMatch = text.match(/⏰\s*(?:Due:|Deadline:)?\s*(.+?)(?:\n|$)/i);
  const linkMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (!titleMatch || !rewardMatch) return null;

  const difficultyMap: Record<string, 'easy' | 'medium' | 'hard'> = {
    beginner: 'easy',
    easy: 'easy',
    intermediate: 'medium',
    medium: 'medium',
    advanced: 'hard',
    hard: 'hard',
  };

  const reward = Number(rewardMatch[1]);
  if (!Number.isFinite(reward)) return null;

  return {
    title: titleMatch[1].trim(),
    reward,
    rewardToken: rewardMatch[2].toUpperCase(),
    difficulty: difficultyMatch ? difficultyMap[difficultyMatch[1].toLowerCase()] : undefined,
    deadline: deadlineMatch ? deadlineMatch[1].trim() : undefined,
    link: linkMatch?.[1],
  };
}

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.TELEGRAM_BOT_SECRET?.trim();
    if (!configuredSecret) {
      return NextResponse.json({ ok: false, error: 'TELEGRAM_BOT_SECRET_NOT_CONFIGURED' }, { status: 503 });
    }
    if (request.headers.get('x-telegram-bot-api-secret-token') !== configuredSecret) {
      return NextResponse.json({ ok: false, error: 'INVALID_TELEGRAM_WEBHOOK_SECRET' }, { status: 401 });
    }

    const body = (await request.json()) as TelegramUpdate;
    const messageText = body.message?.text || body.channel_post?.text;
    const chatId = body.message?.chat?.id || body.channel_post?.chat?.id;
    if (!messageText || !chatId) return NextResponse.json({ ok: true, ignored: true });

    const listing = parseBountyMessage(messageText);
    if (!listing) return NextResponse.json({ ok: true, ignored: true, reason: 'NO_PARSEABLE_BOUNTY' });

    const supabase = getSuperteamSupabase();
    const discoveryId = `telegram-${randomUUID()}`;
    const discoveredAt = new Date().toISOString();
    const { error } = await supabase.from('agent_discovery_log').insert({
      id: discoveryId,
      agent_id: 'telegram-bot',
      listing_id: discoveryId,
      listing_title: listing.title,
      listing_type: 'bounty',
      reward: listing.reward,
      discovered_at: discoveredAt,
    });
    if (error) throw new Error(`TELEGRAM_DISCOVERY_PERSIST_FAILED:${error.message}`);

    return NextResponse.json({
      ok: true,
      source: 'telegram_webhook',
      persisted: true,
      discoveryId,
      listing,
      submitted: 0,
      submissionStatus: 'not_attempted',
      reason: 'Telegram parsing is discovery evidence only; no verified Superteam listing ID/API submission mapping is available here.',
      discoveredAt,
    });
  } catch (error) {
    return handleApiError('superteam/telegram-webhook', error, { status: superteamErrorStatus(error) });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'Superteam Telegram Webhook',
    status: process.env.TELEGRAM_BOT_SECRET ? 'configured' : 'unavailable',
    capabilities: {
      parseBounties: true,
      persistDiscovery: true,
      autoSubmit: false,
    },
    truthBoundary: 'Telegram messages are not treated as completed Superteam submissions.',
  });
}
