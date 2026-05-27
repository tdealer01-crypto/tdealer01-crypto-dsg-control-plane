export type DsgCommandRisk = 'PASS' | 'REVIEW' | 'BLOCK';
export type DsgCommandState =
  | 'queued'
  | 'awaiting_owner'
  | 'approved'
  | 'waiting_permission'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'rejected'
  | 'expired';

export type DsgCommandToolName =
  | 'device.status.get'
  | 'device.open_url'
  | 'device.open_app'
  | 'device.open_settings'
  | 'ui.back'
  | 'ui.home'
  | 'ui.scroll'
  | 'device.notifications.summary';

export type DsgCommandEnvelope = {
  version: 'dsg.command/1';
  commandId: string;
  correlationId: string;
  source: {
    kind: 'chat' | 'cli' | 'mcp' | 'local' | 'dsg-one-v1';
    actorType: 'user' | 'system' | 'device';
    actorId: string;
    sessionId?: string;
  };
  target: {
    deviceId: string;
    platform: 'android';
    channel: 'owner-agent';
  };
  tool: {
    name: DsgCommandToolName;
    class: DsgCommandRisk;
  };
  args: Record<string, unknown>;
  normalizedArgs: Record<string, unknown>;
  policy: {
    decision: 'ALLOW' | 'REVIEW' | 'BLOCK';
    risk: 'low' | 'medium' | 'high' | 'blocked';
    requiresOwnerApproval: boolean;
    requiresPermissions: string[];
    policyVersion: string;
    expiresAt: string;
  };
  idempotency: {
    key: string;
    digest: string;
  };
  approval: {
    state: 'awaiting_owner' | 'approved' | 'rejected' | 'expired';
    boundFields: string[];
    localSignatureRequired: boolean;
  };
  audit: {
    requestedAt: string;
    traceId: string;
  };
  executionState: DsgCommandState;
};

export const POLICY_VERSION = '2026-05-27-owner-command-mvp';
export const COMMAND_TTL_MS = 15 * 60 * 1000;

export const TOOL_POLICY: Record<DsgCommandToolName, {
  class: DsgCommandRisk;
  risk: 'low' | 'medium' | 'high' | 'blocked';
  requiresPermissions: string[];
}> = {
  'device.status.get': { class: 'PASS', risk: 'low', requiresPermissions: [] },
  'device.open_url': { class: 'PASS', risk: 'low', requiresPermissions: [] },
  'device.open_app': { class: 'PASS', risk: 'low', requiresPermissions: [] },
  'device.open_settings': { class: 'PASS', risk: 'low', requiresPermissions: [] },
  'ui.back': { class: 'REVIEW', risk: 'medium', requiresPermissions: ['accessibility'] },
  'ui.home': { class: 'REVIEW', risk: 'medium', requiresPermissions: ['accessibility'] },
  'ui.scroll': { class: 'REVIEW', risk: 'medium', requiresPermissions: ['accessibility'] },
  'device.notifications.summary': { class: 'REVIEW', risk: 'medium', requiresPermissions: ['notification_listener'] },
};

export const BLOCKED_TOOL_PATTERNS = [
  /credential/i,
  /password/i,
  /token/i,
  /secret/i,
  /payment/i,
  /money/i,
  /install/i,
  /uninstall/i,
  /lockscreen/i,
  /bypass/i,
  /hidden/i,
  /silent/i,
  /tap_raw/i,
  /type_text/i,
];
