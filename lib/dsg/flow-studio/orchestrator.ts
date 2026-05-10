import type { FlowOrchestration, FlowPlan, FlowThought } from './types';

function thought(id: string, category: FlowThought['category'], message: string): FlowThought {
  return { id, category, message };
}

function basePlan(goal: string): FlowPlan {
  return {
    goal: {
      text: goal,
      constraints: [
        'Use deterministic routing before action',
        'Stop on missing approval or credentials',
        'Do not claim remote browser or deployment proof without external evidence',
      ],
    },
    processedInput: {
      raw: goal,
      extractedEntities: {},
      identifiedIntents: [],
      missingRequirements: [],
    },
    toolsRequired: [],
    architecture: {
      systems: [],
      flowSummary: ['Decode intent', 'Create gated plan', 'Execute only approved safe actions', 'Record visible evidence'],
    },
    stages: [],
    risks: [],
    permissions: [],
    definitionOfSuccess: {
      outcomes: [],
      evidence: [],
    },
  };
}

function searchQueryFromGoal(goal: string): string {
  const cleaned = goal.replace(/https?:\/\/[^\s]+/g, '').replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.slice(0, 4).join(' ') || 'Technology';
}

function titleFromGoal(goal: string): string {
  const titleMatch = goal.match(/title\s*(?:to|:)\s*([\w\s-]+)/i) || goal.match(/name\s*(?:to|:)\s*([\w\s-]+)/i);
  return titleMatch?.[1]?.trim().slice(0, 60) || 'DSG Flow Studio';
}

function bgFromGoal(goal: string): string {
  const lower = goal.toLowerCase();
  if (lower.includes('red')) return 'bg-red-600';
  if (lower.includes('blue')) return 'bg-blue-600';
  if (lower.includes('green') || lower.includes('emerald')) return 'bg-emerald-600';
  if (lower.includes('purple')) return 'bg-purple-600';
  if (lower.includes('orange')) return 'bg-orange-600';
  return 'bg-slate-900';
}

