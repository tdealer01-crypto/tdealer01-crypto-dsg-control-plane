import { z } from 'zod';

// Supabase Schemas
export const SupabaseQuerySchema = z.object({
  query: z.string().min(1).describe('SQL query to execute'),
  params: z.array(z.any()).optional().describe('Query parameters'),
});

export const SupabaseUpdateSchema = z.object({
  table: z.string().min(1).describe('Table name'),
  data: z.record(z.any()).describe('Data to update'),
  filter: z.record(z.any()).describe('WHERE clause filters'),
  auditReason: z.string().optional().describe('Reason for audit log'),
});

// Vercel Schemas
export const VercelDeploySchema = z.object({
  projectId: z.string().describe('Vercel project ID'),
  environment: z.enum(['preview', 'production']).describe('Deployment environment'),
  ref: z.string().optional().describe('Git ref (branch/commit)'),
});

export const VercelBuildLogsSchema = z.object({
  deploymentId: z.string().describe('Vercel deployment ID'),
  lines: z.number().optional().default(100).describe('Number of log lines'),
});

// Anthropic Schemas
export const AnthropicSessionSchema = z.object({
  model: z.string().describe('Claude model ID'),
  budgetTokens: z.number().optional().describe('Token budget'),
  systemPrompt: z.string().optional().describe('System prompt'),
});

export const AnthropicMessageSchema = z.object({
  sessionId: z.string().describe('Session ID'),
  message: z.string().min(1).describe('User message'),
  maxTokens: z.number().optional().default(1024).describe('Max response tokens'),
});

// Stripe Schemas
export const StripeUsageSchema = z.object({
  customerId: z.string().describe('Stripe customer ID'),
  subscriptionItemId: z.string().describe('Subscription item ID'),
  quantity: z.number().positive().describe('Usage quantity'),
  timestamp: z.date().optional().describe('Event timestamp'),
});

// Spine Execution Schemas
export const SpineExecuteSchema = z.object({
  agentId: z.string().describe('Agent ID'),
  intent: z.object({
    action: z.string(),
    parameters: z.record(z.any()),
  }).describe('Execution intent'),
  approve: z.boolean().optional().default(false).describe('Auto-approve execution'),
});

export const SpineEvidenceSchema = z.object({
  executionId: z.string().describe('Execution ID'),
  evidence: z.object({
    decision: z.string(),
    reason: z.string(),
    proof: z.any().optional(),
    trace: z.array(z.any()).optional(),
  }).describe('Evidence to commit'),
});

// DSG Brain Schemas
export const DSGPlanSchema = z.object({
  objective: z.string().min(1).describe('Planning objective'),
  context: z.record(z.any()).optional().describe('Planning context'),
  constraints: z.array(z.string()).optional().describe('Execution constraints'),
});

export const CredentialBrokerSchema = z.object({
  secretName: z.string().describe('Secret identifier'),
  scope: z.string().optional().describe('Secret scope/environment'),
  leaseDuration: z.number().optional().default(3600).describe('Lease duration in seconds'),
});

// Compliance Schemas
export const ComplianceEvidenceSchema = z.object({
  executionId: z.string().describe('Execution ID'),
  level: z.enum(['L1', 'L2', 'L3', 'L4', 'L5']).describe('Evidence level'),
  metadata: z.record(z.any()).optional().describe('Evidence metadata'),
});

export const GateEvaluationSchema = z.object({
  policyId: z.string().describe('Policy ID'),
  input: z.record(z.any()).describe('Gate input parameters'),
  context: z.record(z.any()).optional().describe('Evaluation context'),
});
