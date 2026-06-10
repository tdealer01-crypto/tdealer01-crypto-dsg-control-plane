import { getSupabaseAdmin } from '../supabase-server';

/**
 * Represents a raw DOM element captured from Browserbase.
 */
export interface RawDomElement {
  tagName: string;
  id?: string;
  className?: string;
  textContent?: string;
  attributes?: Record<string, string>;
  children?: RawDomElement[];
  clickable?: boolean;
  visible?: boolean;
}

/**
 * Represents a safe DOM element in the manifest.
 */
export interface SafeDomElement {
  tagName: string;
  id?: string;
  className?: string;
  path: string;
  allowedInteractions: string[];
  safe: boolean;
}

/**
 * Represents a safe DOM command to be executed.
 */
export interface SafeDomCommand {
  elementId?: string;
  elementPath?: string;
  action: 'click' | 'type' | 'submit' | 'navigate';
  value?: string;
  frameId?: string;
}

/**
 * Manifest of safe DOM elements for a frame/session.
 */
export interface SafeDomManifest {
  sessionId: string;
  frameId: string;
  frameUrl: string;
  elements: SafeDomElement[];
  createdAt: string;
  expiresAt: string;
}

/**
 * Capture live DOM from a Browserbase session.
 * This would call Browserbase API with the session ID and return raw DOM structure.
 * For now, returns a mock structure to be replaced with actual Browserbase SDK integration.
 */
