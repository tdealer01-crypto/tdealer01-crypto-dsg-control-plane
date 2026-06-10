/**
 * Email Executor with Draft-First Gate
 *
 * Routes email operations through a draft-first requirement.
 * All emails must be reviewed as drafts before sending.
 */

import type { AgentWorkStep } from '../delegation/types';
import { blockedResult, pendingResult, type ToolExecutionResult } from './types';

/**
 * Execute an email step through draft-first gate.
 *
 * Never sends emails directly; always requires draft review first.
 */
export async function executeEmailStep(
  step: AgentWorkStep,
  context: {
    delegation: any;
  },
): Promise<ToolExecutionResult> {
  const action = step.action.toLowerCase();

  // Validate delegation permits email
  const scope = context.delegation?.scope || '';
  if (!scope.includes('email')) {
    return blockedResult('Delegation does not permit email operations');
  }

  // Check if email is explicitly blocked
  if (context.delegation?.blockedActions?.includes(`email.${action}`)) {
    return blockedResult(`Email action "${action}" is blocked by delegation contract`);
  }

  // Parse email details from step
  const recipient = parseRecipient(step.target);
  const subject = step.target?.split('|')[1] || 'No subject';

  if (!recipient) {
    return blockedResult('Email step requires recipient in target field');
  }

  // Email must always go through draft first
  if (action.includes('send') || action.includes('submit')) {
    const draftId = generateDraftId();

    return pendingResult(
      `Email draft created for review before sending to ${recipient}`,
      [
        `draft-id:${draftId}`,
        `recipient:${recipient}`,
        `subject:${subject}`,
        `status:draft`,
      ],
      'REVIEW_DRAFT',
      `/email/drafts/${draftId}`
    );
  }

  // Save as draft action is also allowed
  if (action.includes('draft') || action.includes('save')) {
    const draftId = generateDraftId();

    return pendingResult(
      `Email saved as draft for later review`,
      [
        `draft-id:${draftId}`,
        `recipient:${recipient}`,
        `status:draft`,
      ],
      'REVIEW_DRAFT',
      `/email/drafts/${draftId}`
    );
  }

  return blockedResult(`Unknown email action: ${action}`);
}

/**
 * Parse recipient email from target field.
 * Format: "recipient@example.com" or "recipient@example.com|Subject"
 */
function parseRecipient(target?: string): string | null {
  if (!target) return null;
  const email = target.split('|')[0].trim();
  if (email.includes('@')) return email;
  return null;
}

/**
 * Generate a unique draft ID.
 */
function generateDraftId(): string {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
