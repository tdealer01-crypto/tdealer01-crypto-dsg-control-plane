// ROM DOM Registry - Central index for all DOM snapshots
// Import all JSON files at build time (Next.js will bundle them)

import landing from './landing.json';
import login from './login.json';
import hermesDashboard from './hermes-dashboard.json';
import deliveryProof from './delivery-proof.json';
import readinessReport from './readiness-report.json';
import health from './health.json';
import mcpManifest from './mcp-manifest.json';
import complianceAnnex4 from './compliance-annex4.json';
import ccvsStatus from './ccvs-status.json';
import gateEvaluate from './gate-evaluate.json';

export type { DOMSnapshot } from './types';

// Re-export types
export interface SelectorMap {
  [key: string]: string;
}

export interface FormSpec {
  name: string;
  action: string;
  method: string;
  fields: FieldSpec[];
  submitSelector: string;
  successIndicators: string[];
  errorIndicators?: string[];
}

export interface FieldSpec {
  name: string;
  type: string;
  required: boolean;
  selector: string;
  label?: string;
  default?: string;
  description?: string;
}

export interface ActionSpec {
  name: string;
  type: 'click' | 'type' | 'extract' | 'wait' | 'navigate' | 'api-call';
  target: string;
  description: string;
  waitFor?: string;
  timeout?: number;
  data?: any;
}

export interface SimRule {
  trigger: string;
  condition?: string | Record<string, any>;
  conditions?: Record<string, any>;
  outcome: 'success' | 'redirect' | 'error';
  result?: any;
  redirectUrl?: string;
  nextSteps?: string[];
  errorMessage?: string;
  cookies?: string[];
}

export interface BrowserActions {
  goto?: {
    url: string;
    waitUntil?: string;
    timeout?: number;
  };
  fill?: Array<{
    selector: string;
    value: string;
    delay?: number;
  }>;
  click?: {
    selector: string;
    waitForNavigation?: boolean;
    waitForSelector?: string;
    timeout?: number;
  };
  waitFor?: {
    selector: string;
    state?: 'visible' | 'hidden' | 'attached' | 'detached' | 'url';
    timeout?: number;
  };
  extract?: Record<string, string>;
  navigate?: Record<string, string>;
  logout?: {
    click: string;
    thenClick: string;
    waitForUrl: string;
  };
  cookies?: {
    get: string[];
    set: Record<string, string>;
  };
  api?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    expectedStatus?: number | number[];
    baseUrl?: string;
    endpoints?: Record<string, string>;
    get?: string;
    post?: {
      method: string;
      body: any;
    };
  };
}

export interface DOMSnapshot {
  url: string;
  html: string;
  selectors: SelectorMap;
  forms: FormSpec[];
  actions: ActionSpec[];
  authRequired: boolean;
  simulationRules: SimRule[];
  browserActions: BrowserActions;
}

// Registry - all ROM DOM snapshots
export const ROM_REGISTRY: Record<string, DOMSnapshot> = {
  // Public pages (no auth)
  'landing': landing,
  'delivery-proof': deliveryProof,
  'readiness-report': readinessReport,
  'health': health,
  'mcp-manifest': mcpManifest,
  'compliance-annex4': complianceAnnex4,
  'ccvs-status': ccvsStatus,

  // Protected pages (auth required)
  'login': login,
  'hermes-dashboard': hermesDashboard,
  'gate-evaluate': gateEvaluate,
};

// Helper functions
export function getRom(key: string): DOMSnapshot | undefined {
  return ROM_REGISTRY[key];
}

export function listRoms(): string[] {
  return Object.keys(ROM_REGISTRY);
}

export function getPublicRoms(): string[] {
  return Object.entries(ROM_REGISTRY)
    .filter(([_, rom]) => !rom.authRequired)
    .map(([key]) => key);
}

export function getProtectedRoms(): string[] {
  return Object.entries(ROM_REGISTRY)
    .filter(([_, rom]) => rom.authRequired)
    .map(([key]) => key);
}

export function getFormSpec(romKey: string, formName: string): FormSpec | undefined {
  const rom = ROM_REGISTRY[romKey];
  if (!rom) return undefined;
  return rom.forms.find(f => f.name === formName);
}

export function getActionSpec(romKey: string, actionName: string): ActionSpec | undefined {
  const rom = ROM_REGISTRY[romKey];
  if (!rom) return undefined;
  return rom.actions.find(a => a.name === actionName);
}

export function getSimulationRule(romKey: string, trigger: string, context?: any): SimRule | undefined {
  const rom = ROM_REGISTRY[romKey];
  if (!rom) return undefined;
  return rom.simulationRules.find(rule => {
    if (rule.trigger !== trigger) return false;
    if (rule.condition && context) {
      // Simple condition evaluation
      return evalCondition(rule.condition, context);
    }
    if (rule.conditions && context) {
      return Object.entries(rule.conditions).every(([k, v]) => context[k] === v);
    }
    return true;
  });
}

function evalCondition(condition: string, context: any): boolean {
  try {
    // Safe evaluation - only allow simple comparisons
    const fn = new Function('ctx', `with(ctx) { return ${condition}; }`);
    return fn(context);
  } catch {
    return false;
  }
}

// Action types for the agent
export const ACTION_TYPES = [
  'click', 'type', 'extract', 'wait', 'navigate', 'api-call', 'fill-form'
] as const;

export type ActionType = typeof ACTION_TYPES[number];