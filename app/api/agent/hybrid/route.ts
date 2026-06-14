// Hybrid Agent API Route
// Runs on Vercel - combines ROM DOM simulation with optional real browser execution
// Supports three modes: sim-only, hybrid, real-only

import { NextRequest, NextResponse } from 'next/server';
import { SimulationEngineFactory, SimulationSession, type SimResult } from '@/lib/simulation';

interface TaskStep {
  id?: string;
  type: 'navigate' | 'fill-form' | 'click' | 'extract' | 'wait' | 'api-call' | 'action';
  rom: string;
  action?: string;
  form?: string;
  data?: Record<string, any>;
  requiresAuth?: boolean;
  mode?: 'sim-only' | 'real-only' | 'hybrid';
  verification?: VerificationRule;
  description?: string;
}

interface VerificationRule {
  type: 'exact' | 'keys' | 'custom';
  keys?: string[];
}

interface HybridTask {
  goal: string;
  steps: TaskStep[];
  mode?: 'sim-only' | 'hybrid' | 'real-only';
  context?: Record<string, any>;
}

interface StepResult {
  step: TaskStep;
  simResult: SimResult;
  realResult?: SimResult;
  mode: 'sim' | 'real' | 'hybrid';
  verified?: boolean;
  verificationError?: string;
  durationMs: number;
}

function mergeResultIntoContext(context: Record<string, any>, result: SimResult): void {
  if (result.submittedData) Object.assign(context, result.submittedData);
  if (result.data) Object.assign(context, result.data);
  if ((result as any).result) Object.assign(context, (result as any).result);
}

function verifyResults(sim: SimResult, real: SimResult, rule?: VerificationRule): { verified: boolean; error?: string } {
  if (!rule) return { verified: true };

  if (rule.type === 'exact') {
    const verified = JSON.stringify(sim) === JSON.stringify(real);
    return verified ? { verified: true } : { verified: false, error: 'Exact match failed: simulation output differs from real output' };
  }

  if (rule.type === 'keys') {
    for (const key of rule.keys ?? []) {
      if ((sim as any)[key] !== (real as any)[key]) {
        return { verified: false, error: `Key mismatch: ${key}` };
      }
    }
  }

  return { verified: true };
}

async function executeSimStep(step: TaskStep, session: SimulationSession): Promise<SimResult> {
  const engine = session.getEngine(step.rom);

  switch (step.type) {
    case 'navigate':
      return engine.simulateAction('navigate', { url: step.data?.url });
    case 'fill-form':
      return engine.simulateFormFill(step.form ?? 'default', step.data ?? {});
    case 'click':
      return engine.simulateAction(step.action ?? 'click', step.data);
    case 'extract':
      return engine.simulateExtract(step.data?.selectors ?? []);
    case 'wait':
      return engine.simulateAction('wait', step.data);
    case 'api-call':
      return engine.simulateApiCall(step.rom, step.data);
    case 'action':
    default:
      return engine.simulateAction(step.action ?? 'default', step.data);
  }
}

async function importOptionalStagehand(): Promise<any> {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<any>;
  return dynamicImport('@browserbasehq/stagehand');
}

