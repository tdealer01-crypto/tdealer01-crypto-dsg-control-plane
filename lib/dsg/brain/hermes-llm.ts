/**
 * Hermes LLM Integration for DSG Brain.
 *
 * Supports three backends:
 *   - NVIDIA Nemotron (NVIDIA_API_KEY, free tier ~40 RPM)
 *   - NousResearch Hermes (TOGETHER_API_KEY or OPENROUTER_API_KEY)
 *   - Anthropic Claude (ANTHROPIC_API_KEY, production fallback)
 *
 * Set DSG_BRAIN_PROVIDER=nous-hermes to use Hermes models.
 * API keys are server-side only, never exposed to client.
 */

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { ConformanceViolation } from "./conformance-gate";
import {
  generatePlanViaNousHermes,
  remediatePlanViaNousHermes,
  detectNousHosting,
  type HermesNousModel,
} from "./hermes-nous-provider";
import { buildDsgBrainModelConfig } from "./model-config";

/**
 * LLM plan generation request.
 */
export interface LLMPlanRequest {
  /** User's request or goal */
  userInput: string;
  /** Allowed commands whitelist */
  allowedCommands: string[];
  /** Allowed paths whitelist */
  allowedPaths: string[];
  /** Policy version identifier */
  policyVersion: string;
  /** Hash of available tools/commands */
  toolManifestHash: string;
}

/**
 * LLM plan response.
 */
export interface LLMPlanResponse {
  /** Canonical plan text (structured steps) */
  canonicalPlan: string;
  /** Reasoning/rationale for the plan */
  rationale: string;
  /** Risk assessment tags */
  riskTags: string[];
}

/**
 * LLM remediation request.
 */
export interface LLMRemediationRequest {
  /** Original plan that failed */
  originalPlan: string;
  /** Conformance violations to fix */
  violations: ConformanceViolation[];
  /** Allowed commands */
  allowedCommands: string[];
  /** Allowed paths */
  allowedPaths: string[];
}

/**
 * LLM remediation response.
 */
export interface LLMRemediationResponse {
  /** Remediated plan text */
  remediatedPlan: string;
  /** Description of changes made */
  changeDescription: string;
}

/**
 * Build system prompt for plan generation.
 */
function buildPlanSystemPrompt(): string {
  return `You are a planning agent for DSG Brain - a deterministic governance system.
Your job is to generate structured execution plans that:
1. Are deterministic and reproducible
2. Only use allowed commands and paths
3. Follow the policy constraints
4. Include clear reasoning for each step

Plans must be output as JSON with the following structure:
{
  "steps": [
    {
      "command": "command name or API call",
      "args": ["arg1", "arg2"],
      "reason": "why this step is necessary"
    }
  ],
  "summary": "overall goal and approach"
}

CRITICAL RULES:
- Only use commands from the allowedCommands list
- Only access/modify paths from the allowedPaths list
- Never attempt path traversal or escape constraints
- Make assumptions explicit in the "reason" field
- Group related operations into coherent steps`;
}

/**
 * Build user prompt for plan generation.
 */
function buildPlanUserPrompt(request: LLMPlanRequest): string {
  return `Generate a detailed execution plan for the following request.

USER REQUEST:
${request.userInput}

CONSTRAINTS:
Policy Version: ${request.policyVersion}
Tool Manifest Hash: ${request.toolManifestHash}

Allowed Commands:
${request.allowedCommands.length > 0 ? request.allowedCommands.map((c) => `  - ${c}`).join("\n") : "  (none specified)"}

Allowed Paths:
${request.allowedPaths.length > 0 ? request.allowedPaths.map((p) => `  - ${p}`).join("\n") : "  (none specified)"}

Generate a detailed, step-by-step plan that respects these constraints.
Output MUST be valid JSON matching the required structure.`;
}

/**
 * Build system prompt for remediation.
 */
