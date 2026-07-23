# Z3 Formal Solver Verification Skill - Integration Guide

**Target**: Integrate z3-formal-solver-verification into DSG gate evaluation pipeline  
**Status**: Ready for implementation  
**Timeline**: 30 minutes for basic integration, 2 hours for full non-blocking setup

---

## Quick Integration (30 minutes)

### Step 1: Add Skill to Gate Evaluator

Edit `lib/dsg/deterministic/gate-evaluator.ts`:

```typescript
import { z3Skill } from '@/skills/z3-formal-solver-verification';

export async function evaluateGate(
  policy: string,
  constraints: string[],
  options?: { verify_determinism?: boolean }
) {
  try {
    // Call z3 skill
    const proof = await z3Skill.verify({
      policy_constraint: policy,
      requirement: constraints.join(' AND '),
      verify_determinism: options?.verify_determinism || false
    });

    return {
      ok: true,
      status: proof.status, // SATISFIABLE | UNSATISFIABLE
      proof_hash: proof.proof_hash,
      model: proof.model,
      unsat_core: proof.unsat_core,
      ccvs_level: proof.ccvs_level,
      evidence: proof.audit_trail
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message,
      status: 'UNKNOWN'
    };
  }
}
```

### Step 2: Connect to Gate Endpoint

Edit `app/api/dsg/v1/gates/evaluate/route.ts`:

```typescript
import { evaluateGate } from '@/lib/dsg/deterministic/gate-evaluator';

export async function POST(req: Request) {
  const { policy, requirement, verify_determinism } = await req.json();

  const result = await evaluateGate(policy, [requirement], {
    verify_determinism
  });

  return NextResponse.json(result);
}
```

### Step 3: Test Integration

```bash
npm run typecheck
npm run test -- tests/unit/gates/gate-evaluator.test.ts

# Manual test
curl -X POST http://localhost:3000/api/dsg/v1/gates/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "policy": "risk < 50 AND role IN [\"admin\"]",
    "requirement": "Approve if safe",
    "verify_determinism": true
  }'
```

---

## Full Non-Blocking Setup (2 hours)

### Architecture: Async Proof Generation

```
1. Agent execution starts
   ↓
2. Gate evaluation requested
   ↓
3. Z3 skill invoked (returns immediately)
   ↓
4. Proof ID returned to caller
   ↓
5. Action executes (NO BLOCKING)
   ↓
6. Proof generates in background
   ↓
7. Result stored in audit trail
   ↓
8. User views proof via proof ID
```

### Implementation Steps

#### Step 1: Create Proof Queue

Edit `lib/dsg/deterministic/proof-queue.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

interface ProofTask {
  id: string;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  policy: string;
  constraints: string[];
  result?: any;
  created_at: Date;
  completed_at?: Date;
}

export class ProofQueue {
  private supabase = createClient(process.env.SUPABASE_URL!, 
                                   process.env.SUPABASE_KEY!);

  async createProofTask(policy: string, constraints: string[]): Promise<string> {
    const { data, error } = await this.supabase
      .from('proof_tasks')
      .insert({
        policy,
        constraints,
        status: 'pending',
        created_at: new Date()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  async updateProofTask(id: string, result: any) {
    await this.supabase
      .from('proof_tasks')
      .update({
        status: 'complete',
        result,
        completed_at: new Date()
      })
      .eq('id', id);
  }

  async getProofTask(id: string): Promise<ProofTask> {
    const { data, error } = await this.supabase
      .from('proof_tasks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }
}
```

#### Step 2: Create Proof Task Storage (Migration)

Create `supabase/migrations/add_proof_tasks.sql`:

```sql
CREATE TABLE IF NOT EXISTS proof_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy TEXT NOT NULL,
  constraints TEXT[] NOT NULL,
  status TEXT CHECK (status IN ('pending', 'processing', 'complete', 'failed')),
  result JSONB,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP,
  created_by UUID,
  
  FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

CREATE INDEX idx_proof_tasks_status ON proof_tasks(status);
CREATE INDEX idx_proof_tasks_created_at ON proof_tasks(created_at DESC);
```

#### Step 3: Implement Background Worker

Create `lib/dsg/deterministic/proof-worker.ts`:

