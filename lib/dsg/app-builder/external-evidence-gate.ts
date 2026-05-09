import { loadExternalAgentContext, type ExternalContextItem } from '@/lib/dsg/agent-runtime/external-context-tools';
import type { AppBuilderJob } from './model';

export type AppBuilderExternalEvidenceGate = {
  status: 'PASS' | 'REVIEW' | 'BLOCK';
  requiresExternalEvidence: boolean;
  searchAttempted: boolean;
  searchPassed: boolean;
  sourceStatus: Array<{
    tool: ExternalContextItem['tool'];
    status: ExternalContextItem['status'];
    sourceUrl?: string;
    reason?: string;
  }>;
  issues: Array<{ code: string; severity: 'INFO' | 'WARN' | 'BLOCK'; message: string }>;
  requiredFixes: string[];
  evidencePrompt: string;
  truthBoundary: string;
};

function textForJob(job: AppBuilderJob) {
  return [
    job.goal?.originalGoal,
    job.goal?.normalizedGoal,
    ...(job.goal?.successCriteria || []),
    ...(job.goal?.constraints || []),
    job.metadata?.rawGoal ? JSON.stringify(job.metadata.rawGoal) : '',
  ].filter(Boolean).join('\n');
}

function requiresExternalEvidence(text: string) {
  return /latest|ล่าสุด|news|ข่าว|current|ปัจจุบัน|today|ตอนนี้|market|ราคา|pricing|คู่แข่ง|competitor|api docs|documentation|docs|sdk|library|endpoint|provider|integration|เชื่อมต่อ|regulation|law|กฎหมาย|compliance|security standard|มาตรฐาน|website|https?:\/\//i.test(text);
}

function requiresUnknownClarification(text: string) {
  return /unknown|ไม่รู้จัก|ไม่เคยรู้|คำเฉพาะ|new api|api ใหม่|provider ใหม่|ระบบใหม่|123/i.test(text);
}

function summarize(items: ExternalContextItem[]) {
  return items.map((item) => ({
    tool: item.tool,
    status: item.status,
    sourceUrl: item.sourceUrl,
    reason: item.reason,
  }));
}

export async function gateAppBuilderExternalEvidence(job: AppBuilderJob): Promise<AppBuilderExternalEvidenceGate> {
  const text = textForJob(job);
  const needsExternal = requiresExternalEvidence(text) || requiresUnknownClarification(text);
  const context = await loadExternalAgentContext(text);
  const searchItems = context.items.filter((item) => item.tool === 'search_engine' || item.tool === 'katzilla_search');
  const searchAttempted = searchItems.some((item) => item.status !== 'skipped');
  const searchPassed = searchItems.some((item) => item.status === 'used');
  const issues: AppBuilderExternalEvidenceGate['issues'] = [];
  const requiredFixes: string[] = [];

  if (!needsExternal) {
    issues.push({ code: 'EXTERNAL_EVIDENCE_NOT_REQUIRED', severity: 'INFO', message: 'The locked goal can be planned from the user-provided requirement without requiring current external evidence.' });
    return {
      status: 'PASS',
      requiresExternalEvidence: false,
      searchAttempted,
      searchPassed,
      sourceStatus: summarize(context.items),
      issues,
      requiredFixes,
      evidencePrompt: context.promptText,
      truthBoundary: 'External search was attempted for context, but the plan is not blocked because this goal does not require current external evidence.',
    };
  }

  if (!searchPassed) {
    issues.push({ code: 'EXTERNAL_SEARCH_EVIDENCE_MISSING', severity: 'BLOCK', message: 'This app-builder goal depends on current, unknown, API, provider, or external evidence, but no search provider returned usable evidence.' });
    requiredFixes.push('Configure a working search provider with DSG_SEARCH_ENGINE_URL/SEARCH_ENGINE_URL or Katzilla search with KATZILLA_API_KEY and KATZILLA_SEARCH_PATH.');
    requiredFixes.push('Provide source files/API docs manually if search is unavailable.');
    requiredFixes.push('Regenerate the plan only after external evidence is available.');
    return {
      status: 'BLOCK',
      requiresExternalEvidence: true,
      searchAttempted,
      searchPassed,
      sourceStatus: summarize(context.items),
      issues,
      requiredFixes,
      evidencePrompt: context.promptText,
      truthBoundary: 'No verified external evidence, no plan. This prevents building abc when the user asked for an unknown/current 123.',
    };
  }

  issues.push({ code: 'EXTERNAL_SEARCH_EVIDENCE_AVAILABLE', severity: 'INFO', message: 'External search evidence is available for the planner.' });
  return {
    status: 'PASS',
    requiresExternalEvidence: true,
    searchAttempted,
    searchPassed,
    sourceStatus: summarize(context.items),
    issues,
    requiredFixes,
    evidencePrompt: context.promptText,
    truthBoundary: 'External evidence is available and may be used to generate the plan. Evidence is still context, not production proof.',
  };
}
