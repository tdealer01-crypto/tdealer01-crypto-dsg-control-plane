# Hermes Agent LLM Backend Configuration

## Overview

Hermes Agent requires a configured LLM backend to provide conversational responses. The system supports four providers:

- **OpenRouter** (primary) — access to multiple open-source and commercial models
- **Together AI** — direct access to NousResearch Hermes models  
- **Anthropic** — Claude models
- **NVIDIA/Nemotron** (fallback) — NVIDIA's enterprise language models

Without a configured LLM backend, Hermes will operate in **limited mode** and return:
```
⚠️ Hermes is running in limited mode — the conversational LLM backend is not available right now.
(All LLM backends unavailable)
```

---

## Quick Setup

### 1. Get an OpenRouter API Key (Recommended)

1. Visit https://openrouter.ai
2. Sign up or log in
3. Go to **Keys** section
4. Copy your API key (format: `sk-or-...`)

### 2. Configure for Local Development

Add to `.env.local`:

```bash
OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxxx
```

Then restart your dev server:
```bash
npm run dev
```

### 3. Configure for Vercel Deployment

Using Vercel CLI:

```bash
vercel env add OPENROUTER_API_KEY
# Paste your OpenRouter API key
# Choose which environments: Production / Preview / Development
```

Or via Vercel Dashboard:

1. Go to https://vercel.com/projects
2. Select **tdealer01-crypto-dsg-control-plane**
3. Settings → **Environment Variables**
4. Add new variable:
   - Name: `OPENROUTER_API_KEY`
   - Value: `sk-or-xxxxxxxxxxxxx`
   - Environments: Production, Preview, Development
5. Save
6. Redeploy: `vercel --prod`

---

## Verifying Configuration

### Local Environment

```bash
./scripts/check-llm-backends.sh
```

Expected output when configured:
```
🔍 PROVIDER STATUS:
  OPENROUTER_API_KEY    : ✓ configured
  TOGETHER_API_KEY      : ✗ missing
  ANTHROPIC_API_KEY     : ✗ missing

✅ PRIMARY PROVIDER: OpenRouter
```

### Deployed Instance

```bash
./scripts/check-llm-backends.sh https://tdealer01-crypto-dsg-control-plane.vercel.app
```

Or via curl:

```bash
curl -s https://tdealer01-crypto-dsg-control-plane.vercel.app/api/health | jq '.llm'
```

---

## Provider Selection Logic

The system checks environment variables in this order (priority-based):

1. **OpenRouter** (primary) — if `OPENROUTER_API_KEY` is set
2. **Together AI** — if `TOGETHER_API_KEY` is set (and OpenRouter is not)
3. **Anthropic** — if `ANTHROPIC_API_KEY` is set (and neither OpenRouter nor Together is set)
4. **NVIDIA/Nemotron** (fallback) — if `NVIDIA_API_KEY` is set (attempted only if primary provider fails)
5. **None** — if no providers are configured

The first configured provider is used as the primary backend. NVIDIA is automatically used as a fallback when the primary provider is unavailable.

---

## Supported Models

### OpenRouter

Default: `nousresearch/hermes-3-llama-3.1-70b`

Other options:
- `nousresearch/hermes-3-llama-3.1-405b` (larger model)
- `nousresearch/hermes-3-llama-3.1-8b` (faster, smaller)

Override via environment:
```bash
DSG_BRAIN_MODEL=nousresearch/hermes-3-llama-3.1-405b
```

### Together AI

Default: `NousResearch/Hermes-3-Llama-3.1-70B-FP8`

### Anthropic

Default: `claude-haiku-4-5-20251001`

Override via environment:
```bash
ANTHROPIC_MODEL=claude-opus-4-8
```

### NVIDIA/Nemotron (Fallback)

Default: `nvidia/nemotron-3-ultra-550b-a55b`

Override via environment:
```bash
NVIDIA_MODEL_CHAT=nvidia/nemotron-3-ultra-550b-a55b
```

NVIDIA is automatically used as a fallback provider when:
- Primary provider (`OPENROUTER_API_KEY`, `TOGETHER_API_KEY`, or `ANTHROPIC_API_KEY`) is unavailable
- Primary provider API request fails
- `NVIDIA_API_KEY` is configured in the environment