```typescript
import { z3Skill } from '@/skills/z3-formal-solver-verification';
import { ProofQueue } from './proof-queue';

export class ProofWorker {
  private queue = new ProofQueue();
  private processing = false;

  async start() {
    this.processing = true;
    while (this.processing) {
      try {
        // Poll for pending proof tasks
        const tasks = await this.queue.getPendingTasks(10);
        
        for (const task of tasks) {
          await this.processProofTask(task);
        }

        // Sleep before next poll
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error('ProofWorker error:', error);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  private async processProofTask(task: any) {
    try {
      // Mark as processing
      await this.queue.updateTaskStatus(task.id, 'processing');

      // Run Z3 verification
      const proof = await z3Skill.verify({
        policy_constraint: task.policy,
        requirement: task.constraints.join(' AND '),
        verify_determinism: true
      });

      // Store result
      await this.queue.updateProofTask(task.id, {
        proof_hash: proof.proof_hash,
        status: proof.status,
        model: proof.model,
        ccvs_level: proof.ccvs_level,
        determinism_verified: proof.determinism_verified
      });

      // Store in audit trail
      await this.storeAuditTrail(task.id, proof);
    } catch (error) {
      await this.queue.updateTaskStatus(task.id, 'failed');
      console.error(`Proof task ${task.id} failed:`, error);
    }
  }

  private async storeAuditTrail(taskId: string, proof: any) {
    // Store proof in ccvs_evidence table for audit trail
    const supabase = createClient(process.env.SUPABASE_URL!, 
                                   process.env.SUPABASE_KEY!);
    
    await supabase
      .from('ccvs_evidence')
      .insert({
        proof_task_id: taskId,
        proof_hash: proof.proof_hash,
        policy: proof.policy,
        status: proof.status,
        model: proof.model,
        ccvs_level: proof.ccvs_level,
        determinism_verified: proof.determinism_verified,
        created_at: new Date()
      });
  }

  stop() {
    this.processing = false;
  }
}

// Start worker on app boot
if (process.env.NODE_ENV === 'production') {
  const worker = new ProofWorker();
  worker.start().catch(console.error);
}
```

#### Step 4: Update Gate Evaluator (Non-Blocking)

Edit `lib/dsg/deterministic/gate-evaluator.ts`:

```typescript
import { ProofQueue } from './proof-queue';

export async function evaluateGateNonBlocking(
  policy: string,
  constraints: string[]
) {
  const queue = new ProofQueue();

  // Create proof task (returns immediately)
  const taskId = await queue.createProofTask(policy, constraints);

  // Return task ID to caller
  return {
    ok: true,
    proof_task_id: taskId,
    status: 'pending',
    message: 'Proof generation started. Check back with proof_task_id.'
  };
}

// Polling endpoint
export async function getProofStatus(taskId: string) {
  const queue = new ProofQueue();
  const task = await queue.getProofTask(taskId);

  return {
    ok: true,
    task_id: taskId,
    status: task.status,
    proof_hash: task.result?.proof_hash,
    result: task.result,
    completed_at: task.completed_at
  };
}
```

#### Step 5: Create Proof Status Endpoint

Edit `app/api/dsg/v1/proofs/[taskId]/route.ts`:

```typescript
import { getProofStatus } from '@/lib/dsg/deterministic/gate-evaluator';

export async function GET(
  req: Request,
  { params }: { params: { taskId: string } }
) {
  const result = await getProofStatus(params.taskId);
  return NextResponse.json(result);
}
```

#### Step 6: Update Agent Execution (Non-Blocking)

Edit `lib/spine/execute.ts`:

```typescript
export async function executeSpineIntent(intent: SpineIntent) {
  // 1. Evaluate gate (non-blocking)
  const gateResult = await evaluateGateNonBlocking(
    intent.policy,
    intent.constraints
  );

  // 2. Action execution (no waiting for proof)
  const actionResult = await executeAction(intent);

  // 3. Return immediately with proof task ID
  return {
    ok: true,
    action_result: actionResult,
    proof_task_id: gateResult.proof_task_id,
    message: 'Action executed. Proof generated asynchronously.',
    proof_status_url: `/api/dsg/v1/proofs/${gateResult.proof_task_id}`
  };
}
```

---

## DSG Dashboard Integration

### Display Proof Status

In `app/dashboard/proofs/page.tsx`:

