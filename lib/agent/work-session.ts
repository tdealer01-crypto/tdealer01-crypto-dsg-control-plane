import { buildCommandEnvelope } from '@/lib/commands/normalize';
import type { DsgCommandEnvelope, DsgCommandToolName } from '@/lib/commands/schema';

type StepDraft = {
  title: string;
  toolName: DsgCommandToolName;
  args: Record<string, unknown>;
};

export type WorkSessionPlan = {
  sessionId: string;
  mode: 'work_session';
  goal: string;
  summary: string;
  approvalModel: 'approve_plan_once';
  stopPolicy: 'stop_on_blocked_or_new_permission';
  steps: Array<{
    title: string;
    command: DsgCommandEnvelope;
  }>;
};

function sessionId() {
  return `ws_${crypto.randomUUID()}`;
}

function includesAny(text: string, words: string[]) {
  return words.some((word) => text.includes(word));
}

function extractUrl(text: string) {
  return text.match(/https?:\/\/\S+/)?.[0];
}

function draftSteps(goal: string): StepDraft[] {
  const lower = goal.toLowerCase();
  const url = extractUrl(goal);
  if (url) return [{ title: 'Open requested URL', toolName: 'device.open_url', args: { url } }];

  if (includesAny(lower, ['ตรวจระบบ', 'status', 'สถานะ', 'system check', 'health'])) {
    return [
      { title: 'Open control-plane status', toolName: 'device.open_url', args: { url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status' } },
      { title: 'Open OpenClaw manifest', toolName: 'device.open_url', args: { url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/openclaw' } },
      { title: 'Open DSG One status', toolName: 'device.open_url', args: { url: 'https://dsg-one-v1.vercel.app/api/agent/status' } },
    ];
  }

  if (includesAny(lower, ['ไฟล์', 'file', 'storage', 'sdcard', 'รายการไฟล์'])) {
    return [{ title: 'List shared storage', toolName: 'file.list_root', args: { path: '/sdcard' } }];
  }

  if (includesAny(lower, ['claw', 'ส่งไฟล์', 'send file'])) {
    return [{ title: 'Prepare selected files for Claw', toolName: 'file.send_to_claw', args: { path: '/sdcard', selectedFiles: [] } }];
  }

  if (includesAny(lower, ['setting', 'settings', 'ตั้งค่า'])) {
    return [{ title: 'Open Android settings', toolName: 'device.open_app', args: { packageName: 'com.android.settings' } }];
  }

  if (includesAny(lower, ['back', 'ย้อน'])) return [{ title: 'Go back', toolName: 'ui.back', args: {} }];
  if (includesAny(lower, ['home', 'หน้าหลัก'])) return [{ title: 'Go home', toolName: 'ui.home', args: {} }];
  if (includesAny(lower, ['scroll', 'เลื่อน'])) return [{ title: 'Scroll down', toolName: 'ui.scroll', args: { direction: 'down' } }];

  return [
    { title: 'Open control-plane status', toolName: 'device.open_url', args: { url: 'https://tdealer01-crypto-dsg-control-plane.vercel.app/api/agent/status' } },
  ];
}

export function buildWorkSessionPlan(input: {
  goal: string;
  actorId?: string;
  deviceId?: string;
  sourceKind?: 'chat' | 'cli' | 'mcp' | 'local' | 'dsg-one-v1';
}): WorkSessionPlan {
  const goal = input.goal.trim();
  if (!goal) throw new Error('Missing work session goal');
  const sid = sessionId();
  const drafts = draftSteps(goal);
  const steps = drafts.map((step, index) => ({
    title: step.title,
    command: buildCommandEnvelope({
      sourceKind: input.sourceKind ?? 'chat',
      actorType: 'user',
      actorId: input.actorId ?? 'owner',
      sessionId: sid,
      deviceId: input.deviceId,
      toolName: step.toolName,
      args: step.args,
      idempotencyKey: `${sid}:${index}:${step.toolName}`,
    }),
  }));

  return {
    sessionId: sid,
    mode: 'work_session',
    goal,
    summary: `Prepared ${steps.length} step(s). Owner approves the plan once, then the device agent runs allowed steps and stops only on blocked actions or missing permissions.`,
    approvalModel: 'approve_plan_once',
    stopPolicy: 'stop_on_blocked_or_new_permission',
    steps,
  };
}
