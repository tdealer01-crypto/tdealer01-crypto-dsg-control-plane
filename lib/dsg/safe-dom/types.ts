export type SafeDomOperation = 'click' | 'type' | 'scroll' | 'press';

export type SafeDomRisk = 'LOW';

export type SafeDomRole =
  | 'button'
  | 'link'
  | 'textbox'
  | 'checkbox'
  | 'menuitem'
  | 'tab'
  | 'generic';

export type RawDomElement = {
  selector: string;
  role: SafeDomRole | string;
  text?: string;
  label?: string;
  value?: string;
  allowedOps?: SafeDomOperation[];
};

export type SafeDomElement = {
  id: string;
  role: SafeDomRole | string;
  text?: string;
  label?: string;
  value?: string;
  allowedOps: SafeDomOperation[];
};

export type SafeDomView = {
  frameId: string;
  url: string;
  title?: string;
  elements: SafeDomElement[];
  removedCount: number;
  redactedCount: number;
  policyVersion: string;
};

export type SafeElementManifest = SafeDomElement & {
  frameId: string;
  selectorHash: string;
  internalSelector: string;
  risk: SafeDomRisk;
  expiresAt: string;
};

export type SafeDomCommand =
  | { frameId: string; op: 'click'; elementId: string }
  | { frameId: string; op: 'type'; elementId: string; text: string }
  | { frameId: string; op: 'scroll'; elementId: string; direction: 'up' | 'down' }
  | { frameId: string; op: 'press'; elementId: string; key: 'Enter' | 'Escape' | 'Tab' | 'Backspace' };

export type SafeDomDecision = 'ALLOW' | 'BLOCK';

export type SafeDomBlockReason =
  | 'ELEMENT_NOT_EXPOSED_TO_AGENT'
  | 'OP_NOT_ALLOWED_FOR_ELEMENT'
  | 'SAFE_VIEW_EXPIRED'
  | 'INVALID_COMMAND_FRAME';

export type SafeDomVerifyResult =
  | { decision: 'ALLOW'; element: SafeElementManifest }
  | { decision: 'BLOCK'; reason: SafeDomBlockReason };

export type SafeDomBuildInput = {
  frameId: string;
  url: string;
  title?: string;
  elements: RawDomElement[];
  now?: Date;
  ttlMs?: number;
};

export type SafeDomBuildResult = {
  view: SafeDomView;
  manifest: SafeElementManifest[];
  removed: RawDomElement[];
};
