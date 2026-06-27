import { NextResponse } from 'next/server';
import { buildDryRunHermesRomContext } from '@/lib/dsg/hermes-e2e/rom';
import { internalErrorMessage, logApiError } from '@/lib/security/api-error';
import { executeBrowserbaseSafeDomCommand } from '@/lib/dsg/hermes-e2e/browserbase-safe-adapter';
import type { RawDomElement, SafeDomCommand } from '@/lib/dsg/safe-dom/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const goal = typeof body.goal === 'string'
      ? body.goal
      : 'Fill safe website form without touching real website';

    const frameId = typeof body.frameId === 'string' ? body.frameId : 'frame_demo';

    const rawElements: RawDomElement[] = Array.isArray(body.rawElements)
      ? body.rawElements
      : [
          {
            selector: '#name',
            role: 'input',
            label: 'Name',
            allowedOps: ['type'],
          },
          {
            selector: '#message',
            role: 'textarea',
            label: 'Message',
            allowedOps: ['type'],
          },
          {
            selector: '#submit',
            role: 'button',
            text: 'Submit',
            allowedOps: ['click'],
          },
          {
            selector: '#delete-account',
            role: 'button',
            text: 'Delete account',
            allowedOps: ['click'],
          },
        ];

    const rom = buildDryRunHermesRomContext({
      goal,
      policyHints: [
        'safe_dom_required',
        'browserbase_create_session_only_allowed',
        'no_real_website_navigation',
      ],
    });

    const command: SafeDomCommand = body.command ?? {
      frameId,
      elementId: '',
      operation: 'click',
    };

    if (!command.elementId) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: 'COMMAND_ELEMENT_ID_REQUIRED',
            message: 'Build manifest first or use integration test to derive deterministic element id.',
          },
        },
        { status: 400 },
      );
    }

    const result = await executeBrowserbaseSafeDomCommand({
      workspaceId: body.workspaceId ?? 'demo-workspace',
      orgId: body.orgId ?? 'demo-org',
      agentId: body.agentId ?? 'hermes',
      effectId: body.effectId ?? `effect-${Date.now()}`,
      action: body.action ?? 'safe_dom_form_action',
      sessionId: body.sessionId ?? 'dry-run-session',
      frameId,
      rawElements,
      command,
      rom,
      actionDescriptor: body.actionDescriptor ?? {
        domain: 'form',
        operation: command.operation === 'type' ? 'fill' : 'submit',
        target: 'demo form',
        dataSensitivity: 'internal',
        externalEffect: command.operation === 'click',
        reversibility: 'partially_reversible',
        userAuthorized: true,
        planAllowed: true,
        hasFreshEvidence: true,
        hasRollback: true,
      },
      executionMode: body.executionMode ?? 'dry_run',
    });

    return NextResponse.json(result);
  } catch (error) {
    logApiError('api/hermes/e2e/browserbase-safe-dom', error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'HERMES_BROWSERBASE_SAFE_DOM_E2E_FAILED',
          message: internalErrorMessage(),
        },
      },
      { status: 500 },
    );
  }
}