---

## Troubleshooting

### Issue: "All LLM backends unavailable"

**Check:**
```bash
./scripts/check-llm-backends.sh
```

**Likely causes:**
- None of `OPENROUTER_API_KEY`, `TOGETHER_API_KEY`, `ANTHROPIC_API_KEY`, or `NVIDIA_API_KEY` are set
- All configured API keys are expired or invalid
- All primary providers are experiencing downtime

**Fix:**
1. Verify API key is set: `echo $OPENROUTER_API_KEY`
2. If empty, add to `.env.local` or Vercel env vars
3. Verify API key format (should start with `sk-or-` for OpenRouter)
4. Test API key directly:
   ```bash
   curl -H "Authorization: Bearer sk-or-..." \
     https://openrouter.ai/api/v1/models
   ```

### Issue: API Key Rejected (401/403)

**Causes:**
- API key is incorrect or expired
- Account doesn't have sufficient permissions
- API key has been revoked

**Fix:**
1. Generate a new API key from provider dashboard
2. Update `.env.local` or Vercel env vars
3. Restart dev server or redeploy

### Issue: Slow Response Time

**Causes:**
- Model is overloaded
- Network latency
- Model selection (try smaller model)

**Fix:**
- Try a smaller model: `DSG_BRAIN_MODEL=nousresearch/hermes-3-llama-3.1-8b`
- Check OpenRouter status: https://openrouter.ai/status

---

## Architecture

When Hermes Agent processes a user message:

1. **Route**: `POST /api/hermes/chat` receives the message
2. **Orchestrator**: `lib/hermes-orchestrator.ts` routes to all 5 agent roles in parallel
3. **Provider Selection**: `lib/dsg/brain/model-config.ts` determines primary provider
4. **API Call**: OpenRouter/Together/Anthropic API is called with the message
5. **Response**: Synthesized result is returned to UI

```
User Input
    ↓
/api/hermes/chat
    ↓
orchestrateChat()
    ↓
Detect LLM Provider (OPENROUTER_API_KEY, TOGETHER_API_KEY, ANTHROPIC_API_KEY)
    ↓
Call OpenRouter / Together / Anthropic API
    ↓
Synthesize Multi-Agent Results
    ↓
Return Response
```

---

## Best Practices

1. **Use OpenRouter for development** — broader model access, better uptime monitoring
2. **Keep API keys in Vercel env vars** — never commit to `.env`
3. **Test before production** — verify health check passes on staging
4. **Monitor API usage** — OpenRouter dashboard shows rate limits and costs
5. **Use model-specific tokens** — create restricted API keys for production

---

## Environment Variables Reference

| Variable | Required | Value | Example |
|----------|----------|-------|---------|
| `OPENROUTER_API_KEY` | for primary provider | API key from openrouter.ai | `sk-or-...` |
| `OPENROUTER_MODEL_CHAT` | optional | Model identifier (primary) | `openai/gpt-4.1-mini` |
| `TOGETHER_API_KEY` | for primary provider | API key from api.together.ai | `xxxx...` |
| `ANTHROPIC_API_KEY` | for primary provider | API key from console.anthropic.com | `sk-ant-...` |
| `ANTHROPIC_MODEL` | optional | Model identifier (Anthropic) | `claude-haiku-4-5-20251001` |
| `NVIDIA_API_KEY` | for fallback provider | API key from NVIDIA NGC | `nvapi-...` |
| `NVIDIA_MODEL_CHAT` | optional | Model identifier (NVIDIA) | `nvidia/nemotron-3-ultra-550b-a55b` |
| `DSG_BRAIN_MODEL` | optional | Model identifier | `nousresearch/hermes-3-llama-3.1-70b` |
| `DSG_BRAIN_PROVIDER` | optional | Force provider selection | `nous-hermes` or `anthropic` |

---

## Support

For issues with:
- **OpenRouter**: https://openrouter.ai/docs
- **Together AI**: https://docs.api.together.ai
- **Anthropic**: https://docs.anthropic.com

Or check the deployment logs:
```bash
vercel logs https://tdealer01-crypto-dsg-control-plane.vercel.app --follow
```
