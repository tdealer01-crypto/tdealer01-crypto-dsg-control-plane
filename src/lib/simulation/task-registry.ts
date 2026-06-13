// Task Registry - Import and export all task definitions
// This is a helper to load YAML tasks in TypeScript

import * as fs from 'fs';
import * as path from 'path';

export interface TaskStep {
  id?: string;
  type: 'navigate' | 'fill-form' | 'click' | 'extract' | 'wait' | 'api-call' | 'action';
  rom: string;
  action?: string;
  form?: string;
  data?: any;
  requiresAuth?: boolean;
  mode?: 'sim-only' | 'real-only' | 'hybrid';
  verification?: VerificationRule;
  description?: string;
}

export interface VerificationRule {
  type: 'exact' | 'keys' | 'custom';
  keys?: string[];
  fn?: (sim: any, real: any) => boolean;
}

export interface HybridTask {
  goal: string;
  steps: TaskStep[];
  mode: 'sim-only' | 'hybrid' | 'real-only';
  context?: Record<string, any>;
}

const TASKS_DIR = path.join(process.cwd(), 'tasks');

export function listTasks(): string[] {
  if (!fs.existsSync(TASKS_DIR)) return [];
  return fs.readdirSync(TASKS_DIR)
    .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'))
    .map(f => f.replace(/\.(yaml|yml)$/, ''));
}

export function loadTask(name: string): HybridTask | null {
  const filePath = path.join(TASKS_DIR, `${name}.yaml`);
  if (!fs.existsSync(filePath)) {
    const altPath = path.join(TASKS_DIR, `${name}.yml`);
    if (!fs.existsSync(altPath)) return null;
    return parseYaml(fs.readFileSync(altPath, 'utf-8'));
  }
  return parseYaml(fs.readFileSync(filePath, 'utf-8'));
}

function parseYaml(content: string): HybridTask {
  // Simple YAML parser for our task format
  // In production, use 'yaml' package: const yaml = require('yaml'); return yaml.parse(content);
  const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

  const task: Partial<HybridTask> = { steps: [] };
  let currentStep: Partial<TaskStep> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    const indent = line.length - trimmed.length;

    if (indent === 0) {
      if (trimmed.startsWith('goal:')) {
        task.goal = trimmed.slice(5).trim();
      } else if (trimmed.startsWith('mode:')) {
        task.mode = trimmed.slice(5).trim() as any;
      } else if (trimmed.startsWith('context:')) {
        task.context = {};
      } else if (trimmed === 'steps:') {
        // steps array starts
      }
    } else if (indent === 2 && trimmed.startsWith('-')) {
      // New step
      if (currentStep) task.steps!.push(currentStep as TaskStep);
      currentStep = {};
    } else if (currentStep && indent >= 4) {
      const [key, ...rest] = trimmed.split(':');
      const value = rest.join(':').trim().replace(/^['"]|['"]$/g, '');

      if (key === 'id') currentStep.id = value;
      else if (key === 'type') currentStep.type = value as any;
      else if (key === 'rom') currentStep.rom = value;
      else if (key === 'action') currentStep.action = value;
      else if (key === 'form') currentStep.form = value;
      else if (key === 'requiresAuth') currentStep.requiresAuth = value === 'true';
      else if (key === 'mode') currentStep.mode = value as any;
      else if (key === 'description') currentStep.description = value;
      else if (key === 'data') {
        // Handle multi-line data
        currentStep.data = currentStep.data || {};
      } else if (key === 'verification') {
        currentStep.verification = { type: 'custom' };
      } else if (key === 'type' && currentStep.verification) {
        currentStep.verification!.type = value as any;
      } else if (key === 'keys' && currentStep.verification) {
        currentStep.verification!.keys = value.split(',').map(k => k.trim());
      }
    }
  }

  if (currentStep) task.steps!.push(currentStep as TaskStep);

  return task as HybridTask;
}

export function getTaskNames(): string[] {
  return listTasks();
}