# Hermes OpenRouter Resilience & Auto-Fallback

## Overview

The Hermes LLM integration now includes automatic resilience features:

- **Exponential Backoff Retry** — Retries failed requests with 1s, 2s, 4s delays
- **Automatic Fallback to Free Models** — Detects available free models on OpenRouter and switches automatically
- **Dynamic Model Detection** — Caches free models list for 1 hour to avoid excessive API calls
- **Error Classification** — Distinguishes recoverable errors (429, 404, 503) from permanent errors

## Architecture

```
User Request
    ↓
[Phase 1: Primary Model Retry]
    ├─ Attempt 1: primary-model → OK? Return result
    ├─ Attempt 2 (after 1s): primary-model → OK? Return result
    ├─ Attempt 3 (after 2s): primary-model → 429? Trigger fallback
    │
[Phase 2: Free Models Fallback]
    ├─ Detect free models from OpenRouter API (cached 1h)
    ├─ Try free-model-1 → OK? Return result
    ├─ Try free-model-2 → OK? Return result
    └─ Try free-model-3 → All failed? Throw error
```

## Files

### New Modules

1. **`lib/dsg/brain/openrouter-free-models.ts`**
   - `detectFreeModels()` — Fetch and cache free models
   - `shouldFallbackOnError()` — Classify errors for fallback decision
   - `getModelFallbackList()` — Ordered list of models to try
   - Cache TTL: 1 hour

2. **`lib/dsg/brain/hermes-api-resilient.ts`**
   - `callHermesAPIResilient()` — Main resilient caller with retry + fallback
   - `isRecoverableError()` — Check if error warrants fallback
   - `formatHermesError()` — Safe error formatting (no secrets)

### Modified Files

- **`app/api/dsg/brain/execute/route.ts`**
  - Updated `generatePlanWithLLM()` to use resilient caller
  - Now passes `provider` parameter to use correct API

## Usage

### From Code

```typescript
import { callHermesAPIResilient } from '@/lib/dsg/brain/hermes-api-resilient';

const result = await callHermesAPIResilient(
  'https://openrouter.ai/api/v1',        // base URL
  `Bearer ${process.env.OPENROUTER_API_KEY}`,  // auth
  messages,                                // OpenAI-format messages
  tools,                                   // OpenAI-format tools
  'nousresearch/hermes-3-llama-3.1-70b',  // primary model
  2048,                                    // max tokens
  { 'HTTP-Referer': 'https://...' },     // optional headers
  {
    maxRetries: 3,          // retries for primary model
    initialDelayMs: 1000,   // backoff delay
    enableFallback: true,   // switch to free models on error
  }
);
```

### From API Route

```typescript
// POST /api/dsg/brain/execute automatically uses resilience
{
  "input": "list files in /tmp",
  "allowedCommands": ["ls", "cat"],
  "allowedPaths": ["/tmp"]
}
```

If primary model is quota-exceeded (429), the API will:
1. Retry 3 times with backoff
2. On 429, detect free models from OpenRouter
3. Try free models in order until one succeeds
4. Return plan using whichever model succeeded

## Free Models Detection

### What Models Are "Free"?

A model is free if:
- `pricing.prompt = 0`
- `pricing.completion = 0`

Examples (may change):
- `mistral-7b-instruct:free`
- `neural-chat-7b-v3:free`
- `openrouter/auto` (load-balanced free)

### Cache Behavior

- **First Request** — Fetch models from OpenRouter API
- **Subsequent Requests** (within 1h) — Use cached list
- **After 1h** — Refetch to pick up new free models
- **Cache Miss** — Falls back to known free models list

### Clear Cache (Testing/Debugging)

```typescript
import { clearFreeModelsCache } from '@/lib/dsg/brain/openrouter-free-models';
clearFreeModelsCache();
```

## Error Handling

### Recoverable Errors (Trigger Fallback)

| Status | Reason | Example |
|--------|--------|---------|
| 429 | Rate limited / quota exceeded | "Too Many Requests" |
| 404 | Model not found / deprecated | "Model not found" |
| 503 | Service unavailable | "Service Unavailable" |
| 400 | Model unsupported | "Model is unsupported" |