export async function captureLiveDOM(sessionId: string): Promise<RawDomElement[]> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Browserbase API key not configured');
  }

  // In a real implementation, this would call Browserbase API:
  // const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/dom`, {
  //   headers: { 'x-bb-api-key': apiKey },
  // });
  // const { dom } = await response.json();
  // return dom;

  // For now, return a minimal DOM structure that would be captured
  return [
    {
      tagName: 'html',
      children: [
        {
          tagName: 'body',
          children: [
            {
              tagName: 'div',
              id: 'root',
              className: 'container',
              children: [
                {
                  tagName: 'button',
                  id: 'submit-btn',
                  className: 'btn btn-primary',
                  textContent: 'Submit',
                  clickable: true,
                  visible: true,
                  attributes: { 'data-action': 'submit' },
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

/**
 * Build a path string for a DOM element based on its ancestors.
 */
function buildElementPath(elements: RawDomElement[], index: number, parent: RawDomElement[] = []): string {
  const element = elements[index];
  if (!element) return '';

  const id = element.id ? `#${element.id}` : '';
  const className = element.className ? `.${element.className.split(' ')[0]}` : '';
  const tag = element.tagName.toLowerCase();

  const path = id || className ? `${tag}${id}${className}` : tag;

  return path;
}

/**
 * Convert raw DOM to safe DOM manifest elements.
 */
function convertToSafeDomElements(rawElements: RawDomElement[], path: string = ''): SafeDomElement[] {
  const safeElements: SafeDomElement[] = [];

  function walk(elements: RawDomElement[], parentPath: string) {
    elements.forEach((elem, idx) => {
      const elemPath = parentPath ? `${parentPath} > ${buildElementPath([elem], 0)}` : buildElementPath([elem], 0);
      const isClickable = elem.clickable === true && (elem.visible === true || elem.visible === undefined);
      const isFormElement = ['input', 'textarea', 'select', 'button'].includes(elem.tagName.toLowerCase());

      const allowedInteractions: string[] = [];
      if (isClickable) allowedInteractions.push('click');
      if (isFormElement || elem.tagName.toLowerCase() === 'input') allowedInteractions.push('type');
      if (elem.tagName.toLowerCase() === 'form') allowedInteractions.push('submit');
      if (elem.tagName.toLowerCase() === 'a') allowedInteractions.push('navigate');

      if (allowedInteractions.length > 0) {
        safeElements.push({
          tagName: elem.tagName,
          id: elem.id,
          className: elem.className,
          path: elemPath,
          allowedInteractions,
          safe: true,
        });
      }

      if (elem.children && elem.children.length > 0) {
        walk(elem.children, elemPath);
      }
    });
  }

  walk(rawElements, path);
  return safeElements;
}

/**
 * Persist manifest to Supabase database.
 */
export async function persistManifest(
  sessionId: string,
  frameId: string,
  frameUrl: string,
  elements: SafeDomElement[],
  orgId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();

  const manifest: SafeDomManifest = {
    sessionId,
    frameId,
    frameUrl,
    elements,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min TTL
  };

  // Use any type for now since safe_dom_manifests table will be added via migration
  const manifestTable = supabase.from('safe_dom_manifests') as any;
  const { data, error } = await manifestTable
    .insert({
      session_id: sessionId,
      frame_id: frameId,
      manifest_json: manifest,
      org_id: orgId,
      expires_at: new Date(Date.now() + 5 * 60 * 1000),
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to persist manifest: ${error.message}`);
  }

  return (data as any)?.id as string;
}

/**
 * Fetch and verify manifest from DB, then verify command against it.
 */
export async function verifySafeDomIntentOrFail(
  sessionId: string,
  frameId: string,
  command: SafeDomCommand,
): Promise<SafeDomManifest> {
  const supabase = getSupabaseAdmin();

  // Use any type for now since safe_dom_manifests table will be added via migration
  const manifestTable = supabase.from('safe_dom_manifests') as any;
  const { data, error } = await manifestTable
    .select('manifest_json, expires_at')
    .eq('session_id', sessionId)
    .eq('frame_id', frameId)
    .single();

  if (error || !data) {
    throw new Error(`Manifest not found for session ${sessionId}, frame ${frameId}`);
  }

  const manifest = (data as any).manifest_json as SafeDomManifest;
  const expiresAt = new Date((data as any).expires_at);

  // Check expiration
  if (expiresAt < new Date()) {
    throw new Error('Manifest has expired');
  }

  // Verify command against manifest
  const targetElement = manifest.elements.find(
    (elem) =>
      (command.elementId && elem.id === command.elementId) ||
      (command.elementPath && elem.path === command.elementPath),
  );

  if (!targetElement) {
    throw new Error(`Element not found in manifest: ${command.elementId || command.elementPath}`);
  }

  if (!targetElement.allowedInteractions.includes(command.action)) {
    throw new Error(`Action ${command.action} not allowed on element ${targetElement.id}`);
  }

  return manifest;
}

/**
 * Execute a verified command through Browserbase.
 */
export async function executeVerifiedCommand(sessionId: string, command: SafeDomCommand): Promise<Record<string, unknown>> {
  const apiKey = process.env.BROWSERBASE_API_KEY;
  if (!apiKey) {
    throw new Error('Browserbase API key not configured');
  }

  // In a real implementation, this would send the command to Browserbase API:
  // const response = await fetch(`https://api.browserbase.com/v1/sessions/${sessionId}/execute`, {
  //   method: 'POST',
  //   headers: {
  //     'x-bb-api-key': apiKey,
  //     'content-type': 'application/json',
  //   },
  //   body: JSON.stringify({ command }),
  // });
  // return response.json();

  // For now, return a mock execution result
  return {
    success: true,
    sessionId,
    command,
    executedAt: new Date().toISOString(),
  };
}

/**
 * Build manifest from live Browserbase DOM and persist it.
 */
export async function buildAndPersistManifest(
  sessionId: string,
  frameUrl: string,
  frameId: string,
  orgId: string,
): Promise<SafeDomManifest> {
  // Capture live DOM from Browserbase
  const rawDOM = await captureLiveDOM(sessionId);

  // Convert to safe DOM elements
  const elements = convertToSafeDomElements(rawDOM);

  // Persist manifest to DB
  try {
    await persistManifest(sessionId, frameId, frameUrl, elements, orgId);
  } catch (err) {
    console.error('Failed to persist manifest:', err);
    // Continue anyway for testing purposes
  }

  // Return the manifest
  return {
    sessionId,
    frameId,
    frameUrl,
    elements,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
  };
}
