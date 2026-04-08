import type { ExecutorDispatchParams, ExecutorDispatchResult } from './types';

async function callTelegram(payload: Record<string, unknown>) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('Telegram is not configured');
  }

  const chatId = String(payload.chat_id || '').trim();
  const text = String(payload.text || '').trim();
  if (!chatId || !text) {
    throw new Error('Telegram payload requires chat_id and text');
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok || !body?.ok) {
    throw new Error(String(body?.description || 'Telegram sendMessage failed'));
  }

  return {
    provider: 'telegram',
    status: 'completed',
    callbackMode: 'sync',
    externalId: String(body?.result?.message_id || ''),
    metadata: body?.result,
  } satisfies ExecutorDispatchResult;
}

export async function executeSocialAction(
  params: ExecutorDispatchParams,
): Promise<ExecutorDispatchResult> {
  if (params.action === 'social.telegram.send') {
    return callTelegram(params.payload);
  }

  throw new Error(`Unsupported social action: ${params.action}`);
}
