-- Repair: System Inventory seed data + anon read grants
-- Mirrors supabase/migrations/20260731090000_repair_system_inventory_seed_and_grants.sql
-- Applied live via Supabase MCP to the CI-linked project (zeyguilldygozufpgxms)
-- because CI does not run `supabase db push` / apply migrations automatically.

GRANT SELECT ON dsg_system_components TO anon, authenticated;
GRANT SELECT ON dsg_component_dependencies TO anon, authenticated;
GRANT SELECT ON dsg_component_capabilities TO anon, authenticated;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'health_check', 'Health Check', 'System health status endpoint', '/api/health', 'monitoring', 'public', 'active', '{"method":"GET","auth_required":false}'),
  ('route', 'readiness_check', 'Readiness Check', 'Deployment readiness status', '/api/readiness', 'monitoring', 'public', 'active', '{"method":"GET","auth_required":false}'),
  ('route', 'agent_status', 'Agent Status', 'Current agent status and version', '/api/agent/status', 'monitoring', 'public', 'active', '{"method":"GET","auth_required":false}'),
  ('route', 'agent_health_check_cron', 'Agent Health Check (Cron)', 'Cron job for agent health', '/api/cron/agent-health-check', 'monitoring', 'operator', 'active', '{"method":"POST","auth_required":true,"cron":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'execute_api', 'Execute Governed Action', 'Main governance execution endpoint', '/api/execute', 'governance', 'authenticated', 'active', '{"method":"POST","auth_required":true}'),
  ('route', 'intent_api', 'Intent Submission', 'Submit intent for governance', '/api/intent', 'governance', 'authenticated', 'active', '{"method":"POST","auth_required":true}'),
  ('route', 'spine_execute', 'Spine Execute', 'Internal spine execution layer', '/api/spine/execute', 'governance', 'internal', 'active', '{"method":"POST","auth_required":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'policies_manifest', 'Policies Manifest', 'Get deterministic policy manifest', '/api/dsg/v1/policies/manifest', 'governance', 'public', 'active', '{"method":"GET","auth_required":false}'),
  ('route', 'gates_evaluate', 'Evaluate Gate', 'Evaluate deterministic gate', '/api/dsg/v1/gates/evaluate', 'governance', 'authenticated', 'active', '{"method":"POST","auth_required":true}'),
  ('route', 'proofs_prove', 'Generate Proof', 'Generate formal proof', '/api/dsg/v1/proofs/prove', 'governance', 'authenticated', 'active', '{"method":"POST","auth_required":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'usage_api', 'Usage Analytics', 'Get usage statistics', '/api/usage', 'billing', 'authenticated', 'active', '{"method":"GET","auth_required":true}'),
  ('route', 'billing_meter_health', 'Billing Meter Health', 'Check billing meter status', '/api/billing/meter-health', 'billing', 'operator', 'active', '{"method":"GET","auth_required":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'executions_list', 'List Executions', 'Get execution history', '/api/executions', 'compliance', 'authenticated', 'active', '{"method":"GET","auth_required":true}'),
  ('route', 'audit_log', 'Audit Log', 'Get audit trail', '/api/audit', 'compliance', 'authenticated', 'active', '{"method":"GET","auth_required":true}'),
  ('route', 'compliance_status', 'Compliance Status', 'CCVS compliance status', '/api/ccvs/compliance-status', 'compliance', 'authenticated', 'active', '{"method":"GET","auth_required":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('route', 'mcp_manifest', 'MCP Server Manifest', 'Model Context Protocol manifest', '/api/mcp/manifest', 'integrations', 'public', 'active', '{"method":"GET","auth_required":false}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('table', 'dsg_organizations', 'Organizations Table', 'Organization master data', 'dsg_organizations', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_org_members', 'Organization Members', 'Org membership and roles', 'dsg_org_members', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_workspaces', 'Workspaces Table', 'Workspace configuration', 'dsg_workspaces', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_runtime_executions', 'Runtime Executions', 'Execution records and decisions', 'dsg_runtime_executions', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_runtime_evidence', 'Runtime Evidence', 'Execution evidence and proofs', 'dsg_runtime_evidence', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_approved_actions', 'Approved Actions', 'Pre-approved action registry', 'dsg_approved_actions', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_usage_counters', 'Usage Counters', 'Real-time usage tracking', 'dsg_usage_counters', 'billing', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_billing_outbox', 'Billing Outbox', 'Idempotent billing events', 'dsg_billing_outbox', 'billing', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_quota_gates', 'Quota Gates', 'Quota configuration', 'dsg_quota_gates', 'billing', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_policies', 'Policies Table', 'Policy definitions', 'dsg_policies', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_schema_policies', 'Schema Policies', 'Row-level security policies', 'dsg_schema_policies', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_audit_logs', 'Audit Logs', 'Immutable audit trail', 'dsg_audit_logs', 'compliance', 'internal', 'active', '{"append_only":true,"rls_enabled":true}'),
  ('table', 'dsg_governance_events', 'Governance Events', 'Policy decision events', 'dsg_governance_events', 'compliance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_system_components', 'System Components', 'Component registry (NEW)', 'dsg_system_components', 'monitoring', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_component_dependencies', 'Component Dependencies', 'Dependency graph (NEW)', 'dsg_component_dependencies', 'monitoring', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_component_capabilities', 'Component Capabilities', 'Capability inventory (NEW)', 'dsg_component_capabilities', 'monitoring', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_constraint_sets', 'Constraint Sets', 'Constraint definitions (NEW)', 'dsg_constraint_sets', 'governance', 'internal', 'active', '{"rls_enabled":true}'),
  ('table', 'dsg_inventory_snapshots', 'Inventory Snapshots', 'Change tracking (NEW)', 'dsg_inventory_snapshots', 'monitoring', 'internal', 'active', '{"rls_enabled":true}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('policy', 'policy_spawn_agent', 'Agent Spawn Policy', 'Controls sub-agent creation', 'policy-spawn-agent', 'governance', 'internal', 'active', NULL),
  ('policy', 'policy_execute_action', 'Action Execution Policy', 'Governs all actions', 'policy-execute-action', 'governance', 'internal', 'active', NULL),
  ('policy', 'policy_quota_enforcement', 'Quota Enforcement', 'Enforces usage quotas', 'policy-quota-enforcement', 'billing', 'internal', 'active', NULL),
  ('policy', 'policy_audit_trail', 'Audit Trail Policy', 'Records all decisions', 'policy-audit-trail', 'compliance', 'internal', 'active', NULL)
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('tool', 'bash_execute', 'Bash Execution', 'Execute shell commands', 'bash.execute', 'integrations', 'authenticated', 'active', '{"requires_approval":true}'),
  ('tool', 'file_read', 'File Read', 'Read file contents', 'file.read', 'integrations', 'authenticated', 'active', '{"cost_usd":"0.0001"}'),
  ('tool', 'file_write', 'File Write', 'Write file contents', 'file.write', 'integrations', 'authenticated', 'active', '{"requires_approval":false,"cost_usd":"0.0001"}'),
  ('tool', 'web_search', 'Web Search', 'Search the web', 'web.search', 'integrations', 'authenticated', 'active', '{"cost_usd":"0.002"}'),
  ('tool', 'web_fetch', 'Web Fetch', 'Fetch URL content', 'web.fetch', 'integrations', 'authenticated', 'active', '{"cost_usd":"0.001"}')
ON CONFLICT DO NOTHING;

INSERT INTO dsg_system_components (component_type, name, display_name, description, path_or_id, category, tier, status, metadata)
VALUES
  ('integration', 'supabase_integration', 'Supabase', 'PostgreSQL database and auth', 'supabase', 'integrations', 'internal', 'active', '{"status":"healthy","tables_count":40}'),
  ('integration', 'anthropic_api', 'Anthropic API', 'Claude model access', 'anthropic', 'integrations', 'internal', 'active', '{"status":"healthy"}'),
  ('integration', 'stripe_integration', 'Stripe', 'Payment processing', 'stripe', 'billing', 'internal', 'active', '{"status":"connected"}'),
  ('integration', 'vercel_deployment', 'Vercel', 'Deployment platform', 'vercel', 'integrations', 'internal', 'active', '{"status":"healthy"}')
ON CONFLICT DO NOTHING;
;
