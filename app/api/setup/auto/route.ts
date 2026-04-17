import { createHash, randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { requireOrgRole } from '../../../../lib/authz';
import { getOverageRateUsd, INCLUDED_EXECUTIONS } from '../../../../lib/billing/overage-config';
import { bootstrapOrgStarterState } from '../../../../lib/onboarding/bootstrap';
import { canonicalHash, canonicalJson } from '../../../../lib/runtime/canonical';
import { buildCheckpointHash } from '../../../../lib/runtime/checkpoint';
import { invokeRuntimeCommitRpc } from '../../../../lib/runtime/commit-rpc';
import { handleApiError } from '../../../../lib/security/api-error';
import { getSupabaseAdmin } from '../../../../lib/supabase-server';

export const dynamic = 'force-dynamic';
type SetupStatus = 'OK' | 'CREATED' | 'EXISTS' | 'FAIL';

function isMissingSchemaError(message: string, identifier: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('schema cache') && normalized.includes(identifier.toLowerCase());
}

function isMissingRelationError(message: string, identifier: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes(`relation "${identifier.toLowerCase()}" does not exist`) ||
    normalized.includes(`could not find the table`) && normalized.includes(identifier.toLowerCase())
  );
}

function toStepStatus(label: string, error: { message: string } | null) {
  if (!error) return `${label}: OK`;

  if (isMissingSchemaError(error.message, "policies")) {
    return `${label}: WARN (schema not synced: run latest policies migration)`;
  }
  if (isMissingSchemaError(error.message, 'runtime_approval_requests')) {
    return `${label}: WARN (table missing in API cache: run runtime spine migrations)`;
  }
  if (isMissingSchemaError(error.message, 'billing_subscriptions')) {
    return `${label}: WARN (table missing in API cache: run billing migrations)`;
  }

  return `${label}: FAIL (${error.message})`;
}

function isMissingInfraError(message: string, identifier: string) {
  return isMissingSchemaError(message, identifier) || isMissingRelationError(message, identifier);
}

