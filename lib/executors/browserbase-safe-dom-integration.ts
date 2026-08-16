import { getSupabaseAdmin } from '../supabase-server';

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

export interface SafeDomElement {
  tagName: string;
  id?: string;
  className?: string;
  path: string;
  allowedInteractions: string[];
  safe: boolean;
}

export interface SafeDomCommand {
  elementId?: string;
  elementPath?: string;
  action: 'click' | 'type' | 'submit' | 'navigate';
  value?: string;
  frameId?: string;
}

export interface SafeDomManifest {
  sessionId: string;
  frameId: string;
  frameUrl: string;
  elements: SafeDomElement[];
  createdAt: string;
  expiresAt: string;
}

/**
 * Browserbase DOM capture is not implemented in this repository yet.
 * An API key alone is not proof that a session DOM was fetched. Fail closed
 * instead of manufacturing a DOM tree.
 */
export async function captureLiveDOM(_sessionId: string): Promise<RawDomElement[]> {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error('BROWSERBASE_API_KEY_NOT_CONFIGURED');
  }
  throw new Error('BROWSERBASE_SAFE_DOM_CAPTURE_NOT_IMPLEMENTED');
}

function buildElementPath(elements: RawDomElement[], index: number): string {
  const element = elements[index];
  if (!element) return '';

  const id = element.id ? `#${element.id}` : '';
  const className = element.className ? `.${element.className.split(' ')[0]}` : '';
  const tag = element.tagName.toLowerCase();
  return id || className ? `${tag}${id}${className}` : tag;
}

function convertToSafeDomElements(rawElements: RawDomElement[], path = ''): SafeDomElement[] {
  const safeElements: SafeDomElement[] = [];

  function walk(elements: RawDomElement[], parentPath: string) {
    elements.forEach((elem) => {
      const localPath = buildElementPath([elem], 0);
      const elemPath = parentPath ? `${parentPath} > ${localPath}` : localPath;
      const isClickable = elem.clickable === true && (elem.visible === true || elem.visible === undefined);
      const isFormElement = ['input', 'textarea', 'select', 'button'].includes(elem.tagName.toLowerCase());

      const allowedInteractions: string[] = [];
      if (isClickable) allowedInteractions.push('click');
      if (isFormElement) allowedInteractions.push('type');
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

      if (elem.children?.length) walk(elem.children, elemPath);
    });
  }

  walk(rawElements, path);
  return safeElements;
}

export async function persistManifest(
  sessionId: string,
  frameId: string,
  frameUrl: string,
  elements: SafeDomElement[],
  orgId: string,
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const manifest: SafeDomManifest = {
    sessionId,
    frameId,
    frameUrl,
    elements,
    createdAt,
    expiresAt,
  };

  const { data, error } = await (supabase.from('safe_dom_manifests' as any) as any)
    .insert({
      session_id: sessionId,
      frame_id: frameId,
      manifest_json: manifest,
      org_id: orgId,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !(data as any)?.id) {
    throw new Error(`SAFE_DOM_MANIFEST_PERSIST_FAILED:${error?.message ?? 'missing_id'}`);
  }

  return String((data as any).id);
}

export async function verifySafeDomIntentOrFail(
  sessionId: string,
  frameId: string,
  command: SafeDomCommand,
): Promise<SafeDomManifest> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase.from('safe_dom_manifests' as any) as any)
    .select('manifest_json, expires_at')
    .eq('session_id', sessionId)
    .eq('frame_id', frameId)
    .single();

  if (error || !data) {
    throw new Error(`Manifest not found for session ${sessionId}, frame ${frameId}`);
  }

  const manifest = (data as any).manifest_json as SafeDomManifest;
  const expiresAt = new Date((data as any).expires_at);
  if (expiresAt < new Date()) throw new Error('Manifest has expired');

  const targetElement = manifest.elements.find(
    (elem) =>
      (command.elementId && elem.id === command.elementId) ||
      (command.elementPath && elem.path === command.elementPath),
  );

  if (!targetElement) {
    throw new Error(`Element not found in manifest: ${command.elementId || command.elementPath}`);
  }
  if (!targetElement.allowedInteractions.includes(command.action)) {
    throw new Error(`Action ${command.action} not allowed on element ${targetElement.id || targetElement.path}`);
  }

  return manifest;
}

/**
 * Browser command execution is deliberately unavailable until a real provider
 * call is implemented and its response can be persisted as evidence.
 */
export async function executeVerifiedCommand(
  _sessionId: string,
  _command: SafeDomCommand,
): Promise<Record<string, unknown>> {
  if (!process.env.BROWSERBASE_API_KEY) {
    throw new Error('BROWSERBASE_API_KEY_NOT_CONFIGURED');
  }
  throw new Error('BROWSERBASE_SAFE_DOM_EXECUTOR_NOT_IMPLEMENTED');
}

export async function buildAndPersistManifest(
  sessionId: string,
  frameUrl: string,
  frameId: string,
  orgId: string,
): Promise<SafeDomManifest> {
  const rawDOM = await captureLiveDOM(sessionId);
  if (rawDOM.length === 0) {
    throw new Error('BROWSERBASE_DOM_EMPTY');
  }

  const elements = convertToSafeDomElements(rawDOM);
  if (elements.length === 0) {
    throw new Error('SAFE_DOM_HAS_NO_ALLOWED_ELEMENTS');
  }

  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await persistManifest(sessionId, frameId, frameUrl, elements, orgId);

  return {
    sessionId,
    frameId,
    frameUrl,
    elements,
    createdAt,
    expiresAt,
  };
}
