/**
 * Gateway Webhook Handler
 * POST /api/gateway/webhooks - Receive messages from channels
 * Query: channel=slack|discord|telegram|etc
 */

import { NextRequest, NextResponse } from 'next/server';
import { GatewayService, GatewayConfig } from '@/lib/gateway';

export const dynamic = 'force-dynamic';

// Global gateway instance
let gatewayService: GatewayService | null = null;

async function getGatewayService(): Promise<GatewayService> {
  if (!gatewayService) {
    const config: GatewayConfig = {
      channels: [
        {
          channel: 'slack',
          enabled: !!process.env.SLACK_BOT_TOKEN,
          credentials: {
            bot_token: process.env.SLACK_BOT_TOKEN || '',
          },
          webhook_secret: process.env.SLACK_WEBHOOK_SECRET,
        },
        {
          channel: 'discord',
          enabled: !!process.env.DISCORD_BOT_TOKEN,
          credentials: {
            bot_token: process.env.DISCORD_BOT_TOKEN || '',
          },
        },
        {
          channel: 'telegram',
          enabled: !!process.env.TELEGRAM_BOT_TOKEN,
          credentials: {
            bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
          },
        },
      ],
      database_url: process.env.DATABASE_URL || '',
      redis_url: process.env.REDIS_URL,
      webhook_base_url: process.env.WEBHOOK_BASE_URL || '',
      max_message_size: 1024 * 1024,
      message_retention_days: 30,
      enable_voice: true,
      enable_canvas: true,
    };

    gatewayService = new GatewayService(config);
    await gatewayService.initialize();
  }

  return gatewayService;
}

export async function POST(request: NextRequest) {
  try {
    const channel = request.nextUrl.searchParams.get('channel');

    if (!channel) {
      return NextResponse.json(
        { error: 'Channel parameter required' },
        { status: 400 }
      );
    }

    const signature = request.headers.get('x-signature') || request.headers.get('x-hub-signature');
    const body = await request.json();

    const gateway = await getGatewayService();
    await gateway.handleWebhook(channel as any, body, signature || undefined);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    message: 'Gateway webhook endpoint',
    usage: 'POST with ?channel=slack|discord|telegram',
  });
}