### Non-Recoverable Errors (No Fallback)

| Status | Reason |
|--------|--------|
| 401 | Invalid API key |
| 400 | Invalid request format |
| 403 | Permission denied |

### Example Error Response

```json
{
  "success": false,
  "planHash": "",
  "violations": [],
  "message": "Hermes API exhausted all retries and fallbacks (4 attempts). Last error: 429: Too Many Requests"
}
HTTP 500
```

## Logging

The resilient caller logs all attempts:

```
[DSG Hermes] Starting API call with primary model { model: 'nousresearch/hermes-3-llama-3.1-70b', maxRetries: 3 }
[DSG Hermes] Primary model failed { model: '...', attempt: 1, statusCode: 429, shouldFallback: true }
[DSG Hermes] Fallback triggered due to error { statusCode: 429 }
[DSG Hermes] Detected free models on OpenRouter { count: 2, models: ['mistral-7b-instruct:free', ...] }
[DSG Hermes] Trying free model fallback { model: 'mistral-7b-instruct:free' }
[DSG Hermes] Free model succeeded { model: 'mistral-7b-instruct:free' }
```

## Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-...

# Optional (defaults shown)
DSG_BRAIN_PROVIDER=nous-hermes
DSG_BRAIN_MODEL=nousresearch/hermes-3-llama-3.1-70b
```

## Limitations

### Truth Boundary

- ✅ Automatic retry with exponential backoff
- ✅ Dynamic free model detection from OpenRouter API
- ✅ Cache with 1-hour TTL for efficiency
- ❌ No guarantee free models remain available
- ❌ OpenRouter free tier is rate-limited (may be 429'd again)
- ❌ Free models may be slower / lower quality than primary

### Performance Notes

- **Free Model Detection API Call** — ~200ms, cached for 1h
- **Backoff Delays** — 1s, 2s, 4s between retries
- **Total Max Timeout** — ~7 seconds (3 retries + detection call + fallback attempts)

## Testing

```bash
npm run test:unit -- dsg-brain-openrouter-resilient.test.ts
```

Tests cover:
- Free model detection
- Error classification
- Retry logic
- Fallback switching
- Error exhaustion

## Monitoring & Alerts

### Key Metrics

1. **Fallback Rate** — How often primary model fails
2. **Free Model Success Rate** — If fallback succeeds
3. **API Error Distribution** — 429 vs 404 vs 503

### Recommended Alerts

- Alert if fallback succeeds > 10% of requests (primary quota low)
- Alert if all attempts exhausted > 1% of requests (system unavailable)
- Track free model list changes daily

### Log Queries (PostHog/Sentry)

```sql
-- Fallback triggered
WHERE message contains "Fallback triggered" group by statusCode

-- All retries exhausted
WHERE message contains "exhausted all retries"

-- Free model success rate
WHERE "Free model succeeded" count / WHERE "Trying free model fallback" count
```

## Future Improvements

1. **Smart Model Selection** — Pick free model by latency/cost
2. **Quota Prediction** — Pre-detect quota shortage before 429
3. **Multi-Provider Fallback** — Try Anthropic API if OpenRouter fails
4. **Rate Limit Headers** — Parse OpenRouter headers to detect quota early
5. **Circuit Breaker** — Temporarily disable model after repeated failures

## Troubleshooting

### "OPENROUTER_API_KEY not configured"

Set environment variable:
```bash
OPENROUTER_API_KEY=sk-or-<your-key>
```

### Fallback not triggering on 429

Check logs for "shouldFallback: true/false". If false, error classification may have changed. Verify error response format matches expected pattern.

### Free models exhausted quickly

OpenRouter free tier is rate-limited per IP. Use paid tier or rotate API key between requests.

### Cache stuck with old models

Call `clearFreeModelsCache()` in tests. Cache auto-refreshes after 1h in production.

## References

- OpenRouter API: https://openrouter.ai/api/v1
- Model list: https://openrouter.ai/api/v1/models
- Free models: Filter where pricing.prompt=0 AND pricing.completion=0
