import { NextRequest, NextResponse } from 'next/server';
import { buildAndPersistManifest, verifySafeDomIntentOrFail, executeVerifiedCommand } from '@/lib/executors/browserbase-safe-dom-integration';
import { internalErrorMessage, logApiError } from '@/lib/security/api-error';
import type { SafeDomCommand, SafeDomElement } from '@/lib/executors/browserbase-safe-dom-integration';

/**
 * POST /api/safe-dom/browserbase/build-manifest
 *
 * Capture live DOM from Browserbase, build Safe DOM manifest, and persist to DB.
 *
 * Request:
 *   {
 *     sessionId: string (UUID of Browserbase session)
 *     frameUrl: string (URL of the frame being captured)
 *     frameId?: string (optional frame identifier, defaults to generated UUID)
 *   }
 *
 * Response:
 *   {
 *     frameId: string
 *     view: SafeDomElement[] (list of safe DOM elements)
 *     manifestId: string (UUID of persisted manifest)
 *     expiresAt: string (ISO timestamp of manifest expiration)
 *   }
 */
async function handleBuildManifest(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { sessionId, frameUrl, frameId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing required field: sessionId' },
        { status: 400 },
      );
    }

    if (!frameUrl) {
      return NextResponse.json(
        { error: 'Missing required field: frameUrl' },
        { status: 400 },
      );
    }

    // Get org from auth context (would come from session/JWT in production)
    const orgId = request.headers.get('x-org-id') || 'default-org';
    const actualFrameId = frameId || `frame-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build and persist manifest
    const manifest = await buildAndPersistManifest(
      sessionId,
      frameUrl,
      actualFrameId,
      orgId,
    );

    return NextResponse.json(
      {
        frameId: actualFrameId,
        view: manifest.elements as SafeDomElement[],
        manifestId: manifest.sessionId,
        expiresAt: manifest.expiresAt,
      },
      { status: 200 },
    );
  } catch (error) {
    logApiError('api/safe-dom/browserbase:build-manifest', error);

    return NextResponse.json(
      { error: internalErrorMessage() },
      { status: 500 },
    );
  }
}

/**
 * POST /api/safe-dom/browserbase/execute-command
 *
 * Verify command against persisted Safe DOM manifest and execute via Browserbase.
 *
 * Request:
 *   {
 *     sessionId: string
 *     frameId: string
 *     command: SafeDomCommand {
 *       elementId?: string
 *       elementPath?: string
 *       action: 'click' | 'type' | 'submit' | 'navigate'
 *       value?: string
 *     }
 *   }
 *
 * Response:
 *   {
 *     success: boolean
 *     sessionId: string
 *     command: SafeDomCommand
 *     executedAt: string (ISO timestamp)
 *   }
 *
 * Error cases:
 *   - 404: Manifest not found or expired
 *   - 403: Command not allowed on element
 *   - 400: Invalid command
 *   - 500: Execution failed
 */
async function handleExecuteCommand(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { sessionId, frameId, command } = body;

    if (!sessionId || !frameId || !command) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, frameId, command' },
        { status: 400 },
      );
    }

    const typedCommand = command as SafeDomCommand;

    if (!typedCommand.action) {
      return NextResponse.json(
        { error: 'Command missing required field: action' },
        { status: 400 },
      );
    }

    // Verify command against manifest
    await verifySafeDomIntentOrFail(sessionId, frameId, typedCommand);

    // Execute verified command
    const result = await executeVerifiedCommand(sessionId, typedCommand);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logApiError('api/safe-dom/browserbase:execute-command', error);

    // Map verification failures to a status + controlled message; raw error
    // text stays server-side.
    const message = (error as Error | null)?.message ?? '';
    let statusCode = 500;
    let safeMessage = internalErrorMessage();
    if (message.includes('not found') || message.includes('expired')) {
      statusCode = 404;
      safeMessage = 'Manifest not found or expired';
    } else if (message.includes('not allowed')) {
      statusCode = 403;
      safeMessage = 'Command not allowed by Safe DOM manifest';
    }

    return NextResponse.json(
      { error: safeMessage },
      { status: statusCode },
    );
  }
}

/**
 * Route handler dispatcher.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path.endsWith('/build-manifest')) {
    return handleBuildManifest(request);
  } else if (path.endsWith('/execute-command')) {
    return handleExecuteCommand(request);
  }

  return NextResponse.json(
    { error: 'Not found' },
    { status: 404 },
  );
}
