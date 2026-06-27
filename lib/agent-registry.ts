/**
 * Agent Registry — DSG ONE Multi-Agent Architecture
 *
 * Each role declares multiple candidate models so the orchestrator can
 * fail over between free/cheap options without hard-coding a single model.
 */

export const AGENTS = {
  planner: {
    role: 'planning',
    label: 'Planner Agent',
    description: 'Strategy, architecture, roadmaps, planning',
    candidateModels: [
      'nousresearch/nemotron-4-8b-instruct',
      'moonshotai/kimi-k2-8b-instruct',
      'meta-llama/llama-4-maverick:free',
      'openrouter/free',
    ],
    defaultModel: 'nousresearch/nemotron-4-8b-instruct',
  },
  coder: {
    role: 'coding',
    label: 'Coder Agent',
    description: 'Coding, debugging, refactoring, build fixes, TypeScript analysis',
    candidateModels: [
      'deepseek/deepseek-chat-v3.1',
      'qwen/qwen-2.5-coder-32b-instruct',
      'nousresearch/nemotron-4-8b-instruct',
      'openrouter/free',
    ],
    defaultModel: 'deepseek/deepseek-chat-v3.1',
  },
  auditor: {
    role: 'verification',
    label: 'Auditor Agent',
    description: 'Security review, risk review, contradiction detection, validation',
    candidateModels: [
      'meta-llama/llama-4-maverick:free',
      'nousresearch/nemotron-4-8b-instruct',
      'moonshotai/kimi-k2-8b-instruct',
      'openrouter/free',
    ],
    defaultModel: 'meta-llama/llama-4-maverick:free',
  },
  tool: {
    role: 'tools',
    label: 'Tool Agent',
    description: 'Tool selection, invocation, workflow execution, automation routing',
    candidateModels: [
      'qwen/qwen-2.5-coder-32b-instruct',
      'deepseek/deepseek-chat-v3.1',
      'nousresearch/nemotron-4-8b-instruct',
      'openrouter/free',
    ],
    defaultModel: 'qwen/qwen-2.5-coder-32b-instruct',
  },
  summary: {
    role: 'summarization',
    label: 'Summary Agent',
    description: 'Summaries, compression, executive reporting, documentation',
    candidateModels: [
      'google/gemma-3-8b-instruct:free',
      'meta-llama/llama-4-maverick:free',
      'nousresearch/nemotron-4-8b-instruct',
      'openrouter/free',
    ],
    defaultModel: 'google/gemma-3-8b-instruct:free',
  },
} as const;

export type AgentRole = keyof typeof AGENTS;