export async function createFlowStudioPlan(rawGoal: string): Promise<FlowOrchestration> {
  const goal = rawGoal.trim();
  const lower = goal.toLowerCase();
  const urls = goal.match(/https?:\/\/[^\s]+/g) || [];
  const plan = basePlan(goal);
  const thoughts: FlowThought[] = [thought('t1', 'info', `Flow Studio received goal: ${goal.slice(0, 80)}`)];
  const hasVercel = lower.includes('vercel');
  const isMutation = /(change|update|set|modify).*?(title|color|theme|header|app|ui)/i.test(goal);
  const isSearch = !hasVercel && !isMutation && urls.length === 0;

  plan.processedInput.extractedEntities.urls = urls;

  if (hasVercel) {
    thoughts.push(thought('t2', 'capability', 'Vercel intent detected. Route is planned as user-assisted API inspection, not autonomous deployment.'));
    thoughts.push(thought('t3', 'limitation', 'No token is stored or requested by the server. The user must perform privileged actions manually.'));
    plan.processedInput.identifiedIntents.push('Vercel API inspection');
    plan.processedInput.missingRequirements.push('User-provided Vercel context outside the app');
    plan.toolsRequired.push({ id: 'vercel_context', name: 'Vercel Console/API', purpose: 'Inspect project/deployment state', status: 'requires_auth' });
    plan.architecture.systems.push({ name: 'Vercel', role: 'Deployment platform' });
    plan.stages.push(
      { id: 'vercel_takeover', title: 'User Takeover', purpose: 'User opens Vercel and confirms target project/deployment.', type: 'decide', externalBoundary: true, approvalRequired: true },
      { id: 'vercel_record', title: 'Record Evidence', purpose: 'Record deployment URL/status supplied by user.', type: 'verify', externalBoundary: true, approvalRequired: false },
    );
    plan.risks.push({ level: 'medium', title: 'Credential boundary', impact: 'The app must not handle privileged Vercel tokens in client code.', mitigation: 'Use user takeover and evidence recording only.' });
    plan.permissions.push({ target: 'Vercel privileged action', decision: 'needs_user_takeover', reason: 'External account action requires user control.' });
    plan.definitionOfSuccess.outcomes.push('User confirms Vercel status with visible evidence.');
    plan.definitionOfSuccess.evidence.push('Deployment URL/status copied by user.');
  } else if (isMutation) {
    const headerBg = bgFromGoal(goal);
    const title = titleFromGoal(goal);
    thoughts.push(thought('t2', 'capability', 'Theme mutation intent detected. Production route will produce a dry-run patch only.'));
    thoughts.push(thought('t3', 'limitation', 'Runtime file write is disabled in production integration.'));
    plan.processedInput.identifiedIntents.push('Theme mutation dry-run');
    plan.processedInput.extractedEntities.targetBg = [headerBg];
    plan.processedInput.extractedEntities.targetTitle = [title];
    plan.toolsRequired.push({ id: 'theme_patch', name: 'Theme Patch Preview', purpose: 'Preview UI configuration changes', status: 'available' });
    plan.architecture.systems.push({ name: 'Flow Studio Theme Config', role: 'Dry-run UI state target' });
    plan.stages.push(
      { id: 'theme_inspect', title: 'Read Current Theme', purpose: 'Load current safe theme defaults.', type: 'inspect', externalBoundary: false, approvalRequired: false },
      { id: 'theme_dry_run', title: 'Create Theme Patch', purpose: `Preview ${headerBg} and ${title}.`, type: 'execute', externalBoundary: false, approvalRequired: true },
    );
    plan.risks.push({ level: 'low', title: 'Invalid UI class', impact: 'Unexpected styling if the class is not allowed.', mitigation: 'Use a fixed allowlist of Tailwind classes.' });
    plan.permissions.push({ target: 'theme preview', decision: 'allow', reason: 'Dry-run only; no filesystem mutation.' });
    plan.definitionOfSuccess.outcomes.push('Theme patch preview generated.');
    plan.definitionOfSuccess.evidence.push('Patch JSON returned to user.');
  } else if (urls.length) {
    thoughts.push(thought('t2', 'capability', `URL fetch intent detected for ${urls[0]}.`));
    thoughts.push(thought('t3', 'limitation', 'Production integration restricts fetches through host allowlist.'));
    plan.processedInput.identifiedIntents.push('Remote URL inspection');
    plan.toolsRequired.push({ id: 'safe_fetch', name: 'Allowlisted Fetch', purpose: 'Inspect an approved public resource', status: 'available' });
    plan.architecture.systems.push({ name: 'Allowlisted remote host', role: 'Public data source' });
    plan.stages.push({ id: 'safe_url_fetch', title: 'Fetch Allowlisted URL', purpose: `Fetch ${urls[0]} if host is allowed.`, type: 'execute', externalBoundary: true, approvalRequired: false });
    plan.risks.push({ level: 'medium', title: 'Outbound fetch abuse', impact: 'Unsafe hosts must not be fetched.', mitigation: 'Allowlist public hosts only.' });
    plan.permissions.push({ target: 'remote URL', decision: 'allow', reason: 'Allowed only if host passes allowlist.' });
    plan.definitionOfSuccess.outcomes.push('HTTP status and short body summary recorded.');
    plan.definitionOfSuccess.evidence.push('Status code, content length, snippet.');
  } else if (isSearch) {
    const query = searchQueryFromGoal(goal);
    thoughts.push(thought('t2', 'capability', `Wikipedia/MCP-style search plan generated for: ${query}`));
    thoughts.push(thought('t3', 'limitation', 'This is native HTTP search evidence, not a real remote browser session.'));
    plan.processedInput.identifiedIntents.push('Wikipedia public search', 'MCP-style browser plan');
    plan.processedInput.extractedEntities.searchQuery = [query];
    plan.toolsRequired.push(
      { id: 'mcp_navigate', name: 'mcp_browser_navigate', purpose: 'Represent navigation intent', status: 'available' },
      { id: 'mcp_extract', name: 'mcp_browser_extract_html', purpose: 'Represent extraction intent with native API fallback', status: 'available' },
    );
    plan.architecture.systems.push({ name: 'Wikipedia API', role: 'Public search source' });
    plan.stages.push(
      { id: 'wiki_search', title: 'Search Wikipedia', purpose: `Search for ${query}.`, type: 'execute', externalBoundary: true, approvalRequired: false },
      { id: 'wiki_extract', title: 'Extract Search Result', purpose: 'Return title/snippet evidence from public API.', type: 'inspect', externalBoundary: true, approvalRequired: false },
    );
    plan.risks.push({ level: 'low', title: 'No search result', impact: 'The query may return empty result.', mitigation: 'Return explicit empty-result evidence.' });
    plan.permissions.push({ target: 'Wikipedia public API', decision: 'allow', reason: 'Public allowlisted source.' });
    plan.definitionOfSuccess.outcomes.push('First public result summarized.');
    plan.definitionOfSuccess.evidence.push('Title and snippet from allowlisted public API.');
  } else {
    thoughts.push(thought('t2', 'capability', 'Local analysis mode selected.'));
    plan.processedInput.identifiedIntents.push('Local text analysis');
    plan.toolsRequired.push({ id: 'local_eval', name: 'Local Analysis', purpose: 'Measure prompt text', status: 'available' });
    plan.architecture.systems.push({ name: 'Browser runtime', role: 'Local compute' });
    plan.stages.push({ id: 'local_eval', title: 'Analyze Goal Text', purpose: 'Calculate bytes, chars, and words.', type: 'inspect', externalBoundary: false, approvalRequired: false });
    plan.definitionOfSuccess.outcomes.push('Local analysis completed.');
    plan.definitionOfSuccess.evidence.push('Byte/char/word counts.');
  }

  return { thoughts, plan };
}
