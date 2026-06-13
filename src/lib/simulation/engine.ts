// Simulation Engine - Pure TypeScript, runs on Vercel (no browser needed)
// Provides deterministic simulation of browser actions using ROM DOM

import {
  ROM_REGISTRY,
  type DOMSnapshot,
  type FormSpec,
  type ActionSpec,
  type SimRule,
  type BrowserActions,
  getFormSpec,
  getActionSpec,
  getSimulationRule,
  listRoms,
} from './registry';

export interface SimResult {
  success: boolean;
  data?: any;
  error?: string;
  missing?: string[];
  predictedOutcome?: string;
  nextSteps?: string[];
  submittedData?: any;
  simulationLog?: SimTrace[];
  trace?: SimTrace[];
}

export interface SimTrace {
  step: string;
  input?: any;
  output?: any;
  timestamp: number;
  action?: string;
}

export interface ActionContext {
  [key: string]: any;
}

export class ROMSimulationEngine {
  private rom: DOMSnapshot;
  private romKey: string;

  constructor(romKey: string) {
    const rom = ROM_REGISTRY[romKey];
    if (!rom) {
      throw new Error(`ROM not found: ${romKey}. Available: ${listRoms().join(', ')}`);
    }
    this.rom = rom;
    this.romKey = romKey;
  }

  getRomKey(): string {
    return this.romKey;
  }

  getRom(): DOMSnapshot {
    return this.rom;
  }

  getSelectors(): Record<string, string> {
    return this.rom.selectors;
  }

  getBrowserActions(): BrowserActions {
    return this.rom.browserActions;
  }

  // Simulate form fill - returns predicted outcome
  async simulateFormFill(formName: string, data: Record<string, string>): Promise<SimResult> {
    const form = getFormSpec(this.romKey, formName);
    if (!form) {
      return { success: false, error: `Form not found: ${formName}` };
    }

    // Validate required fields
    const missing = form.fields
      .filter(f => f.required && !data[f.name])
      .map(f => f.name);

    if (missing.length > 0) {
      return {
        success: false,
        error: 'Missing required fields',
        missing
      };
    }

    // Find matching simulation rule
    const rule = getSimulationRule(this.romKey, formName, data);
    const simulationLog: SimTrace[] = [
      { step: 'validate', input: data, output: 'valid', timestamp: Date.now() },
      { step: 'submit', input: { endpoint: form.action, method: form.method, data }, output: 'submitted', timestamp: Date.now() }
    ];

    if (rule) {
      simulationLog.push({
        step: 'simulate',
        input: { rule: rule.trigger },
        output: rule.outcome,
        timestamp: Date.now()
      });

      if (rule.outcome === 'success' || rule.outcome === 'redirect') {
        simulationLog.push({
          step: 'response',
          input: {},
          output: rule.result,
          timestamp: Date.now()
        });
      }
    }

    return {
      success: true,
      predictedOutcome: rule?.outcome || 'redirect',
      nextSteps: rule?.nextSteps || [],
      submittedData: data,
      simulationLog,
      result: rule?.result
    };
  }

  // Simulate data extraction
  async simulateExtract(selectors: string[]): Promise<SimResult> {
    const extracted: Record<string, string> = {};
    const simulationLog: SimTrace[] = [];

    for (const sel of selectors) {
      const cssSelector = this.rom.selectors[sel] || sel;
      // In real implementation: parse this.rom.html with cheerio/jsdom
      // For now: return structured placeholder
      extracted[sel] = `[SIMULATED: ${cssSelector}]`;
      simulationLog.push({
        step: 'extract',
        input: { selector: cssSelector },
        output: extracted[sel],
        timestamp: Date.now()
      });
    }

    return {
      success: true,
      data: extracted,
      simulationLog
    };
  }