```typescript
'use client';

export function ProofTaskViewer({ taskId }: { taskId: string }) {
  const [proof, setProof] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkProofStatus = async () => {
      const res = await fetch(`/api/dsg/v1/proofs/${taskId}`);
      const data = await res.json();
      
      if (data.status === 'complete') {
        setProof(data);
        setLoading(false);
      } else if (data.status === 'failed') {
        setLoading(false);
      }
    };

    const interval = setInterval(checkProofStatus, 2000);
    checkProofStatus();

    return () => clearInterval(interval);
  }, [taskId]);

  if (loading) return <div>Generating proof...</div>;
  if (!proof) return <div>Proof generation failed</div>;

  return (
    <div>
      <h3>Proof Status: {proof.result.status}</h3>
      <p>Proof Hash: {proof.result.proof_hash}</p>
      <p>CCVS Level: {proof.result.ccvs_level}</p>
      <p>Determinism: {proof.result.determinism_verified ? '✅' : '❌'}</p>
      <pre>{JSON.stringify(proof.result.model, null, 2)}</pre>
    </div>
  );
}
```

---

## Testing Integration

### Unit Test

Create `tests/unit/gates/gate-evaluator.test.ts`:

```typescript
import { evaluateGate } from '@/lib/dsg/deterministic/gate-evaluator';
import { z3Skill } from '@/skills/z3-formal-solver-verification';

describe('Gate Evaluator', () => {
  it('should evaluate safe policy', async () => {
    const result = await evaluateGate(
      'risk < 50 AND role IN ["admin"]',
      ['Approve if safe'],
      { verify_determinism: true }
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe('SATISFIABLE');
    expect(result.proof_hash).toBeDefined();
    expect(result.ccvs_level).toBe('L1');
  });

  it('should detect violations', async () => {
    const result = await evaluateGate(
      'risk < 50 AND risk >= 100',
      ['Impossible constraint'],
      {}
    );

    expect(result.ok).toBe(true);
    expect(result.status).toBe('UNSATISFIABLE');
    expect(result.unsat_core).toBeDefined();
  });

  it('should verify determinism', async () => {
    const policy = 'risk < 50 AND role IN ["admin"]';
    
    const result1 = await evaluateGate(policy, ['verify'], 
      { verify_determinism: true });
    const result2 = await evaluateGate(policy, ['verify'], 
      { verify_determinism: true });

    expect(result1.proof_hash).toBe(result2.proof_hash);
  });
});
```

### Integration Test

Create `tests/integration/gates/gate-endpoint.test.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Gate Evaluation Endpoint', () => {
  test('should evaluate policy via API', async ({ request }) => {
    const response = await request.post(
      'http://localhost:3000/api/dsg/v1/gates/evaluate',
      {
        data: {
          policy: 'risk < 50 AND role IN ["admin"]',
          requirement: 'Approve if safe',
          verify_determinism: true
        }
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    
    expect(body.ok).toBe(true);
    expect(body.status).toBe('SATISFIABLE');
    expect(body.proof_hash).toBeDefined();
  });
});
```

---

## Verification Checklist

- [ ] Skill copied to `skills/z3-formal-solver-verification/`
- [ ] Skill JSON config created at `skills/z3-formal-solver-verification.json`
- [ ] Gate evaluator updated to call skill
- [ ] Gate endpoint connected at `/api/dsg/v1/gates/evaluate`
- [ ] Tests passing (unit + integration)
- [ ] Non-blocking queue implemented (optional)
- [ ] Proof task storage created (optional)
- [ ] Background worker running (optional)
- [ ] Dashboard proof viewer integrated (optional)
- [ ] Production deployment verified
- [ ] Determinism verified in production
- [ ] Audit trail recording working

---

## Production Checklist

Before deploying to production:

```bash
# 1. Type check
npm run typecheck

# 2. Run all tests
npm run test

# 3. Build
npm run build

# 4. Verify skill loads
npm run dev

# Test in browser
curl -X POST http://localhost:3000/api/dsg/v1/gates/evaluate \
  -H "Content-Type: application/json" \
  -d '{"policy": "risk < 50", "requirement": "verify"}'

# 5. Deploy
git add .
git commit -m "feat: integrate z3-formal-solver-verification skill"
git push origin main
```

---

## Rollback

If issues occur:

```bash
# Revert to previous gate evaluator
git revert <commit-hash>

# Or temporarily disable skill
# In gate-evaluator.ts, comment out z3Skill call
# and use fallback evaluation

# Keep proof data for investigation
# Do not delete proof_tasks or ccvs_evidence tables
```

---

**Status**: Ready for implementation  
**Estimated Time**: 2 hours for full non-blocking setup  
**Dependencies**: Z3 solver installed locally or accessible