function buildRemediationSystemPrompt(): string {
  return `You are a remediation agent for DSG Brain.
Your job is to modify a failed execution plan to fix conformance violations while maintaining its intent.

Plans must be output as JSON with the same structure:
{
  "steps": [
    {
      "command": "command name or API call",
      "args": ["arg1", "arg2"],
      "reason": "why this step is necessary"
    }
  ],
  "summary": "overall goal and approach"
}

REMEDIATION RULES:
- Fix ALL violations listed in the violations array
- Do NOT introduce new violations
- Only use commands from allowedCommands
- Only access paths from allowedPaths
- Preserve the original intent where possible
- Be explicit about what changed and why`;
}

/**
 * Build user prompt for remediation.
 */
function buildRemediationUserPrompt(request: LLMRemediationRequest): string {
  const violationText = request.violations
    .map((v) => `  - [${v.rule}] ${v.message}`)
    .join("\n");

  return `Remediate the following plan to fix the listed conformance violations.

ORIGINAL PLAN:
${request.originalPlan}

VIOLATIONS TO FIX:
${violationText}

CONSTRAINTS:
Allowed Commands:
${request.allowedCommands.length > 0 ? request.allowedCommands.map((c) => `  - ${c}`).join("\n") : "  (none specified)"}

Allowed Paths:
${request.allowedPaths.length > 0 ? request.allowedPaths.map((p) => `  - ${p}`).join("\n") : "  (none specified)"}

Generate a remediated plan that fixes ALL violations while respecting constraints.
Output MUST be valid JSON matching the required structure.`;
}

/**
 * Check if NVIDIA API is available.
 */
function isNVIDIAAvailable(): boolean {
  return !!process.env.NVIDIA_API_KEY;
}

/**
 * Get NVIDIA model ID.
 */
function getNVIDIAModel(): string {
  return process.env.NVIDIA_MODEL_ID || "nvidia/nemotron-3-ultra-550b-a55b";
}

/**
 * Parse JSON plan response from LLM.
 */
function parsePlanResponse(content: string): {
  plan: string;
  summary: string;
} {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("Invalid plan structure: missing or invalid steps array");
    }

    // Rebuild canonical plan from steps
    const canonicalSteps = parsed.steps.map(
      (step: any) =>
        `${step.command} ${(step.args || []).join(" ")} # ${step.reason || "no reason"}`
    );
    const canonicalPlan = canonicalSteps.join("\n");

    return {
      plan: canonicalPlan,
      summary: parsed.summary || "Plan generated by Hermes LLM",
    };
  } catch (err) {
    throw new Error(`Failed to parse LLM plan response: ${(err as Error).message}`);
  }
}

/**
 * Generate a plan — dispatches to NVIDIA, NousResearch Hermes, or Anthropic based on config.
 * IMPORTANT: API keys are loaded from environment only, server-side.
 */
export async function generatePlanViaLLM(
  request: LLMPlanRequest,
  apiKey?: string,
): Promise<LLMPlanResponse> {
  // Priority 1: NVIDIA Nemotron (free tier)
  if (isNVIDIAAvailable()) {
    return generatePlanViaNVIDIA(request);
  }

  const config = buildDsgBrainModelConfig();

  // Priority 2: NousResearch Hermes
  if (config.provider === 'nous-hermes') {
    const hosting = detectNousHosting();
    if (!hosting) throw new Error('TOGETHER_API_KEY or OPENROUTER_API_KEY not set for Hermes provider');
    return generatePlanViaNousHermes(request, config.model as HermesNousModel, hosting);
  }

  // Priority 3: Anthropic Claude (production fallback)
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set. Cannot generate plans without API key.');

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: config.model || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: buildPlanSystemPrompt(),
      messages: [{ role: 'user', content: buildPlanUserPrompt(request) }],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No text content in LLM response');

    const { plan, summary } = parsePlanResponse(textContent.text);
    const riskTags: string[] = [];
    if (request.allowedCommands.length === 0) riskTags.push('no-commands');
    if (request.allowedPaths.length === 0) riskTags.push('no-paths');
    if (plan.includes('TODO') || plan.includes('pending')) riskTags.push('incomplete');

    return { canonicalPlan: plan, rationale: summary, riskTags };
  } catch (err) {
    throw new Error(`LLM plan generation failed: ${(err as Error).message}`);
  }
}

