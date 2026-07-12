const https = require('https');

const BASE_URL = 'https://tdealer01-crypto-dsg-control-plane.vercel.app';
const TEST_EMAIL = `test-phase4b-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Phase4BTest!2026';

// Helper to make HTTPS requests
function httpRequest(method, url, headers, body = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = https.request(parsedUrl, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: data ? JSON.parse(data) : null,
        });
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Helper to wait
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signupAndTriggerEvents() {
  console.log('🚀 Phase 4B API Automation Starting');
  console.log(`📧 Test Email: ${TEST_EMAIL}`);
  console.log(`🔗 URL: ${BASE_URL}`);
  console.log('');

  try {
    // Step 1: Signup via Supabase auth endpoint
    console.log('Step 1: Signing up via Supabase...');
    const signupUrl = `${BASE_URL}/api/auth/signup`;
    const signupRes = await httpRequest('POST', signupUrl, {}, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    console.log(`  Response: ${signupRes.status}`);

    if (signupRes.status >= 400) {
      console.log(`  ⚠ Signup failed, trying to continue...`);
    }

    await wait(2000);

    // Step 2: Bootstrap - create organization
    console.log('Step 2: Bootstrapping organization...');
    const bootstrapUrl = `${BASE_URL}/api/auth/bootstrap`;
    const bootstrapRes = await httpRequest('POST', bootstrapUrl, {});
    console.log(`  Response: ${bootstrapRes.status}`);
    if (bootstrapRes.body?.ok) {
      console.log(`  ✓ Organization created`);
    }

    await wait(2000);

    // Step 3: Provision access / create workspace
    console.log('Step 3: Provisioning access...');
    const provisionUrl = `${BASE_URL}/api/auth/provision-access`;
    const provisionRes = await httpRequest('POST', provisionUrl, {}, {});
    console.log(`  Response: ${provisionRes.status}`);
    if (provisionRes.body?.ok) {
      console.log(`  ✓ Access provisioned`);
    }

    await wait(2000);

    // Step 4: Create policy
    console.log('Step 4: Creating policy...');
    const policyUrl = `${BASE_URL}/api/markdoc-policies`;
    const policyRes = await httpRequest('POST', policyUrl, {}, {
      name: `Phase 4B Test Policy ${Date.now()}`,
      markdown_content: '# Test Policy\n\n## Rules\n\nAllow: resource_type == "api"',
      active: true,
    });
    console.log(`  Response: ${policyRes.status}`);
    if (policyRes.body?.id) {
      console.log(`  ✓ Policy created: ${policyRes.body.id}`);
    }

    const policyId = policyRes.body?.id || 'test-policy';
    await wait(2000);

    // Step 5: Create agent
    console.log('Step 5: Creating agent...');
    const agentUrl = `${BASE_URL}/api/agents`;
    const agentRes = await httpRequest('POST', agentUrl, {}, {
      name: `phase-4b-test-agent-${Date.now()}`,
      description: 'Phase 4B test automation agent',
      active: true,
    });
    console.log(`  Response: ${agentRes.status}`);
    if (agentRes.body?.id) {
      console.log(`  ✓ Agent created: ${agentRes.body.id}`);
    }

    const agentId = agentRes.body?.id || 'test-agent';
    await wait(2000);

    // Step 6: Submit execution
    console.log('Step 6: Submitting execution...');
    const executeUrl = `${BASE_URL}/api/spine/execute`;
    const executeRes = await httpRequest('POST', executeUrl, {}, {
      agent_id: agentId,
      policy_id: policyId,
      intent: {
        resource_type: 'api',
        action: 'read',
      },
    });
    console.log(`  Response: ${executeRes.status}`);
    if (executeRes.body?.execution_id) {
      console.log(`  ✓ Execution submitted: ${executeRes.body.execution_id}`);
    }

    await wait(2000);

    // Step 7: Check approval queue
    console.log('Step 7: Checking approval queue...');
    const approvalUrl = `${BASE_URL}/api/approval-queue/pending`;
    const approvalRes = await httpRequest('GET', approvalUrl, {});
    console.log(`  Response: ${approvalRes.status}`);

    await wait(2000);

    // Step 8: Export evidence
    console.log('Step 8: Querying audit trail...');
    const auditUrl = `${BASE_URL}/api/gateway/audit/events`;
    const auditRes = await httpRequest('GET', auditUrl, {});
    console.log(`  Response: ${auditRes.status}`);

    await wait(2000);

    // Step 9: Generate compliance report
    console.log('Step 9: Generating compliance report...');
    const complianceUrl = `${BASE_URL}/api/ccvs/compliance-status`;
    const complianceRes = await httpRequest('POST', complianceUrl, {}, {
      run_id: `test-run-${Date.now()}`,
      claim_pass_eligible: true,
      requirements_pass: 10,
      requirements_total: 10,
      mutation_score: 0.95,
    });
    console.log(`  Response: ${complianceRes.status}`);

    await wait(2000);

    // Step 10: Verify proof
    console.log('Step 10: Verifying proof...');
    const proofUrl = `${BASE_URL}/api/dsg/v1/proofs/prove`;
    const proofRes = await httpRequest('POST', proofUrl, {}, {
      execution_hash: `test-${Date.now()}`,
      proof_type: 'deterministic',
      input: {},
    });
    console.log(`  Response: ${proofRes.status}`);

    await wait(15000);

    console.log('');
    console.log('✅ Phase 4B API Automation Complete');
    console.log('');
    console.log('📊 Events should now be flowing to PostHog');
    console.log('');
    console.log('Next steps:');
    console.log('1. Wait 10-15 seconds for event batching');
    console.log('2. Check PostHog Events tab:');
    console.log('   https://us.posthog.com/project/479488/events');
    console.log('');
    console.log('3. Run validation:');
    console.log('   bash ./scratchpad/phase-4b-validation-automation.sh');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

signupAndTriggerEvents();
