import type { RawDomElement, SafeDomCommand, SafeElementManifest } from '@/lib/dsg/safe-dom/types';

export type GateDecision = 'ALLOW' | 'REVIEW' | 'BLOCK' | 'SAFE_ALTERNATIVE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type HermesRomContext = {
  mode: 'READ_ONLY_OPERATIONAL_MEMORY';
  status: 'PASS' | 'REVIEW' | 'BLOCK';
  contextText: string;
  contextHash: string;
  reasons: string[];
  rule: 'ROM_CONTEXT_CANNOT_OVERRIDE_EVIDENCE_OR_RUNTIME_TRUTH';
};

export type ActionDescriptor = {
  domain: 'browser' | 'form' | 'deployment' | 'payment' | 'permission' | 'file' | 'android' | 'unknown';
  operation: 'read' | 'open' | 'fill' | 'click' | 'submit' | 'send' | 'delete' | 'deploy' | 'pay' | 'change_permission' | 'swipe' | 'long_click' | 'scroll' | 'input_text' | 'get_text' | 'unknown';
  target?: string;
  dataSensitivity: 'public' | 'internal' | 'pii' | 'financial' | 'credential' | 'legal' | 'unknown';
  externalEffect: boolean;
  reversibility: 'reversible' | 'partially_reversible' | 'irreversible' | 'unknown';
  userAuthorized: boolean;
  planAllowed: boolean;
  hasFreshEvidence: boolean;
  hasRollback: boolean;
};

export type PolicyResult = {
  decision: GateDecision;
  risk: RiskLevel;
  reason: string;
  requiredEvidence: string[];
  requiredApproval: boolean;
  safeAlternative?: string;
};

export type HermesDomMirror = {
  mode: 'HERMES_SAFE_DOM_MIRROR';
  frameId: string;
  safeView: unknown;
  manifest: SafeElementManifest[];
  mirrorHash: string;
  romContextHash?: string;
  rule: 'AGENT_CAN_ONLY_ACT_ON_EXPOSED_SAFE_DOM_ELEMENT_IDS';
};

export type BrowserbaseSafeExecutionMode =
  | 'dry_run'
  | 'create_session_only'
  | 'live_execute_disabled_by_default';

export type BrowserbaseSafeCommandInput = {
  workspaceId: string;
  orgId: string;
  agentId: string;
  effectId: string;
  action: string;
  sessionId: string;
  frameId: string;
  rawElements: RawDomElement[];
  command: SafeDomCommand;
  rom: HermesRomContext;
  actionDescriptor: ActionDescriptor;
  executionMode?: BrowserbaseSafeExecutionMode;
};

export type BrowserbaseSafeCompletion = {
  ok: boolean;
  status: 'COMPLETED' | 'WAITING_APPROVAL' | 'BLOCKED' | 'DRY_RUN_COMPLETED';
  decision: GateDecision;
  risk: RiskLevel;
  reason: string;
  completedSafely: boolean;
  executionMode: BrowserbaseSafeExecutionMode;
  trace: {
    romContextHash: string;
    domMirrorHash: string;
    manifestElementCount: number;
    commandElementId: string;
    commandOperation: string;
    selector?: string;
    browserbaseSessionId?: string;
    browserbaseTouchedRealWebsite: false | true;
  };
};
