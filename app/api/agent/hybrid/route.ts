// Hybrid Agent API Route
// Runs on Vercel - combines ROM DOM simulation with optional real browser execution
// Supports three modes: sim-only, hybrid, real-only

import { NextRequest, NextResponse } from 'next/server';
import { SimulationEngineFactory, SimulationSession, type SimResult } from '@/lib/simulation';

// Task definition types
interface TaskStep {
  id?: string;
  type: 'navigate' | 'fill-form' | 'click' | 'extract' | 'wait' | 'api-call' | 'action';
  rom: string;                    // ROM key (e.g., 'login', 'hermes-dashboard')
  action?: string;                // Action name from ROM (for 'action' type)
  form?: string;                  // Form name (for 'fill-form' type)
  data?: any;                     // Parameters for the action
  requiresAuth?: boolean;         // Requires real browser with auth
  mode?: 'sim-only' | 'real-only' | 'hybrid'; // Override global mode per step
  verification?: VerificationRule; // Verification rule for T4 gate
  description?: string;
}

interface VerificationRule {
  type: 'exact' | 'keys' | 'custom';
  keys?: string[];
  fn?: (sim: any, real: any) => boolean;
}

interface HybridTask {
  goal: string;
  steps: TaskStep[];
  mode: 'sim-only' | 'hybrid' | 'real-only';
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

interface HybridResponse {
  success: boolean;
  goal: string;
  mode: string;
  results: StepResult[];
  summary: {
    totalSteps: number;
    simulatedSteps: number;
    realSteps: number;
    verifiedSteps: number;
    failedSteps: number;
    totalDurationMs: number;
  };
  context: Record<string, any>;
  trace: any[];
}

// Verify simulation vs real results
function verifyResults(sim: SimResult, real: SimResult, rule?: VerificationRule): { verified: boolean; error?: string } {
  if (!rule) return { verified: true };

  try {
    switch (rule.type) {
      case 'exact':
        const simStr = JSON.stringify(sim);
        const realStr = JSON.stringify(real);
        if (simStr !== realStr) {
          return { verified: false, error: 'Exact match failed: simulation output differs from real output' };
        }
        break;
      case 'keys':
        if (rule.keys) {
          for (const key of rule.keys) {
            if (sim[key] !== real[key]) {
              return { verified: false, error: `Key mismatch: ${key} (sim=${sim[key]} vs real=${real[key]})` };
            }
          }
        }
        break;
      case 'custom':
        if (rule.fn && !rule.fn(sim, real)) {
          return { verified: false, error: 'Custom verification function returned false' };
        }
        break;
    }
    return { verified: true };
  } catch (e) {
    return { verified: false, error: `Verification error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// Execute step with simulation
async function executeSimStep(step: TaskStep, session: SimulationSession): Promise<SimResult> {
  const engine = session.getEngine(step.rom);

  switch (step.type) {
    case 'navigate':
      return engine.simulateAction('navigate', { url: step.data?.url });
    case 'fill-form':
      return engine.simulateFormFill(step.form!, step.data || {});
    case 'click':
      return engine.simulateAction(step.action || 'click', step.data);
    case 'extract':
      return engine.simulateExtract(step.data?.selectors || []);
    case 'wait':
      return engine.simulateAction('wait', step.data);
    case 'api-call':
      return engine.simulateApiCall(step.rom, step.data);
    case 'action':
    default:
      return engine.simulateAction(step.action!, step.data);
  }
}

// Execute step with real browser (using Stagehand/Browserbase)
async function executeRealStep(step: TaskStep, context: Record<string, any>): Promise<SimResult> {
  // Check if we have the required credentials
  const hasBrowserbase = !!process.env.BROWSERBASE_API_KEY;
  const hasStagehand = !!process.env.BROWSERBASE_PROJECT_ID;

  if (!hasBrowserbase || !hasStagehand) {
    return {
      success: false,
      error: 'Real browser not configured: BROWSERBASE_API_KEY and BROWSERBASE_PROJECT_ID required'
    };
  }

  // Import Stagehand dynamically (only in real browser mode)
  const { Stagehand } = await import('@browserbasehq/stagehand');

  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
  });

  await stagehand.init();
  const page = stagehand.page;

  try {
    let result: SimResult = { success: false, error: 'Unknown step type' };

    switch (step.type) {
      case 'navigate': {
        const url = step.data?.url || `https://tdealer01-crypto-dsg-control-plane.vercel.app${step.rom}`;
        await page.goto(url, { waitUntil: 'networkidle' });
        result = { success: true, navigated: url };
        break;
      }

      case 'fill-form': {
        const engine = SimulationEngineFactory.create(step.rom);
        const form = engine.getAvailableForms().find(f => f.name === step.form);
        if (!form) throw new Error(`Form not found: ${step.form}`);

        for (const field of form.fields) {
          const value = step.data?.[field.name] || context[field.name];
          if (value) {
            await page.fill(field.selector, String(value), { delay: 50 });
          }
        }
        result = { success: true, submittedData: step.data };
        break;
      }

      case 'click': {
        const engine = SimulationEngineFactory.create(step.rom);
        const action = engine.getAvailableActions().find(a => a.name === step.action);
        const selector = action?.target || step.data?.selector;
        if (!selector) throw new Error('No selector for click');

        await page.click(selector);

        if (action?.waitFor) {
          await page.waitForSelector(action.waitFor, { timeout: action.timeout || 10000 });
        } else if (step.data?.waitFor) {
          await page.waitForSelector(step.data.waitFor, { timeout: step.data.timeout || 10000 });
        }
        result = { success: true, clicked: selector };
        break;
      }

      case 'extract': {
        const selectors = step.data?.selectors || [];
        const extracted: Record<string, string> = {};

        for (const key of selectors) {
          const engine = SimulationEngineFactory.create(step.rom);
          const cssSelector = engine.getSelectors()[key] || key;
          const value = await page.locator(cssSelector).textContent() || '';
          extracted[key] = value;
        }
        result = { success: true, data: extracted };
        break;
      }

      case 'wait': {
        const engine = SimulationEngineFactory.create(step.rom);
        const action = engine.getAvailableActions().find(a => a.name === step.action);
        const selector = action?.target || step.data?.selector;
        if (!selector) throw new Error('No selector for wait');

        await page.waitForSelector(selector, {
          state: step.data?.state || 'visible',
          timeout: step.data?.timeout || 10000
        });
        result = { success: true, waited: selector };
        break;
      }

      case 'api-call': {
        // Real API call with auth cookies from context
        const cookies = context.authCookies || '';
        const response = await fetch(step.data?.url || `https://tdealer01-crypto-dsg-control-plane.vercel.app${step.rom}`, {
          method: step.data?.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(cookies ? { Cookie: cookies } : {}),
          },
          body: JSON.stringify(step.data?.body || {}),
        });

        const data = await response.json().catch(() => ({}));
        result = {
          success: response.ok,
          data,
          status: response.status
        };
        break;
      }
    }

