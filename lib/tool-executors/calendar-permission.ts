/**
 * Calendar Executor with Permission Gate
 *
 * Routes calendar operations through delegation permission checks.
 * Validates that event creation is within allowed scope.
 */

import type { AgentWorkStep } from '../delegation/types';
import { blockedResult, pendingResult, successResult, type ToolExecutionResult } from './types';

/**
 * Execute a calendar step through permission gate.
 *
 * Checks delegation permissions before allowing event creation/modification.
 */
export async function executeCalendarStep(
  step: AgentWorkStep,
  context: {
    delegation: any;
  },
): Promise<ToolExecutionResult> {
  const action = step.action.toLowerCase();

  // Validate delegation permits calendar
  const scope = context.delegation?.scope || '';
  if (!scope.includes('calendar')) {
    return blockedResult('Delegation does not permit calendar operations');
  }

  // Check if action is explicitly blocked
  if (context.delegation?.blockedActions?.includes(`calendar.${action}`)) {
    return blockedResult(`Calendar action "${action}" is blocked by delegation contract`);
  }

  // Route to appropriate handler
  if (action.includes('create') || action.includes('add')) {
    return handleCreateEvent(step, context);
  }

  if (action.includes('modify') || action.includes('update')) {
    return handleModifyEvent(step, context);
  }

  if (action.includes('delete') || action.includes('remove')) {
    return handleDeleteEvent(step, context);
  }

  return blockedResult(`Unknown calendar action: ${action}`);
}

/**
 * Handle calendar event creation.
 */
function handleCreateEvent(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // Check if event creation requires confirmation
  if (context.delegation?.requiresUserConfirm?.includes('calendar.create')) {
    return pendingResult(
      `Calendar event requires user confirmation before creation`,
      [
        `event:${step.target}`,
        `action:create`,
        `status:pending-confirm`,
      ],
      'CONFIRM_EVENT',
      `/calendar/events/new?details=${encodeURIComponent(step.target || '')}`
    );
  }

  // Auto-approve event creation if in scope
  const eventId = generateEventId();

  return successResult(
    `Calendar event created`,
    [
      `event-id:${eventId}`,
      `title:${step.target}`,
      `status:created`,
    ]
  );
}

/**
 * Handle calendar event modification.
 */
function handleModifyEvent(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // Modifications may require confirmation depending on delegation
  if (context.delegation?.requiresUserConfirm?.includes('calendar.modify')) {
    return pendingResult(
      `Calendar event modification requires user confirmation`,
      [
        `event:${step.target}`,
        `action:modify`,
      ],
      'CONFIRM_MODIFICATION',
      `/calendar/events/edit?id=${step.target}`
    );
  }

  return successResult(
    `Calendar event modified`,
    [
      `event:${step.target}`,
      `action:modify`,
      `status:updated`,
    ]
  );
}

/**
 * Handle calendar event deletion (typically requires confirmation).
 */
function handleDeleteEvent(
  step: AgentWorkStep,
  context: { delegation: any },
): ToolExecutionResult {
  // Deletions typically require explicit confirmation
  return pendingResult(
    `Calendar event deletion requires explicit user confirmation`,
    [
      `event:${step.target}`,
      `action:delete`,
      `risk:high`,
    ],
    'CONFIRM_DELETE',
    `/calendar/events/delete?id=${step.target}&confirm=required`
  );
}

/**
 * Generate a unique event ID.
 */
function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
