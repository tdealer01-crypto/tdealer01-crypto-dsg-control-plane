import { kilesa, parami, samadhi, truthBoundary, userBenefitGate, verify } from '../app-builder/agent-runtime/decision-frame';
import { sha256Json } from '../runtime/hash';

export type DsgAiProvider = 'openai' | 'gemini' | 'anthropic';
export type DsgAiMode = 'text' | 'json' | 'image_analysis' | 'image_generation' | 'video_analysis' | 'speech' | 'audio_transcription';
export type DsgAiPreparedStatus = 'ready' | 'blocked' | 'review';

export type DsgAiGatewayRequest = {
  provider: DsgAiProvider;
  goal: string;
  prompt: string;
  model?: string;
  mode?: DsgAiMode;
  history?: string[];
  evidence?: string[];
  media?: DsgAiMediaInput | DsgAiMediaInput[];
  image?: { size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto'; quality?: 'low' | 'medium' | 'high' | 'auto'; n?: number };
  audio?: { voice?: string; format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav' | 'pcm' };
  maxOutputTokens?: number;
  temperature?: number;
};

export type DsgAiMediaInput = {
  url?: string;
  base64?: string;
  mimeType?: string;
};

export type DsgAiGatewayPreparedRequest = {
  ok: boolean;
  status: DsgAiPreparedStatus;
  provider: DsgAiProvider;
  model: string;
  mode: DsgAiMode;
  endpoint: string;
  method: 'POST';
  headers: Record<string, string>;
  body: Record<string, unknown>;
  decisionFrame: {
    target: ReturnType<typeof samadhi>;
    verifiedInput: ReturnType<typeof verify<DsgAiGatewayRequest>>;
    risk: ReturnType<typeof kilesa>;
    stats: ReturnType<typeof parami>;
    benefit: ReturnType<typeof userBenefitGate>;
    truthBoundary: ReturnType<typeof truthBoundary>;
  };
  requiredSecret: string;
  requestHash: string;
  blockedReasons: string[];
  userOutcome: string;
};

const providerDefaults: Record<DsgAiProvider, { model: string; secretNames: string[] }> = {
  openai: { model: 'gpt-5', secretNames: ['OPENAI_API_KEY'] },
  gemini: { model: 'gemini-2.5-flash', secretNames: ['GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY'] },
  anthropic: { model: 'claude-3-opus-20240229', secretNames: ['ANTHROPIC_API_KEY'] },
};

const modeDefaultModels: Partial<Record<DsgAiProvider, Partial<Record<DsgAiMode, string>>>> = {
  openai: {
    image_generation: 'gpt-image-1',
    speech: 'gpt-4o-mini-tts',
    audio_transcription: 'gpt-4o-mini-transcribe',
  },
  gemini: {
    image_generation: 'gemini-2.5-flash-image-preview',
  },
};

const modeSupport: Record<DsgAiProvider, DsgAiMode[]> = {
  openai: ['text', 'json', 'image_analysis', 'image_generation', 'speech', 'audio_transcription'],
  gemini: ['text', 'json', 'image_analysis', 'image_generation', 'video_analysis', 'audio_transcription'],
  anthropic: ['text', 'json', 'image_analysis'],
};

function getSecret(provider: DsgAiProvider): { name: string; value: string } | null {
  for (const name of providerDefaults[provider].secretNames) {
    const value = process.env[name];
    if (value && value.trim()) return { name, value };
  }
  return null;
}

function mediaInputsFor(input: DsgAiGatewayRequest): DsgAiMediaInput[] {
  const media = input.media ? (Array.isArray(input.media) ? input.media : [input.media]) : [];
  return media.map((item) => ({
    url: item.url?.trim(),
    base64: item.base64?.trim(),
    mimeType: item.mimeType?.trim(),
  }));
}

function mediaEvidenceFor(media: DsgAiMediaInput[]): string[] {
  return media.flatMap((item, index) => {
    const evidence: string[] = [];
    if (item.url) evidence.push(`media_${index}_url_hash:${sha256Json({ url: item.url })}`);
    if (item.base64) evidence.push(`media_${index}_base64_hash:${sha256Json({ base64: item.base64 })}`);
    if (item.mimeType) evidence.push(`media_${index}_mime:${item.mimeType}`);
    return evidence;
  });
}

function mediaBlockedReasonsFor(input: DsgAiGatewayRequest): string[] {
  const mode = input.mode ?? 'text';
  if (!['image_analysis', 'video_analysis', 'audio_transcription'].includes(mode)) return [];
  const media = mediaInputsFor(input);
  const missing: string[] = [];
  if (media.length === 0) missing.push('MEDIA_REQUIRED');
  for (const [index, item] of media.entries()) {
    if (!item.url && !item.base64) missing.push(`MEDIA_SOURCE_REQUIRED:${index}`);
    if (item.base64 && !item.mimeType) missing.push(`MEDIA_MIME_REQUIRED:${index}`);
    if (item.url && !/^https:\/\//i.test(item.url)) missing.push(`MEDIA_URL_HTTPS_REQUIRED:${index}`);
    if (mode === 'image_analysis' && item.mimeType && !item.mimeType.startsWith('image/')) missing.push(`MEDIA_IMAGE_MIME_REQUIRED:${index}`);
    if (mode === 'video_analysis' && item.mimeType && !item.mimeType.startsWith('video/')) missing.push(`MEDIA_VIDEO_MIME_REQUIRED:${index}`);
    if (mode === 'audio_transcription' && item.mimeType && !item.mimeType.startsWith('audio/')) missing.push(`MEDIA_AUDIO_MIME_REQUIRED:${index}`);
  }
  return missing;
}

function riskFlagsFor(input: DsgAiGatewayRequest): string[] {
  const text = `${input.goal}\n${input.prompt}`;
  return [
    /(?:secret|token|service[_-]?role|api[_-]?key|private[_-]?key)/i.test(text) ? 'secret' : '',
    /(?:production verified|certified|guaranteed compliant|guaranteed)/i.test(text) ? 'production_claim' : '',
    /(?:copy .*(?:licensed|proprietary)|bypass license|remove copyright)/i.test(text) ? 'license_violation' : '',
    /(?:deepfake|impersonate|face swap|non-consensual|explicit|nudity|sexual)/i.test(text) ? 'unsafe_media_request' : '',
  ].filter(Boolean);
}

function defaultModelFor(provider: DsgAiProvider, mode: DsgAiMode): string {
  return modeDefaultModels[provider]?.[mode] || providerDefaults[provider].model;
}

function openAiMediaPart(item: DsgAiMediaInput, mode: DsgAiMode): Record<string, unknown> {
  if (mode === 'audio_transcription') {
    return {
      type: 'input_audio',
      input_audio: item.base64 ? { data: item.base64, format: (item.mimeType || 'audio/wav').split('/')[1] || 'wav' } : { url: item.url },
    };
  }
  const imageUrl = item.base64 ? `data:${item.mimeType};base64,${item.base64}` : item.url;
  return { type: 'input_image', image_url: imageUrl };
}

function geminiMediaPart(item: DsgAiMediaInput): Record<string, unknown> {
  if (item.base64) return { inlineData: { mimeType: item.mimeType, data: item.base64 } };
  return { fileData: { mimeType: item.mimeType || 'application/octet-stream', fileUri: item.url } };
}

function anthropicMediaBlock(item: DsgAiMediaInput): Record<string, unknown> {
  if (item.base64) return { type: 'image', source: { type: 'base64', media_type: item.mimeType || 'image/png', data: item.base64 } };
  return { type: 'image', source: { type: 'url', url: item.url } };
}

function buildBody(input: DsgAiGatewayRequest, model: string): Record<string, unknown> {
  const mode = input.mode ?? 'text';
  const maxOutputTokens = input.maxOutputTokens ?? 1024;
  const media = mediaInputsFor(input);

  if (input.provider === 'openai') {
    if (mode === 'image_generation') {
      return {
        model,
        prompt: input.prompt,
        n: input.image?.n ?? 1,
        size: input.image?.size ?? '1024x1024',
        quality: input.image?.quality ?? 'auto',
        metadata: { dsgGoalHash: sha256Json({ goal: input.goal }) },
      };
    }
    if (mode === 'speech') {
      return {
        model,
        input: input.prompt,
        voice: input.audio?.voice ?? 'alloy',
        response_format: input.audio?.format ?? 'mp3',
      };
    }
    const content = ['image_analysis', 'audio_transcription'].includes(mode)
      ? [{ type: 'input_text', text: input.prompt }, ...media.map((item) => openAiMediaPart(item, mode))]
      : input.prompt;
    return {
      model,
      input: Array.isArray(content) ? [{ role: 'user', content }] : content,
      text: mode === 'json' ? { format: { type: 'json_object' } } : undefined,
      max_output_tokens: maxOutputTokens,
      temperature: input.temperature,
      metadata: { dsgGoalHash: sha256Json({ goal: input.goal }) },
    };
  }

  if (input.provider === 'gemini') {
    const parts = [{ text: input.prompt }, ...media.map(geminiMediaPart)];
    return {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: mode === 'json' ? 'application/json' : 'text/plain',
        maxOutputTokens,
        temperature: input.temperature,
      },
      systemInstruction: { parts: [{ text: `DSG target: ${input.goal}` }] },
    };
  }

  const content = mode === 'image_analysis' ? [...media.map(anthropicMediaBlock), { type: 'text', text: input.prompt }] : input.prompt;
  return {
    model,
    max_tokens: maxOutputTokens,
    temperature: input.temperature,
    system: `DSG target: ${input.goal}`,
    messages: [{ role: 'user', content }],
  };
}

function buildEndpoint(provider: DsgAiProvider, model: string, secretValue: string, mode: DsgAiMode): string {
  if (provider === 'openai') {
    const base = process.env.OPENAI_API_BASE || 'https://api.openai.com';
    if (mode === 'image_generation') return `${base}/v1/images/generations`;
    if (mode === 'speech') return `${base}/v1/audio/speech`;
    return `${base}/v1/responses`;
  }
  if (provider === 'gemini') return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(secretValue)}`;
  return 'https://api.anthropic.com/v1/messages';
}

function buildHeaders(provider: DsgAiProvider, secretValue: string): Record<string, string> {
  if (provider === 'openai') return { 'content-type': 'application/json', authorization: `Bearer ${secretValue}` };
  if (provider === 'anthropic') return { 'content-type': 'application/json', 'x-api-key': secretValue, 'anthropic-version': '2023-06-01' };
  return { 'content-type': 'application/json' };
}

export function prepareDsgAiGatewayRequest(input: DsgAiGatewayRequest): DsgAiGatewayPreparedRequest {
  const providerConfig = providerDefaults[input.provider];
  if (!providerConfig) throw new Error('DSG_AI_PROVIDER_UNSUPPORTED');

  const goal = input.goal.trim();
  const prompt = input.prompt.trim();
  const mode = input.mode ?? 'text';
  const model = (input.model || defaultModelFor(input.provider, mode)).trim();
  const target = samadhi('dsg-ai-gateway', goal || 'missing-goal');
  const evidence = [...(input.evidence ?? [])];
  if (goal) evidence.push(`goal_hash:${sha256Json({ goal })}`);
  if (prompt) evidence.push(`prompt_hash:${sha256Json({ prompt })}`);
  evidence.push(...mediaEvidenceFor(mediaInputsFor({ ...input, goal, prompt, model, mode })));
  const normalizedInput = { ...input, goal, prompt, model, mode };
  const verifiedInput = verify(normalizedInput, evidence);
  const flags = riskFlagsFor(normalizedInput);
  const modeBlocked = !modeSupport[input.provider].includes(mode);
  const secret = getSecret(input.provider);
  const missing: string[] = [...mediaBlockedReasonsFor(normalizedInput)];
  if (!goal) missing.push('GOAL_REQUIRED');
  if (!prompt) missing.push('PROMPT_REQUIRED');
  if (!model) missing.push('MODEL_REQUIRED');
  if (modeBlocked) missing.push(`MODE_UNSUPPORTED:${input.provider}:${mode}`);
  if (!secret) missing.push(`SECRET_REQUIRED:${providerConfig.secretNames.join('|')}`);
  if (flags.includes('unsafe_media_request')) missing.push('UNSAFE_MEDIA_REVIEW_REQUIRED');

  const risk = kilesa(`${input.provider}:${mode}:${goal || 'missing-goal'}`, verifiedInput.verified && missing.length === 0, flags);
  const stats = parami([...(input.history ?? []), input.provider, mode]);
  const benefit = userBenefitGate({
    userBenefit: 'User gets one fail-closed model gateway that states provider, model, required secret, risk, and evidence before any external AI call.',
    easier: true,
    tangibleOutput: 'Prepared provider request with decision-frame status and deterministic request hash.',
    nextAction: missing.length || risk.state === 'blocked' ? 'Fix blocked reasons before execution.' : 'Execute through server-side gateway and store output as unverified until independently checked.',
  });
  const boundary = truthBoundary({
    verified: verifiedInput.verified && missing.length === 0,
    containsSecret: flags.includes('secret'),
    containsProductionClaim: flags.includes('production_claim'),
    containsLicenseRisk: flags.includes('license_violation'),
  });
  const blockedReasons = [...missing, ...risk.reasons.filter((reason) => reason !== 'VERIFIED'), ...boundary.blockedReasons];
  const status: DsgAiPreparedStatus = blockedReasons.length ? 'blocked' : mode !== 'text' && mode !== 'json' ? 'review' : 'ready';
  const secretValue = secret?.value ?? 'MISSING_SECRET_FAIL_CLOSED';
  const endpoint = buildEndpoint(input.provider, model || defaultModelFor(input.provider, mode), secretValue, mode);
  const body = buildBody(normalizedInput, model || providerConfig.model);
  const headers = buildHeaders(input.provider, secretValue);
  const requestHash = sha256Json({ provider: input.provider, model, mode, endpoint: endpoint.replace(secretValue, 'REDACTED'), body });

  return {
    ok: status !== 'blocked',
    status,
    provider: input.provider,
    model: model || providerConfig.model,
    mode,
    endpoint: redactUrl(endpoint),
    method: 'POST',
    headers: redactHeaders(headers),
    body,
    decisionFrame: { target, verifiedInput, risk, stats, benefit, truthBoundary: boundary },
    requiredSecret: providerConfig.secretNames.join('|'),
    requestHash,
    blockedReasons: [...new Set(blockedReasons)],
    userOutcome: 'A governed AI request can be reviewed before network execution; missing secrets or unsafe claims fail closed.',
  };
}

export async function executeDsgAiGatewayRequest(input: DsgAiGatewayRequest): Promise<{
  ok: boolean;
  prepared: DsgAiGatewayPreparedRequest;
  responseStatus?: number;
  responseBody?: unknown;
  outputVerification: 'unverified_external_output' | 'blocked_before_call';
}> {
  const prepared = prepareDsgAiGatewayRequest(input);
  if (!prepared.ok) return { ok: false, prepared, outputVerification: 'blocked_before_call' };

  const secret = getSecret(input.provider);
  if (!secret) return { ok: false, prepared, outputVerification: 'blocked_before_call' };
  const endpoint = buildEndpoint(input.provider, prepared.model, secret.value, prepared.mode);
  const headers = buildHeaders(input.provider, secret.value);
  const response = await fetch(endpoint, {
    method: prepared.method,
    headers,
    body: JSON.stringify(prepared.body),
  });
  const text = await response.text();
  let responseBody: unknown = text;
  if (text.trim().startsWith('{') || text.trim().startsWith('[')) responseBody = JSON.parse(text);
  return {
    ok: response.ok,
    prepared,
    responseStatus: response.status,
    responseBody,
    outputVerification: 'unverified_external_output',
  };
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(headers).map(([key, value]) => [key, /authorization|api-key/i.test(key) ? 'REDACTED' : value]));
}

export function redactUrl(url: string): string {
  return url.replace(/([?&]key=)[^&]+/i, '$1REDACTED');
}
