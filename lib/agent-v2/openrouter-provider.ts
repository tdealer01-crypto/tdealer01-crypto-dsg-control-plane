import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { getSupabaseAdmin } from '../supabase-server';

export type ModelProviderSource = 'customer_byok' | 'system_runtime';
export type ModelIntent = 'planning' | 'reasoning' | 'chat' | 'code';

export type RuntimeGovernedModelReply = {
  reply: string;
  provider: 'openrouter';
  providerSource: ModelProviderSource;
  modelUsed: string;
  intent: ModelIntent;
};

type Credential = {
  apiKey: string;
  source: ModelProviderSource;
};

const MODEL_BY_INTENT: Record<ModelIntent, { id: string; model: string; maxTokens: number }> = {
  planning: { id: 'qwen-planner', model: process.env.OPENROUTER_MODEL_PLANNING || 'qwen/qwen-2.5-7b-instruct:free', maxTokens: 1200 },
  reasoning: { id: 'deepseek-reasoner', model: process.env.OPENROUTER_MODEL_REASONING || 'deepseek/deepseek-r1-0528:free', maxTokens: 1800 },
  chat: { id: 'llama-chat', model: process.env.OPENROUTER_MODEL_CHAT || 'meta-llama/llama-4-scout:free', maxTokens: 1200 },
  code: { id: 'qwen-coder', model: process.env.OPENROUTER_MODEL_CODE || 'qwen/qwen-2.5-coder-7b-instruct:free', maxTokens: 1200 },
};

const PROVIDER_TABLE = 'agent_model_provider_keys';
const KEY_VERSION = 'v1';
const TIMEOUT_MS = 12_000;

function classifyIntent(message: string): ModelIntent {
  const lower = message.toLowerCase();
  if (/json|config|schema|sql|code|โค้ด|สคริปต์|debug|build|typescript|route/.test(lower)) return 'code';
  if (/why|ทำไม|วิเคราะห์|analyze|audit|proof|compare|เปรียบเทียบ|อธิบาย|explain|lineage/.test(lower)) return 'reasoning';
  if (/^(hi|hello|สวัสดี|ช่วย|help|แนะนำ|อะไร|what|how|ยังไง|เล่า|tell)/.test(lower)) return 'chat';
  return 'planning';
}

function secretKey() {
  const secret = process.env.MODEL_PROVIDER_SECRET || process.env.NEXTAUTH_SECRET || '';
  return secret ? createHash('sha256').update(secret).digest() : null;
}

function encrypt(value: string) {
  const key = secretKey();
  if (!key) throw new Error('MODEL_PROVIDER_SECRET is required');
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [KEY_VERSION, iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join(':');
}

function decrypt(value: string) {
  const key = secretKey();
  if (!key) return null;
  const [version, iv, tag, encrypted] = value.split(':');
  if (version !== KEY_VERSION || !iv || !tag || !encrypted) return null;
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64')), decipher.final()]);
  return plain.toString('utf8');
}

function previewKey(apiKey: string) {
  const trimmed = apiKey.trim();
  return trimmed.length > 10 ? `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}` : 'hidden';
}

function isMissingTable(error: unknown) {
  const item = error as { code?: string; message?: string } | null;
  const message = String(item?.message || '').toLowerCase();
  return item?.code === 'PGRST205' || (message.includes(PROVIDER_TABLE) && (message.includes('does not exist') || message.includes('schema cache') || message.includes('could not find')));
}

async function customerCredential(orgId: string): Promise<Credential | null> {
  const { data, error } = await getSupabaseAdmin()
    .from(PROVIDER_TABLE)
    .select('encrypted_api_key')
    .eq('org_id', orgId)
    .eq('provider', 'openrouter')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }

  const apiKey = data?.encrypted_api_key ? decrypt(String(data.encrypted_api_key)) : null;
  return apiKey ? { apiKey, source: 'customer_byok' } : null;
}

async function resolveCredential(orgId: string): Promise<Credential | null> {
  const customer = await customerCredential(orgId);
  if (customer) return customer;
  return process.env.OPENROUTER_API_KEY ? { apiKey: process.env.OPENROUTER_API_KEY, source: 'system_runtime' } : null;
}

export async function getOpenRouterProviderStatus(orgId: string) {
  const systemConfigured = Boolean(process.env.OPENROUTER_API_KEY);
  const { data, error } = await getSupabaseAdmin()
    .from(PROVIDER_TABLE)
    .select('api_key_preview, updated_at')
    .eq('org_id', orgId)
    .eq('provider', 'openrouter')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (isMissingTable(error)) return { ok: true, provider: 'openrouter', customerConfigured: false, systemConfigured, missingTable: true };
    throw error;
  }

  return { ok: true, provider: 'openrouter', customerConfigured: Boolean(data), systemConfigured, missingTable: false, api_key_preview: data?.api_key_preview || null, updated_at: data?.updated_at || null };
}

export async function saveOpenRouterProviderKey(orgId: string, userId: string, apiKey: string) {
  const trimmed = apiKey.trim();
  if (!trimmed) throw new Error('api_key is required');
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  await supabase
    .from(PROVIDER_TABLE)
    .update({ status: 'replaced', updated_at: now })
    .eq('org_id', orgId)
    .eq('provider', 'openrouter')
    .eq('status', 'active');

  const { error } = await supabase.from(PROVIDER_TABLE).insert({
    org_id: orgId,
    provider: 'openrouter',
    encrypted_api_key: encrypt(trimmed),
    api_key_preview: previewKey(trimmed),
    status: 'active',
    created_by: userId,
    updated_at: now,
  });
  if (error) throw error;
  return { ok: true, provider: 'openrouter', api_key_preview: previewKey(trimmed) };
}

export async function disableOpenRouterProviderKey(orgId: string) {
  const { error } = await getSupabaseAdmin()
    .from(PROVIDER_TABLE)
    .update({ status: 'disabled', updated_at: new Date().toISOString() })
    .eq('org_id', orgId)
    .eq('provider', 'openrouter')
    .eq('status', 'active');
  if (error) throw error;
  return { ok: true, provider: 'openrouter', customerConfigured: false };
}

function systemPrompt(pageContext?: string) {
  return `You are DSG Agent v2. You can explain and propose safe next steps, but real system changes must be executed only through DSG runtime tools. Never claim an action was executed unless the runtime result confirms it. Match the user's language. Current page: ${pageContext || 'unknown'}.`;
}

export async function generateRuntimeGovernedModelReply(params: {
  orgId: string;
  message: string;
  pageContext?: string;
}): Promise<RuntimeGovernedModelReply | null> {
  const credential = await resolveCredential(params.orgId);
  if (!credential) return null;

  const intent = classifyIntent(params.message);
  const model = MODEL_BY_INTENT[intent];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${credential.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://tdealer01-crypto-dsg-control-plane.vercel.app',
        'X-Title': 'DSG Runtime Governed Chatbot',
      },
      body: JSON.stringify({
        model: model.model,
        messages: [
          { role: 'system', content: systemPrompt(params.pageContext) },
          { role: 'user', content: params.message },
        ],
        max_tokens: model.maxTokens,
        temperature: 0.2,
      }),
    });

    if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);

    const json = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = String(json.choices?.[0]?.message?.content || '').trim();
    if (!reply) return null;

    return { reply, provider: 'openrouter', providerSource: credential.source, modelUsed: model.id, intent };
  } finally {
    clearTimeout(timeout);
  }
}