/**
 * Generate plan via NVIDIA Nemotron (OpenAI-compatible API).
 */
async function generatePlanViaNVIDIA(request: LLMPlanRequest): Promise<LLMPlanResponse> {
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
  });

  try {
    const response = await client.chat.completions.create({
      model: getNVIDIAModel(),
      messages: [
        { role: "system", content: buildPlanSystemPrompt() },
        { role: "user", content: buildPlanUserPrompt(request) }
      ],
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.9
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) throw new Error('No text content in NVIDIA response');

    const { plan, summary } = parsePlanResponse(textContent);
    const riskTags: string[] = [];
    if (request.allowedCommands.length === 0) riskTags.push('no-commands');
    if (request.allowedPaths.length === 0) riskTags.push('no-paths');
    if (plan.includes('TODO') || plan.includes('pending')) riskTags.push('incomplete');

    return { canonicalPlan: plan, rationale: summary, riskTags };
  } catch (err) {
    throw new Error(`NVIDIA plan generation failed: ${(err as Error).message}`);
  }
}

/**
 * Remediate plan via NVIDIA Nemotron (OpenAI-compatible API).
 */
async function remediatePlanViaNVIDIA(request: LLMRemediationRequest): Promise<LLMRemediationResponse> {
  const client = new OpenAI({
    apiKey: process.env.NVIDIA_API_KEY,
    baseURL: "https://integrate.api.nvidia.com/v1"
  });

  try {
    const response = await client.chat.completions.create({
      model: getNVIDIAModel(),
      messages: [
        { role: "system", content: buildRemediationSystemPrompt() },
        { role: "user", content: buildRemediationUserPrompt(request) }
      ],
      max_tokens: 2048,
      temperature: 0.3,
      top_p: 0.9
    });

    const textContent = response.choices[0]?.message?.content;
    if (!textContent) throw new Error('No text content in NVIDIA response');

    const { plan, summary } = parsePlanResponse(textContent);
    return { remediatedPlan: plan, changeDescription: summary };
  } catch (err) {
    throw new Error(`NVIDIA remediation failed: ${(err as Error).message}`);
  }
}

/**
 * Generate a remediated plan — dispatches to NVIDIA, NousResearch Hermes, or Anthropic based on config.
 */
export async function remediatePlanViaLLM(
  request: LLMRemediationRequest,
  apiKey?: string,
): Promise<LLMRemediationResponse> {
  // Priority 1: NVIDIA Nemotron (free tier)
  if (isNVIDIAAvailable()) {
    return remediatePlanViaNVIDIA(request);
  }

  const config = buildDsgBrainModelConfig();

  // Priority 2: NousResearch Hermes
  if (config.provider === 'nous-hermes') {
    const hosting = detectNousHosting();
    if (!hosting) throw new Error('TOGETHER_API_KEY or OPENROUTER_API_KEY not set for Hermes provider');
    return remediatePlanViaNousHermes(request, config.model as HermesNousModel, hosting);
  }

  // Priority 3: Anthropic Claude (production fallback)
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('ANTHROPIC_API_KEY not set. Cannot remediate plans without API key.');

  const client = new Anthropic({ apiKey: key });

  try {
    const response = await client.messages.create({
      model: config.model || 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: buildRemediationSystemPrompt(),
      messages: [{ role: 'user', content: buildRemediationUserPrompt(request) }],
    });

    const textContent = response.content.find((block) => block.type === 'text');
    if (!textContent || textContent.type !== 'text') throw new Error('No text content in LLM response');

    const { plan, summary } = parsePlanResponse(textContent.text);
    return { remediatedPlan: plan, changeDescription: summary };
  } catch (err) {
    throw new Error(`LLM remediation failed: ${(err as Error).message}`);
  }
}