    return result;
  } finally {
    await stagehand.close();
  }
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json() as HybridTask;

    // Validate required fields
    if (!body.goal || !body.steps || !Array.isArray(body.steps)) {
      return NextResponse.json(
        { success: false, error: 'Invalid task: goal and steps[] required' },
        { status: 400 }
      );
    }

    const mode = body.mode || 'hybrid';
    const validModes = ['sim-only', 'hybrid', 'real-only'];
    if (!validModes.includes(mode)) {
      return NextResponse.json(
        { success: false, error: `Invalid mode: ${mode}. Must be one of ${validModes.join(', ')}` },
        { status: 400 }
      );
    }

    const session = new SimulationSession();
    const context = { ...body.context };
    const results: StepResult[] = [];

    // Process each step
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      const stepStartTime = Date.now();

      // Determine step mode (step can override global mode)
      const stepMode = step.mode || mode;

      // STEP 1: ALWAYS simulate first (control plane)
      const simResult = await executeSimStep(step, session);
      const simDuration = Date.now() - stepStartTime;

      // Update context with simulation results
      if (simResult.success) {
        if (simResult.submittedData) Object.assign(context, simResult.submittedData);
        if (simResult.data) Object.assign(context, simResult.data);
        if (simResult.result) Object.assign(context, simResult.result);
      }

      let stepResult: StepResult = {
        step,
        simResult,
        mode: 'sim',
        durationMs: simDuration
      };

      // STEP 2: Execute real browser if required
      if (stepMode !== 'sim-only' && step.requiresAuth) {
        const realStartTime = Date.now();
        try {
          const realResult = await executeRealStep(step, context);
          const realDuration = Date.now() - realStartTime;

          // Update context with real results
          if (realResult.success) {
            if (realResult.submittedData) Object.assign(context, realResult.submittedData);
            if (realResult.data) Object.assign(context, realResult.data);
            if (realResult.result) Object.assign(context, realResult.result);
          }

          stepResult.realResult = realResult;
          stepResult.mode = 'hybrid';
          stepResult.durationMs += realDuration;

          // STEP 3: VERIFICATION GATE (T4)
          if (step.verification) {
            const verification = verifyResults(simResult, realResult, step.verification);
            stepResult.verified = verification.verified;
            stepResult.verificationError = verification.error;

            if (!verification.verified) {
              console.warn(`Verification failed at step ${i}: ${verification.error}`);
            }
          }
        } catch (e) {
          stepResult.realResult = {
            success: false,
            error: e instanceof Error ? e.message : String(e)
          };
          stepResult.durationMs += Date.now() - realStartTime;
        }
      }

      results.push(stepResult);

      // Stop on failure in sim-only or hybrid mode (if sim fails, no point continuing)
      if (!simResult.success && stepMode !== 'real-only') {
        break;
      }
    }

    // Calculate summary
    const totalDuration = Date.now() - startTime;
    const simulatedSteps = results.filter(r => r.mode === 'sim' || r.mode === 'hybrid').length;
    const realSteps = results.filter(r => r.realResult).length;
    const verifiedSteps = results.filter(r => r.verified === true).length;
    const failedSteps = results.filter(r => !r.simResult.success || (r.realResult && !r.realResult.success)).length;

    const response: HybridResponse = {
      success: results.every(r => r.simResult.success && (!r.realResult || r.realResult.success)),
      goal: body.goal,
      mode,
      results,
      summary: {
        totalSteps: results.length,
        simulatedSteps,
        realSteps,
        verifiedSteps,
        failedSteps,
        totalDurationMs: totalDuration
      },
      context,
      trace: session.getTrace()
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

// GET endpoint for health check and available ROMs
export async function GET(req: NextRequest) {
  const roms = SimulationEngineFactory.listAvailable();
  const publicRoms = roms.filter(k => {
    const engine = SimulationEngineFactory.create(k);
    return !engine.requiresAuth();
  });

  return NextResponse.json({
    status: 'ok',
    service: 'dsg-hybrid-agent',
    modes: ['sim-only', 'hybrid', 'real-only'],
    roms: {
      total: roms.length,
      public: publicRoms,
      protected: roms.filter(k => !publicRoms.includes(k))
    },
    realBrowser: {
      configured: !!(process.env.BROWSERBASE_API_KEY && process.env.BROWSERBASE_PROJECT_ID)
    }
  });
}