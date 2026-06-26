# OpenRouter Quick Reference

**Quick lookup for developers and operators.**

## Setup URLs

- **Web Wizard:** `https://your-app/setup/ai`
- **Connection Test:** `POST /api/setup/test-openrouter`
- **Guide:** `docs/AI_SETUP_WIZARD_GUIDE.md`

## Environment Variables

```env
OPENROUTER_API_KEY=sk-or-...
AI_PRIMARY_MODEL=anthropic/claude-3.5-haiku
AI_FALLBACK_MODELS=mistralai/mistral-7b-instruct,meta-llama/llama-2-7b-chat
AI_TIMEOUT_MS=30000
AI_MAX_RETRIES=3
```

## Code Snippets

### Get Client

```typescript
import { getOpenRouterClient } from '@/lib/openrouter/client';

const client = getOpenRouterClient();
```

### Basic Request

```typescript
const response = await client.complete({
  messages: [{ role: 'user', content: 'Hello' }],
  maxTokens: 1000,
  temperature: 0.7,
});

console.log(response.choices[0].message.content);
```

### Track Usage

```typescript
import { getUsageTracker } from '@/lib/openrouter/usage-tracker';

const tracker = getUsageTracker();
tracker.track(
  response.model,
  response.usage.promptTokens,
  response.usage.completionTokens
);

const stats = tracker.getStats();
console.log(`Cost: $${stats.totalCost}`);
```

### Test Connection

```typescript
const result = await client.testConnection();
if (result.success) {
  console.log(`✓ Connected (${result.latency}ms)`);
} else {
  console.log(`✗ ${result.message}`);
}
```

### Switch Model

```typescript
client.switchPrimaryModel('mistralai/mistral-7b-instruct');
```

### Get Model Chain

```typescript
const chain = client.getModelChain();
// ['primary', 'fallback1', 'fallback2']
```

## Model List

| ID | Name | Speed | Cost |
|----|------|-------|------|
| `anthropic/claude-3.5-haiku` | Claude 3.5 Haiku | ⚡⚡⚡ | $0.8/1k |
| `mistralai/mistral-7b-instruct` | Mistral 7B | ⚡⚡ | $0.14/1k |
| `meta-llama/llama-2-7b-chat` | LLaMA 2 7B | ⚡⚡ | $0.1/1k |
| `microsoft/phi-2` | Phi 2 | ⚡⚡⚡ | $0.2/1k |
| `jondurbin/airoboros-l2-70b` | Airoboros 70B | ⚡ | $0.7/1k |

## API Endpoint

### POST /api/setup/test-openrouter

**Request:**
```json
{
  "apiKey": "sk-or-...",
  "model": "anthropic/claude-3.5-haiku"
}
```

**Response (Success):**
```json
{
  "ok": true,
  "model": "anthropic/claude-3.5-haiku",
  "latency": 123,
  "message": "Connection successful"
}
```

**Response (Error):**
```json
{
  "error": "Invalid API key",
  "statusCode": 401
}
```

## CLI Usage

```bash
# Run interactive setup
node scripts/setup-wizard.js

# Generates:
# - .env.local (or)
# - ai-config.json
```

## Fallback Logic

```
Request sent
  ↓
Try Primary (fails)
  ↓
Try Fallback 1 (fails)
  ↓
Try Fallback 2 (succeeds)
  ↓
Return response
```

## Common Errors

| Error | Fix |
|-------|-----|
| "Invalid API key" | Check key starts with `sk-or-`, regenerate on openrouter.ai |
| "Model not found" | Verify model ID, check openrouter.ai/models |
| "All models failed" | Check internet, verify API key permissions |
| "Connection timeout" | Increase `AI_TIMEOUT_MS`, check openrouter.ai status |

## File Map

```
Web UI:
  app/components/setup/AIWizard.tsx
  app/setup/ai/page.tsx

API:
  app/api/setup/test-openrouter/route.ts

Libraries:
  lib/openrouter/client.ts
  lib/openrouter/usage-tracker.ts

CLI:
  scripts/setup-wizard.js

Tests:
  tests/unit/openrouter-client.test.ts

Examples:
  examples/openrouter-integration.ts

Docs:
  docs/AI_SETUP_WIZARD_GUIDE.md
  docs/OPENROUTER_SETUP_SUMMARY.md
  docs/OPENROUTER_QUICK_REFERENCE.md
```

## Useful Links

- **OpenRouter:** https://openrouter.ai
- **API Docs:** https://openrouter.ai/docs
- **Status Page:** https://openrouter.ai/status
- **API Keys:** https://openrouter.ai/account/api-keys
- **Activity:** https://openrouter.ai/account/activity

## Testing

```bash
# Run tests
npm run test:unit -- openrouter-client.test.ts

# Run all tests
npm run test
```

## Production Checklist

- [ ] API key set in Vercel env vars
- [ ] Primary model ID correct
- [ ] Fallback models configured
- [ ] Connection test passes
- [ ] Usage tracking enabled
- [ ] Monitoring alerts set
- [ ] Cost budget set
- [ ] Error handling implemented

## Performance Tips

- **Fast responses:** Use Claude Haiku
- **Better quality:** Use Mistral 7B
- **Cost savings:** Use LLaMA 2 7B
- **Complex reasoning:** Use Airoboros 70B
- **Batch jobs:** Use cheapest model

## Billing

**Track usage:**
```typescript
const stats = tracker.getStats();
// { totalRequests, totalTokens, totalCost, byModel }
```

**Example costs:**
- 10,000 requests, 100 tokens average = ~$0.80/month (Haiku)
- 10,000 requests, 100 tokens average = ~$0.14/month (Mistral)

**Monitor at:** https://openrouter.ai/account/activity

## Support

- **Docs:** See `docs/AI_SETUP_WIZARD_GUIDE.md`
- **Examples:** See `examples/openrouter-integration.ts`
- **Issues:** Check troubleshooting in guide
- **OpenRouter:** https://discord.gg/openrouter

---

**Last Updated:** 2026-06-26 | Version: 1.0.0
