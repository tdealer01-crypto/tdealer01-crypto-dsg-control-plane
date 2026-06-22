/**
 * Hermes AI Agent chat integration
 * Handles natural language conversations for control plane operations
 */

import { ChatMessage, ChatContext, ChatRequest, ChatResponse } from '@/types/chat';

const HERMES_SYSTEM_PROMPT = `You are Hermes, an intelligent AI agent for the DSG Control Plane.
You help users manage executions, monitor system health, and make decisions about distributed tasks.

Your characteristics:
- Respond naturally and conversationally in the user's language (Thai or English)
- Be concise but informative
- Use technical terminology when appropriate
- Always prioritize system safety
- Suggest actions (allow/deny/escalate) when relevant
- Provide reasoning for your recommendations

Guidelines:
1. Acknowledge the user's request
2. Analyze the current system context
3. Provide a clear, actionable response
4. Suggest next steps if needed

Format responses as natural conversation, not lists.`;

/**
 * Send a chat message to Hermes and get a natural language response
 */
export async function chatWithHermes(
  request: ChatRequest
): Promise<ChatResponse> {
  try {
    // Build the messages array for the API
    const messages: Array<{ role: string; content: string }> = [];

    // Add conversation history
    if (request.conversationHistory) {
      messages.push(
        ...request.conversationHistory.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      );
    }

    // Add current message
    messages.push({
      role: 'user',
      content: formatContextForAI(request.message, request.context),
    });

    // Call DSG ONE agent chat (OpenRouter-backed orchestrator)
    const res = await fetch('/api/agent/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        systemPrompt: HERMES_SYSTEM_PROMPT,
        context: request.context,
      }),
    });

    if (!res.ok) {
      throw new Error(`Chat API error: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as {
      ok?: boolean;
      reply?: string;
      response?: string;
      error?: string;
      meta?: Record<string, unknown>;
    };

    return {
      reply: data.reply ?? data.response ?? '',
      action: 'info',
      confidence: data.ok ? 0.9 : 0,
    };
  } catch (error) {
    console.error('[Hermes Chat] Error:', error);
    return {
      reply: 'Sorry, I encountered an error. Please try again.',
      action: 'info',
      confidence: 0,
    };
  }
}

/**
 * Format context information for AI processing
 */
function formatContextForAI(userMessage: string, context?: ChatContext): string {
  let formatted = userMessage;

  if (!context) return formatted;

  const contextParts: string[] = [];

  if (context.executionId) {
    contextParts.push(`Current Execution: ${context.executionId}`);
  }

  if (context.executorMetrics) {
    const { utilization, capacity, queueLength } = context.executorMetrics;
    contextParts.push(
      `Executor Status: ${utilization}% utilized (${Math.round((utilization / 100) * capacity)} / ${capacity}), ` +
      `${queueLength} tasks queued`
    );
  }

  if (context.recentAlerts && context.recentAlerts.length > 0) {
    const alertSummary = context.recentAlerts
      .slice(0, 3)
      .map((a) => `${a.severity}: ${a.message}`)
      .join('; ');
    contextParts.push(`Recent alerts: ${alertSummary}`);
  }

  if (contextParts.length > 0) {
    formatted = `Context: ${contextParts.join(', ')}\n\nUser message: ${userMessage}`;
  }

  return formatted;
}

/**
 * Parse action from Hermes response
 */
export function parseActionFromResponse(reply: string): 'allow' | 'deny' | 'escalate' | 'info' {
  const lowerReply = reply.toLowerCase();

  if (lowerReply.includes('ยืนยัน') || lowerReply.includes('allow') || lowerReply.includes('approve')) {
    return 'allow';
  }

  if (lowerReply.includes('ปฏิเสธ') || lowerReply.includes('deny') || lowerReply.includes('reject')) {
    return 'deny';
  }

  if (lowerReply.includes('ขึ้นไป') || lowerReply.includes('escalate') || lowerReply.includes('urgent')) {
    return 'escalate';
  }

  return 'info';
}

/**
 * Create a new chat message
 */
export function createChatMessage(
  content: string,
  role: 'user' | 'assistant' = 'user',
  metadata?: Record<string, unknown>
): ChatMessage {
  return {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    role,
    content,
    timestamp: new Date(),
    metadata: metadata as any,
  };
}
