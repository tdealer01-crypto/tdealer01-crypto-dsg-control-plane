-- Stripe Approval Decision RPC
-- P0-4: record_stripe_approval_decision - Atomic transaction: verify + update + audit
-- P0-5: Hash chain for immutable audit trail

CREATE OR REPLACE FUNCTION record_stripe_approval_decision(
  p_approval_id TEXT,           -- stripe_event_id of the REVIEW audit
  p_decision TEXT,              -- 'approved' or 'rejected'
  p_reason TEXT,                -- Human-readable reason
  p_reviewer_id TEXT,           -- User ID who made the decision
  p_reviewer_role TEXT,         -- Role of reviewer (owner/admin/approver)
  p_org_id TEXT                 -- DSG organization ID (for authorization check)
) RETURNS JSONB AS $$
DECLARE
  v_approval RECORD;
  v_account RECORD;
  v_new_decision TEXT;
  v_new_decision_id TEXT;
  v_new_proof_hash TEXT;
  v_prev_hash TEXT;
  v_chain_index BIGINT;
  v_new_chain_index BIGINT;
  v_new_record_hash TEXT;
  v_locked_at TIMESTAMPTZ := NOW();
  v_audit_payload JSONB;
BEGIN
  -- Validate decision parameter
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Invalid decision: must be approved or rejected'
    );
  END IF;

  -- Map decision to DSG decision
  v_new_decision := CASE WHEN p_decision = 'approved' THEN 'ALLOW' ELSE 'BLOCK' END;
  v_new_decision_id := p_decision || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT;

  -- 1. VERIFY: Find the approval in stripe_operation_audits
  SELECT a.*, ac.dsg_org_id
  INTO v_approval, v_account
  FROM stripe_operation_audits a
  JOIN stripe_app_accounts ac ON ac.stripe_account_id = a.stripe_account_id
  WHERE a.stripe_event_id = p_approval_id
    AND a.dsg_decision = 'REVIEW'
    AND ac.dsg_org_id = p_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Approval not found or not accessible in this organization'
    );
  END IF;

  -- Check if already processed
  IF v_approval.status IN ('reviewed', 'executed') THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'Approval already processed',
      'status', v_approval.status
    );
  END IF;

  -- 2. GET LATEST CHAIN STATE for hash chaining (P0-5)
  SELECT chain_index, record_hash
  INTO v_chain_index, v_prev_hash
  FROM get_latest_audit_chain(v_approval.stripe_account_id);

  IF NOT FOUND THEN
    v_chain_index := 0;
    v_prev_hash := NULL;
  END IF;

  v_new_chain_index := v_chain_index + 1;

  -- 3. COMPUTE NEW RECORD HASH with prev_hash
  v_audit_payload := jsonb_build_object(
    'original_approval_id', p_approval_id,
    'decision', p_decision,
    'reason', p_reason,
    'reviewer_id', p_reviewer_id,
    'reviewer_role', p_reviewer_role,
    'reviewed_at', NOW()
  );

  v_new_record_hash := compute_audit_record_hash(
    v_approval.stripe_account_id,
    v_new_decision_id,
    v_approval.stripe_object_id,
    v_approval.operation_type,
    v_new_decision,
    p_reason,
    v_new_decision_id,
    v_audit_payload,
    v_prev_hash
  );

  -- 4. ATOMIC TRANSACTION: Update approval + Insert new audit record
  -- Update the original REVIEW audit to mark as reviewed
  UPDATE stripe_operation_audits
  SET status = 'reviewed',
      dsg_decision = v_new_decision,
      dsg_reason = p_reason,
      dsg_decision_id = v_new_decision_id,
      updated_at = NOW(),
      locked_at = v_locked_at
  WHERE stripe_event_id = p_approval_id;

  -- Insert the decision audit with hash chain
  INSERT INTO stripe_operation_audits (
    stripe_account_id,
    stripe_event_id,
    stripe_object_id,
    operation_type,
    dsg_decision_id,
    dsg_decision,
    dsg_reason,
    dsg_proof,
    payload,
    status,
    prev_hash,
    record_hash,
    chain_index,
    locked_at
  ) VALUES (
    v_approval.stripe_account_id,
    v_new_decision_id,
    v_approval.stripe_object_id,
    v_approval.operation_type,
    v_new_decision_id,
    v_new_decision,
    p_reason,
    v_new_decision_id,
    v_audit_payload,
    'executed',
    v_prev_hash,
    v_new_record_hash,
    v_new_chain_index,
    v_locked_at
  );

  -- 5. RETURN RESULT with proof hash and policy version
  RETURN jsonb_build_object(
    'ok', true,
    'decision', v_new_decision,
    'decision_id', v_new_decision_id,
    'proof_hash', v_new_record_hash,
    'policy_version', '1.0.0',  -- Could be fetched from policy table
    'audit_recorded', true,
    'chain_index', v_new_chain_index,
    'reviewed_at', NOW()
  );

EXCEPTION WHEN OTHERS THEN
  -- Any failure = fail-closed (no ok:true with recorded:false)
  RETURN jsonb_build_object(
    'ok', false,
    'error', 'RPC execution failed: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION record_stripe_approval_decision TO service_role;

SELECT pg_sleep(0);