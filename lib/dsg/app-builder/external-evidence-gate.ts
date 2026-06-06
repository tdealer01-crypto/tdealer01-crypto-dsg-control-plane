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

function isUserDefinedVirtualPcGoal(text: string) {
  return /virtual pc|pc เสมือน|คอมเสมือน|คอมพิวเตอร์เสมือน|windows|วินโด้|วินโดว์|remote mouse|รีโมตเมาส์|รีโหมดเม้า|mouse api|monitor|มอนิเตอร์|จอ/.test(text);
}

function requiresHardExternalEvidence(text: string) {
  return /latest|ล่าสุด|news|ข่าว|current|ปัจจุบัน|today|ตอนนี้|market price|ราคาล่าสุด|pricing ล่าสุด|คู่แข่ง|competitor|api docs|official docs|documentation ของ|sdk docs|library docs|regulation|law|กฎหมาย|compliance standard|security standard|มาตรฐานภายนอก|https?:\/\//i.test(text);
}

function hasSoftExternalTerms(text: string) {
  return /endpoint|provider|integration|เชื่อมต่อ|api|web|website|search|ค้นหา|external|ภายนอก/i.test(text);
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
  const hardExternalRequired = requiresHardExternalEvidence(text);
  const userDefinedVirtualPc = isUserDefinedVirtualPcGoal(text);
  const context = await loadExternalAgentContext(text);
  const searchItems = context.items.filter((item) => item.tool === 'search_engine' || item.tool === 'katzilla_search');
  const searchAttempted = searchItems.some((item) => item.status !== 'skipped');
  const searchPassed = searchItems.some((item) => item.status === 'used');
  const issues: AppBuilderExternalEvidenceGate['issues'] = [];
  const requiredFixes: string[] = [];

  if (hardExternalRequired && !searchPassed) {
    issues.push({ code: 'EXTERNAL_SEARCH_EVIDENCE_MISSING', severity: 'BLOCK', message: 'This app-builder goal asks for current, official docs, URL, law, market, or external factual evidence, but no search provider returned usable evidence.' });
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

  if (hardExternalRequired && searchPassed) {
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

  if (userDefinedVirtualPc) {
    issues.push({ code: 'USER_DEFINED_REQUIREMENT_ACCEPTED', severity: 'INFO', message: 'The Virtual PC / remote mouse requirement is user-defined and can be planned from the locked goal without external search proof.' });
    if (hasSoftExternalTerms(text) && !searchPassed) {
      issues.push({ code: 'SOFT_EXTERNAL_CONTEXT_UNAVAILABLE', severity: 'WARN', message: 'Search was unavailable, but this does not block the plan because the build target is a user-defined governed app contract. Real Windows VM/provider verification remains blocked until provider proof exists.' });
    }
    return {
      status: 'PASS',
      requiresExternalEvidence: false,
      searchAttempted,
      searchPassed,
      sourceStatus: summarize(context.items),
      issues,
      requiredFixes,
      evidencePrompt: context.promptText,
      truthBoundary: 'User-defined app requirements can proceed without external search. Do not claim a real Windows VM/provider until separate runtime/provider proof exists.',
    };
  }

  if (hasSoftExternalTerms(text) && !searchPassed) {
    issues.push({ code: 'SOFT_EXTERNAL_CONTEXT_UNAVAILABLE', severity: 'WARN', message: 'Search was attempted but unavailable. The planner may continue only from user-provided requirements and must not claim external facts or provider proof.' });
    return {
      status: 'PASS',
      requiresExternalEvidence: false,
      searchAttempted,
      searchPassed,
      sourceStatus: summarize(context.items),
      issues,
      requiredFixes,
      evidencePrompt: context.promptText,
      truthBoundary: 'Search context is unavailable. The plan may use only the user-provided requirement and must block any claim needing external proof.',
    };
  }

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