export async function POST(_request: Request) {
  try {
    const access = await requireOrgRole(['org_admin']);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const orgId = access.orgId;
    const admin = getSupabaseAdmin();
    const now = new Date().toISOString();
    const suffix = randomUUID().slice(0, 8);
    const results: Record<string, unknown> = { org_id: orgId, steps: [] as string[] };
    let policyStatus: SetupStatus = 'OK';
    let agentStatus: SetupStatus | null = null;
    let rpcCommitStatus: SetupStatus = 'FAIL';
    let checkpointStatus: SetupStatus = 'FAIL';
    let billingStatus: SetupStatus = 'FAIL';
    let onboardingStatus: SetupStatus = 'FAIL';
    let runtimeRolesStatus: SetupStatus = 'FAIL';

    const fail = (payload: Record<string, unknown>, status = 500) =>
      NextResponse.json(
        {
          ...results,
          ...payload,
          ok: false,
        },
        { status },
      );

    let { error: policyError } = await admin.from('policies').upsert(
      {
        id: 'policy_default',
        name: 'Default DSG Policy',
        version: 'v1',
        status: 'active',
        description: 'Baseline deterministic safety policy.',
        config: { block_risk_score: 0.8, stabilize_risk_score: 0.4, oscillation_window: 4 },
      },
      { onConflict: 'id', ignoreDuplicates: true },
    );

    if (policyError && isMissingInfraError(policyError.message, 'config')) {
      const retry = await admin.from('policies').upsert(
        {
          id: 'policy_default',
          name: 'Default DSG Policy',
          version: 'v1',
          status: 'active',
          description: 'Baseline deterministic safety policy.',
        },
        { onConflict: 'id', ignoreDuplicates: true },
      );
      policyError = retry.error;
    }
    (results.steps as string[]).push(toStepStatus('policy', policyError));
    if (policyError) {
      policyStatus = 'FAIL';
    }

    const existingAgentsResult = await admin
      .from('agents')
      .select('id, name')
      .eq('org_id', orgId)
      .limit(1);

    if (existingAgentsResult.error) {
      agentStatus = 'FAIL';
      (results.steps as string[]).push(`agent_lookup: FAIL (${existingAgentsResult.error.message})`);
      return fail({
        error: 'Failed to inspect existing agents before Auto-Setup.',
      });
    }

    const existingAgents = existingAgentsResult.data ?? [];

    let agentId: string;
    let apiKey: string | null = null;

    if (existingAgents && existingAgents.length > 0) {
      agentId = String(existingAgents[0].id);
      results.agent_id = agentId;
      agentStatus = 'EXISTS';
      (results.steps as string[]).push(`agent: EXISTS (${agentId})`);
    } else {
      agentId = `agent-${suffix}`;
      apiKey = `dsg_${randomUUID().replace(/-/g, '')}`;
      const { error: agentError } = await admin.from('agents').insert({
        id: agentId,
        org_id: orgId,
        name: 'Auto-Setup Agent',
        policy_id: 'policy_default',
        status: 'active',
        api_key_hash: createHash('sha256').update(apiKey).digest('hex'),
        monthly_limit: 10000,
      });
      results.agent_id = agentId;
      agentStatus = agentError ? 'FAIL' : 'CREATED';
      (results.steps as string[]).push(agentError ? `agent: FAIL (${agentError.message})` : `agent: CREATED (${agentId})`);
    }

    const approvalId = randomUUID();
    const canonical = {
      action: 'auto_setup_verification',
      input: { amount: 0, asset: 'SYSTEM', source: 'auto-setup' },
      context: { risk_score: 0.05, source: 'auto_setup' },
      decision: 'ALLOW',
      policyVersion: 'v1',
      reason: 'Auto-setup verification execution',
    };

    const { error: approvalError } = await admin.from('runtime_approval_requests').insert({
      id: approvalId,
      org_id: orgId,
      agent_id: agentId,
      approval_key: `auto-setup-${suffix}`,
      request_payload: canonical,
      status: 'pending',
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    if (approvalError) {
      if (isMissingInfraError(approvalError.message, 'runtime_approval_requests')) {
        const { data: execution, error: legacyExecError } = await admin
          .from('executions')
          .insert({
            org_id: orgId,
            agent_id: agentId,
            decision: 'ALLOW',
            latency_ms: 1,
            request_payload: canonical.input,
            context_payload: canonical.context,
            policy_version: 'v1',
            reason: 'Auto-setup verification execution (legacy fallback)',
          })
          .select('id')
          .single();

        if (legacyExecError || !execution) {
          (results.steps as string[]).push(`approval: FAIL (${approvalError.message})`);
          (results.steps as string[]).push(`rpc_commit: FAIL (${legacyExecError?.message || 'legacy execution failed'})`);
          rpcCommitStatus = 'FAIL';
          checkpointStatus = 'FAIL';
        } else {
          results.execution_id = execution.id;
          await admin.from('audit_logs').insert({
            org_id: orgId,
            agent_id: agentId,
            execution_id: execution.id,
            policy_version: 'v1',
            decision: 'ALLOW',
            reason: 'Auto-setup verification execution (legacy fallback)',
            evidence: { source: 'auto_setup_legacy_fallback', canonical },
          });
          (results.steps as string[]).push('approval: OK (legacy fallback)');
          (results.steps as string[]).push(`rpc_commit: OK (legacy execution=${execution.id})`);
          (results.steps as string[]).push('checkpoint: FAIL (legacy fallback did not create runtime checkpoint)');
          rpcCommitStatus = 'OK';
        }
      } else {
        (results.steps as string[]).push(toStepStatus('approval', approvalError));
        rpcCommitStatus = 'FAIL';
      }
    } else {
      const { data: commit, error: commitError, mode: commitMode } = await invokeRuntimeCommitRpc(admin, {
        p_org_id: orgId,
        p_agent_id: agentId,
        p_request_id: approvalId,
        p_decision: 'ALLOW',
        p_reason: 'Auto-setup verification — system healthy',
        p_metadata: { action: 'auto_setup_verification', source: 'auto-setup' },
        p_canonical_hash: canonicalHash(canonical),
        p_canonical_json: JSON.parse(canonicalJson(canonical)),
        p_latency_ms: 1,
        p_request_payload: canonical.input,
        p_context_payload: canonical.context,
        p_policy_version: 'v1',
        p_audit_evidence: { risk_score: 0.05, source: 'auto_setup', verified: true },
        p_usage_amount_usd: getOverageRateUsd(),
        p_created_at: now,
        p_agent_monthly_limit: 10000,
        p_org_plan_limit: INCLUDED_EXECUTIONS.trial,
      });

      if (commitError) {
        (results.steps as string[]).push(`rpc_commit: FAIL (${commitError.message})`);
        rpcCommitStatus = 'FAIL';
      } else {
        const row = Array.isArray(commit) ? commit[0] : commit;
        results.execution_id = row?.execution_id;
        results.ledger_id = row?.ledger_id;
        results.truth_state_id = row?.truth_state_id;
        (results.steps as string[]).push(
          `rpc_commit: OK${commitMode === 'legacy' ? ' (legacy-signature)' : ''} (execution=${row?.execution_id})`,
        );
        rpcCommitStatus = 'OK';

        if (row?.ledger_id && row?.truth_state_id) {
          const cpHash = buildCheckpointHash({
            truthCanonicalHash: canonicalHash(canonical),
            latestLedgerId: String(row.ledger_id),
            latestLedgerSequence: Number(row.ledger_sequence || 0),
            latestTruthSequence: Number(row.truth_sequence || 0),
          });

          const { error: checkpointError } = await admin.from('runtime_checkpoints').upsert(
            {
              org_id: orgId,
              agent_id: agentId,
              truth_state_id: row.truth_state_id,
              latest_ledger_entry_id: row.ledger_id,
              checkpoint_hash: cpHash,
              metadata: { source: 'auto_setup' },
            },
            { onConflict: 'org_id,agent_id,checkpoint_hash', ignoreDuplicates: true },
          );

          if (checkpointError) {
            (results.steps as string[]).push(`checkpoint: FAIL (${checkpointError.message})`);
            checkpointStatus = 'FAIL';
          } else {
            (results.steps as string[]).push('checkpoint: OK');
            checkpointStatus = 'OK';
          }
        } else {
          (results.steps as string[]).push('checkpoint: FAIL (missing ledger/truth references from runtime commit)');
          checkpointStatus = 'FAIL';
        }
      }
    }

    const { data: existingSub, error: existingSubError } = await admin
      .from('billing_subscriptions')
      .select('id')
      .eq('org_id', orgId)
      .limit(1);

    if (existingSubError && isMissingInfraError(existingSubError.message, 'billing_subscriptions')) {
      (results.steps as string[]).push('billing: OK (trial-default fallback)');
      billingStatus = 'OK';
    } else if (existingSubError) {
      (results.steps as string[]).push(`billing: FAIL (${existingSubError.message})`);
      billingStatus = 'FAIL';
    } else
    if (!existingSub || existingSub.length === 0) {
      const { error: subError } = await admin.from('billing_subscriptions').insert({
        stripe_subscription_id: `placeholder_sub_${orgId}`,
        stripe_customer_id: `placeholder_cus_${orgId}`,
        org_id: orgId,
        customer_email: `placeholder+setup@${orgId}`,
        status: 'trialing',
        plan_key: 'trial',
        billing_interval: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 14 * 86400_000).toISOString(),
      });
      (results.steps as string[]).push(
        subError ? toStepStatus('billing', subError) : 'billing: CREATED (trial)',
      );
      billingStatus = subError ? 'FAIL' : 'CREATED';
    } else {
      (results.steps as string[]).push('billing: EXISTS');
      billingStatus = 'EXISTS';
    }

    try {
      await bootstrapOrgStarterState(orgId, { initiatedByUserId: access.userId });
      (results.steps as string[]).push('onboarding: OK');
      onboardingStatus = 'OK';
    } catch (error) {
      (results.steps as string[]).push(
        `onboarding: FAIL (${error instanceof Error ? error.message : 'unknown'})`,
      );
      onboardingStatus = 'FAIL';
    }

    const { error: runtimeRolesError } = await admin.from('runtime_roles').upsert(
      [
        { org_id: orgId, user_id: access.userId, role: 'org_admin' },
        { org_id: orgId, user_id: access.userId, role: 'operator' },
        { org_id: orgId, user_id: access.userId, role: 'runtime_auditor' },
        { org_id: orgId, user_id: access.userId, role: 'billing_admin' },
      ],
      { onConflict: 'org_id,user_id,role', ignoreDuplicates: true },
    );

    if (runtimeRolesError) {
      (results.steps as string[]).push(`runtime_roles: FAIL (${runtimeRolesError.message})`);
      runtimeRolesStatus = 'FAIL';
    } else {
      (results.steps as string[]).push('runtime_roles: OK');
      runtimeRolesStatus = 'OK';
    }

    const coreMode = process.env.DSG_CORE_MODE;
    results.env_check = {
      DSG_CORE_MODE: coreMode || '❌ NOT SET — dashboard จะ error',
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌ NOT SET',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅' : '❌ NOT SET',
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? '✅' : '❌ NOT SET',
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET ? '✅' : '❌ NOT SET',
    };

    if (apiKey) {
      results.api_key = apiKey;
      results.api_key_warning = '⚠️ เก็บ key นี้ไว้ — จะไม่แสดงอีก';
    }

    results.policy = policyStatus;
    results.agent = agentStatus ?? 'FAIL';
    results.rpc_commit = rpcCommitStatus;
    results.checkpoint = checkpointStatus;
    results.billing = billingStatus;
    results.onboarding = onboardingStatus;
    results.runtime_roles = runtimeRolesStatus;

    const hasFirstExecution = typeof results.execution_id === 'string' && results.execution_id.length > 0;
    const firstRunComplete =
      hasFirstExecution &&
      policyStatus !== 'FAIL' &&
      (agentStatus === 'CREATED' || agentStatus === 'EXISTS') &&
      rpcCommitStatus === 'OK' &&
      checkpointStatus === 'OK' &&
      (billingStatus === 'OK' || billingStatus === 'CREATED' || billingStatus === 'EXISTS') &&
      onboardingStatus === 'OK' &&
      runtimeRolesStatus === 'OK';

    results.first_run_complete = firstRunComplete;
    results.ok = firstRunComplete;
    results.next_steps = [] as string[];
    if (!coreMode) {
      (results.next_steps as string[]).push('ตั้ง DSG_CORE_MODE=internal บน Vercel');
    }
    if (!process.env.STRIPE_SECRET_KEY) {
      (results.next_steps as string[]).push('ตั้ง STRIPE_SECRET_KEY บน Vercel (ถ้าจะใช้ billing)');
    }

    if (!firstRunComplete) {
      return NextResponse.json(
        {
          ...results,
          error: 'Auto-Setup did not complete first-run requirements. Check step statuses and fix failing infrastructure.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return handleApiError('api/setup/auto', error);
  }
}
