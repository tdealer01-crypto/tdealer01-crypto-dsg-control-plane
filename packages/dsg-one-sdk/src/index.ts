/**
 * DSG ONE SDK - Main entry point
 * 
 * A TypeScript client for the DSG ONE governed execution API.
 * 
 * @packageDocumentation
 */

// Main client
export { DsgOneClient, createClient, createClientFromEnv } from "./client";

// Types
export type {
  DsgOneConfig,
  CreateAgentResponse,
  AgentInfo,
  AgentListResponse,
  ExecuteInput,
  ExecuteResponse,
  CreateAgentOptions,
  QuotaInfo,
  Decision,
  Proof,
  PipelineStageTrace,
  UsageInfo,
} from "./types";

export { DsgOneError } from "./types";