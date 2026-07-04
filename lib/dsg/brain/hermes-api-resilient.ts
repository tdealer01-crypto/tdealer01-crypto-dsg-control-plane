/**
 * Resilient Hermes API Caller with Retry & Fallback
 *
 * Features:
 * - Exponential backoff retry (3 attempts)
 * - Automatic fallback to free models on quota/error
 * - Dynamic free model detection
 * - Detailed error logging without exposing secrets
 */

import {
  detectFreeModels,
  shouldFallbackOnError,
  getModelFallbackList,
  type OpenRouterModel,
} from './openrouter-free-models';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
  name?: string;
}

interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: { name: string; arguments: string };
      }>;
    };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface CallOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  enableFallback?: boolean;
}

const DEFAULT_OPTIONS: Required<CallOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  enableFallback: true,
};

/**
 * Sleep for specified milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make a single API call to OpenRouter.
 */
async function makeApiCall(
  baseUrl: string,
  authHeader: string,
  messages: OpenAIMessage[],
  tools: OpenAITool[],
  model: string,
  maxTokens: number,
  headers?: Record<string, string>,
): Promise<OpenAIResponse> {
  const body = {
    model,
    messages,
    tools,
    tool_choice: 'auto',
    max_tokens: maxTokens,
    temperature: 0.1,
  };

  const allHeaders: Record<string, string> = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    ...headers,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: allHeaders,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => response.statusText);

    // Provide helpful error message for auth failures
    let errorMessage = `API error ${response.status}`;
    if (response.status === 401) {
      errorMessage = 'OpenRouter authentication failed (HTTP 401). Check that OPENROUTER_API_KEY is valid and the account exists.';
    } else if (response.status === 403) {
      errorMessage = 'OpenRouter access forbidden (HTTP 403). The API key may lack required permissions.';
    } else {
      errorMessage += ': ' + errText;
    }

    const error = new Error(errorMessage);
    (error as any).statusCode = response.status;
    (error as any).errorText = errText;
    (error as any).isAuthError = response.status === 401 || response.status === 403;
    throw error;
  }

  return (await response.json()) as OpenAIResponse;
}

/**
 * Call Hermes API with resilience: retry + fallback to free models.
 *
 * Flow:
 * 1. Try primary model up to maxRetries times (with exponential backoff)
 * 2. If quota/not-found error, switch to free models
 * 3. Try free models in order
 * 4. Give up and throw final error
 */
export async function callHermesAPIResilient(
  baseUrl: string,
  authHeader: string,
  messages: OpenAIMessage[],
  tools: OpenAITool[],
  primaryModel: string,
  maxTokens: number = 2048,
  customHeaders?: Record<string, string>,
  options: CallOptions = {},
): Promise<OpenAIResponse> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  let lastError: Error | null = null;
  const errors: Array<{ model: string; attempt: number; statusCode?: number; message: string }> = [];

  // Phase 1: Try primary model with retries
  console.log('[DSG Hermes] Starting API call with primary model', { model: primaryModel, maxRetries: opts.maxRetries });

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      const result = await makeApiCall(
        baseUrl,
        authHeader,
        messages,
        tools,
        primaryModel,
        maxTokens,
        customHeaders,
      );
      console.log('[DSG Hermes] Primary model succeeded', { model: primaryModel, attempt });
      return result;
    } catch (err) {
      lastError = err as Error;
      const statusCode = (err as any).statusCode;
      const errorText = (err as any).errorText || '';

      errors.push({
        model: primaryModel,
        attempt: attempt + 1,
        statusCode,
        message: lastError.message,
      });

      console.warn('[DSG Hermes] Primary model failed', {
        model: primaryModel,
        attempt: attempt + 1,
        statusCode,
        shouldFallback: shouldFallbackOnError(statusCode, errorText),
      });

      // Check if we should fallback instead of retrying
      if (shouldFallbackOnError(statusCode, errorText)) {
        console.log('[DSG Hermes] Fallback triggered due to error', { statusCode });
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < opts.maxRetries - 1) {
        const delayMs = opts.initialDelayMs * Math.pow(2, attempt);
        console.log('[DSG Hermes] Retrying after backoff', { delayMs });
        await sleep(delayMs);
      }
    }
  }

  // Phase 2: Try free models if fallback enabled
  if (opts.enableFallback) {
    console.log('[DSG Hermes] Attempting fallback to free models');
    try {
      const modelList = await getModelFallbackList(primaryModel);
      const freeModels = modelList.slice(1); // Skip primary model

      for (const freeModel of freeModels) {
        try {
          console.log('[DSG Hermes] Trying free model fallback', { model: freeModel });
          const result = await makeApiCall(
            baseUrl,
            authHeader,
            messages,
            tools,
            freeModel,
            maxTokens,
            customHeaders,
          );
          console.log('[DSG Hermes] Free model succeeded', { model: freeModel });
          return result;
        } catch (err) {
          lastError = err as Error;
          const statusCode = (err as any).statusCode;

          errors.push({
            model: freeModel,
            attempt: 1,
            statusCode,
            message: lastError.message,
          });

          console.warn('[DSG Hermes] Free model failed', { model: freeModel, statusCode });
          // Continue to next free model
        }
      }
    } catch (cacheErr) {
      console.error('[DSG Hermes] Free models detection failed', { error: String(cacheErr) });
      // Continue to final error
    }
  }

  // All attempts exhausted
  console.error('[DSG Hermes] All retry and fallback attempts exhausted', {
    primaryModel,
    totalAttempts: errors.length,
    errors: errors.map((e) => ({ model: e.model, statusCode: e.statusCode, attempt: e.attempt })),
  });

  // Check if this is an auth error — if so, provide clearer message
  const hasAuthError = errors.some((e) => e.statusCode === 401 || e.statusCode === 403);
  if (hasAuthError) {
    throw new Error(
      'OpenRouter API authentication failed. Ensure OPENROUTER_API_KEY is set correctly and the account is active. ' +
      `Status: ${lastError?.message || 'unknown'}`,
    );
  }

  throw new Error(
    `Hermes API exhausted all retries and fallbacks (${errors.length} attempts). ` +
    `Last error: ${lastError?.message || 'unknown'}`,
  );
}

/**
 * Detect if error is recoverable via fallback.
 */
export function isRecoverableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const statusCode = (error as any).statusCode;
  const errorText = (error as any).errorText || error.message || '';
  return shouldFallbackOnError(statusCode, errorText);
}

/**
 * Format error for logging (safe, no secrets).
 */
export function formatHermesError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const statusCode = (error as any).statusCode;
  if (statusCode) {
    return `${statusCode}: ${error.message}`;
  }
  return error.message;
}