async function executeRealStep(step: TaskStep, context: Record<string, any>): Promise<SimResult> {
  const hasBrowserbase = !!process.env.BROWSERBASE_API_KEY;
  const hasProject = !!process.env.BROWSERBASE_PROJECT_ID;

  if (!hasBrowserbase || !hasProject) {
    return {
      success: false,
      error: 'Real browser not configured: BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID required',
    };
  }

  let Stagehand: any;
  try {
    ({ Stagehand } = await importOptionalStagehand());
  } catch (error) {
    return {
      success: false,
      error: `Optional Stagehand package is not installed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });

  await stagehand.init();
  const page = stagehand.page;

  try {
    switch (step.type) {
      case 'navigate': {
        const url = step.data?.url ?? `https://tdealer01-crypto-dsg-control-plane.vercel.app${step.rom}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        return { success: true, data: { navigated: url } };
      }
      case 'fill-form': {
        const engine = SimulationEngineFactory.create(step.rom);
        const form = engine.getAvailableForms().find((f) => f.name === step.form);
        if (!form) return { success: false, error: `Form not found: ${step.form}` };

        for (const field of form.fields) {
          const value = step.data?.[field.name] ?? context[field.name];
          if (value) await page.fill(field.selector, String(value), { delay: 50 });
        }
        return { success: true, submittedData: step.data ?? {} };
      }
      case 'click': {
        const engine = SimulationEngineFactory.create(step.rom);
        const action = engine.getAvailableActions().find((a) => a.name === step.action);
        const selector = action?.target ?? step.data?.selector;
        if (!selector) return { success: false, error: 'No selector for click' };
        await page.click(selector);
        return { success: true, data: { clicked: selector } };
      }
      case 'extract': {
        const engine = SimulationEngineFactory.create(step.rom);
        const extracted: Record<string, string> = {};
        for (const key of step.data?.selectors ?? []) {
          const selector = engine.getSelectors()[key] ?? key;
          extracted[key] = (await page.locator(selector).textContent()) ?? '';
        }
        return { success: true, data: extracted };
      }
      case 'api-call': {
        const response = await fetch(step.data?.url ?? `https://tdealer01-crypto-dsg-control-plane.vercel.app${step.rom}`, {
          method: step.data?.method ?? 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(step.data?.body ?? {}),
        });
        const data = await response.json().catch(() => ({}));
        return { success: response.ok, data };
      }
      case 'wait':
      case 'action':
      default:
        return { success: true, data: { skippedRealAction: step.type } };
    }
  } finally {
    await stagehand.close();
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await req.json()) as HybridTask;

    if (!body.goal || !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task: goal and steps[] required' },
        { status: 400 },
      );
    }

    const mode = body.mode ?? 'hybrid';
    if (!['sim-only', 'hybrid', 'real-only'].includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode: ${mode}` },
        { status: 400 },
      );
    }

    const session = new SimulationSession();
    const context = { ...(body.context ?? {}) };
    const results: StepResult[] = [];

    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      const stepStartedAt = Date.now();
      const stepMode = step.mode ?? mode;
      const simResult = await executeSimStep(step, session);

      if (simResult.success) mergeResultIntoContext(context, simResult);

      const stepResult: StepResult = {
        step,
        simResult,
        mode: 'sim',
        durationMs: Date.now() - stepStartedAt,
      };

      if (stepMode !== 'sim-only' && step.requiresAuth) {
        const realStartedAt = Date.now();
        const realResult = await executeRealStep(step, context);
        if (realResult.success) mergeResultIntoContext(context, realResult);
        stepResult.realResult = realResult;
        stepResult.mode = 'hybrid';
        stepResult.durationMs += Date.now() - realStartedAt;

        const verification = verifyResults(simResult, realResult, step.verification);
        stepResult.verified = verification.verified;
        stepResult.verificationError = verification.error;
      }

      results.push(stepResult);
      if (!simResult.success && stepMode !== 'real-only') break;
    }

    return NextResponse.json({
      success: results.every((r) => r.simResult.success && (!r.realResult || r.realResult.success)),
      goal: body.goal,
      mode,
      results,
      summary: {
        totalSteps: results.length,
        simulatedSteps: results.filter((r) => r.mode === 'sim' || r.mode === 'hybrid').length,
        realSteps: results.filter((r) => r.realResult).length,
        verifiedSteps: results.filter((r) => r.verified === true).length,
        failedSteps: results.filter((r) => !r.simResult.success || (r.realResult && !r.realResult.success)).length,
        totalDurationMs: Date.now() - startTime,
      },
      context,
      trace: session.getTrace(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const roms = SimulationEngineFactory.listAvailable();
  const publicRoms = roms.filter((key) => {
    const engine = SimulationEngineFactory.create(key);
    return !engine.requiresAuth();
  });

  return NextResponse.json({
    status: 'ok',
    service: 'dsg-hybrid-agent',
    modes: ['sim-only', 'hybrid', 'real-only'],
    roms: {
      total: roms.length,
      public: publicRoms,
      protected: roms.filter((key) => !publicRoms.includes(key)),
    },
    realBrowser: {
      configured: !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID),
    },
  });
}