  // Simulate single action
  async simulateAction(actionName: string, params?: any): Promise<SimResult> {
    const action = getActionSpec(this.romKey, actionName);
    if (!action) {
      return { success: false, error: `Action not found: ${actionName}` };
    }

    const simulationLog: SimTrace[] = [{
      step: 'action',
      input: { action: actionName, params },
      output: 'simulated',
      timestamp: Date.now()
    }];

    switch (action.type) {
      case 'click':
        return {
          success: true,
          clicked: action.target,
          simulationLog
        };
      case 'type':
        return {
          success: true,
          typed: action.target,
          value: params?.value || '',
          simulationLog
        };
      case 'wait':
        return {
          success: true,
          waited: action.target,
          simulationLog
        };
      case 'navigate':
        return {
          success: true,
          navigated: params?.url || this.rom.url,
          simulationLog
        };
      case 'extract':
        return this.simulateExtract(params?.selectors || []);
      case 'api-call':
        return this.simulateApiCall(action.target, params);
      default:
        return { success: false, error: `Unknown action type: ${action.type}`, simulationLog };
    }
  }

  // Simulate API call
  async simulateApiCall(target: string, params?: any): Promise<SimResult> {
    const rule = getSimulationRule(this.romKey, target, params);
    const simulationLog: SimTrace[] = [
      { step: 'api-call', input: { target, params }, output: 'simulated', timestamp: Date.now() }
    ];

    if (rule) {
      simulationLog.push({
        step: 'simulate',
        input: { rule: rule.trigger },
        output: rule.outcome,
        timestamp: Date.now()
      });
    }

    return {
      success: rule?.outcome !== 'error',
      predictedOutcome: rule?.outcome || 'success',
      result: rule?.result,
      error: rule?.errorMessage,
      simulationLog
    };
  }

  // Simulate action sequence
  async simulateActions(actionNames: string[], context?: ActionContext): Promise<SimResult> {
    const trace: SimTrace[] = [];
    let success = true;
    let lastResult: any = null;

    for (const actionName of actionNames) {
      const result = await this.simulateAction(actionName, context);
      trace.push({
        step: actionName,
        input: context,
        output: result,
        timestamp: Date.now(),
        action: actionName
      });

      if (!result.success) {
        success = false;
        break;
      }
      lastResult = result;
      // Update context with result data
      if (result.submittedData) context = { ...context, ...result.submittedData };
      if (result.data) context = { ...context, ...result.data };
    }

    return {
      success,
      trace,
      data: lastResult
    };
  }

  // Get all available actions for this ROM
  getAvailableActions(): ActionSpec[] {
    return this.rom.actions;
  }

  // Get all available forms
  getAvailableForms(): FormSpec[] {
    return this.rom.forms;
  }

  // Check if auth is required
  requiresAuth(): boolean {
    return this.rom.authRequired;
  }

  // Get simulation rules
  getSimulationRules(): SimRule[] {
    return this.rom.simulationRules;
  }
}

// Factory for creating engines
export class SimulationEngineFactory {
  static create(romKey: string): ROMSimulationEngine {
    return new ROMSimulationEngine(romKey);
  }

  static listAvailable(): string[] {
    return listRoms();
  }
}

// Simulation session for multi-step workflows
export class SimulationSession {
  private engines: Map<string, ROMSimulationEngine> = new Map();
  private context: ActionContext = {};
  private trace: SimTrace[] = [];

  getEngine(romKey: string): ROMSimulationEngine {
    if (!this.engines.has(romKey)) {
      this.engines.set(romKey, new ROMSimulationEngine(romKey));
    }
    return this.engines.get(romKey)!;
  }

  async executeStep(romKey: string, actionName: string, params?: any): Promise<SimResult> {
    const engine = this.getEngine(romKey);
    const result = await engine.simulateAction(actionName, { ...this.context, ...params });

    this.trace.push({
      step: `${romKey}:${actionName}`,
      input: { ...this.context, ...params },
      output: result,
      timestamp: Date.now(),
      action: actionName
    });

    if (result.success) {
      // Merge result data into context
      if (result.submittedData) this.context = { ...this.context, ...result.submittedData };
      if (result.data) this.context = { ...this.context, ...result.data };
      if (result.result) this.context = { ...this.context, ...result.result };
    }

    return result;
  }

  async executeSequence(steps: Array<{ rom: string; action: string; params?: any }>): Promise<SimResult[]> {
    const results: SimResult[] = [];
    for (const step of steps) {
      const result = await this.executeStep(step.rom, step.action, step.params);
      results.push(result);
      if (!result.success) break;
    }
    return results;
  }

  getTrace(): SimTrace[] {
    return [...this.trace];
  }

  getContext(): ActionContext {
    return { ...this.context };
  }

  reset(): void {
    this.engines.clear();
    this.context = {};
    this.trace = [];
  }
}