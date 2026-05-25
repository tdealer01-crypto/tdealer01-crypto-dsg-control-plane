import { describe, it, expect, vi } from 'vitest';

// The plan route imports derivePlanFromPrd and observePlanDraft from lib — both
// are pure functions with no external I/O so we can test without mocking them.
// We only need to prevent any potential next/server incompatibility.

import { POST } from '../../app/api/dsg/app-builder/plan/route';
import type { DsgAppBuilderPrd } from '@/lib/dsg/app-builder/types/prd';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/dsg/app-builder/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_PRD: DsgAppBuilderPrd = {
  title: 'CRM Dashboard',
  summary: 'A lightweight CRM for small teams',
  useCase: 'Manage contacts and tasks',
  userProblem: 'Teams lose track of customer interactions',
  targetUsers: ['sales teams', 'freelancers'],
  coreFeatures: ['contacts', 'tasks', 'notes'],
  nonGoals: ['billing', 'payments'],
  acceptanceCriteria: ['Can create a contact', 'Can assign a task'],
  frontend: ['Next.js', 'React'],
  backend: ['Supabase'],
  database: ['PostgreSQL'],
  deployment: ['Vercel'],
};

describe('POST /api/dsg/app-builder/plan', () => {
  it('returns 200 with plan and observer for a valid PRD', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.plan).toBeDefined();
    expect(body.observer).toBeDefined();
    expect(body.boundary).toBeDefined();
  });

  it('plan contains a jobId, actions array, and claimBoundary', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    const body = await response.json();

    const { plan } = body;
    expect(typeof plan.jobId).toBe('string');
    expect(plan.jobId.length).toBeGreaterThan(0);
    expect(Array.isArray(plan.actions)).toBe(true);
    expect(plan.actions.length).toBeGreaterThan(0);
    expect(plan.claimBoundary).toBeDefined();
    expect(plan.claimBoundary.productionReadyClaim).toBe(false);
  });

  it('boundary always sets productionReadyClaim and runtimeExecutionReady to false', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    const body = await response.json();

    expect(body.boundary.productionReadyClaim).toBe(false);
    expect(body.boundary.runtimeExecutionReady).toBe(false);
    expect(body.boundary.claimStatus).toBe('PLAN_DRAFT_ONLY');
    expect(body.boundary.z3RuntimeProof).toBe(false);
  });

  it('observer has a gateName and status field', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    const body = await response.json();

    const { observer } = body;
    expect(observer.gateName).toBe('PLAN_FEASIBILITY_OBSERVER');
    expect(typeof observer.status).toBe('string');
    expect(['PASS', 'BLOCK']).toContain(observer.status);
  });

  it('returns 400 when prd is missing entirely', async () => {
    const req = makeRequest({});
    const response = await POST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('APP_BUILDER_PRD_REQUIRED');
    expect(body.boundary.claimStatus).toBe('PLAN_DRAFT_BLOCKED');
    expect(body.boundary.productionReadyClaim).toBe(false);
  });

  it('returns 400 when prd.title is missing', async () => {
    const { title: _title, ...prdWithoutTitle } = VALID_PRD;
    const req = makeRequest({ prd: prdWithoutTitle });
    const response = await POST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('APP_BUILDER_PRD_REQUIRED');
  });

  it('returns 400 when prd.userProblem is missing', async () => {
    const { userProblem: _userProblem, ...prdWithoutProblem } = VALID_PRD;
    const req = makeRequest({ prd: prdWithoutProblem });
    const response = await POST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe('APP_BUILDER_PRD_REQUIRED');
  });

  it('returns 400 when prd.title is not a string', async () => {
    const req = makeRequest({ prd: { ...VALID_PRD, title: 42 } });
    const response = await POST(req);
    expect(response.status).toBe(400);

    const body = await response.json();
    expect(body.ok).toBe(false);
  });

  it('returns 400 when body is entirely malformed JSON', async () => {
    const req = new Request('http://localhost/api/dsg/app-builder/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const response = await POST(req);
    // body.json() throws → req.json().catch(() => ({})) so prd is undefined → 400
    expect(response.status).toBe(400);
  });

  it('plan actions include a lock_goal action at wave 0', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    const body = await response.json();

    const lockGoalAction = body.plan.actions.find((a: { id: string }) => a.id === 'lock_goal');
    expect(lockGoalAction).toBeDefined();
    expect(lockGoalAction.wave).toBe(0);
  });

  it('plan actions include generate_frontend and generate_api in wave 1', async () => {
    const req = makeRequest({ prd: VALID_PRD });
    const response = await POST(req);
    const body = await response.json();

    const frontendAction = body.plan.actions.find((a: { id: string }) => a.id === 'generate_frontend');
    const apiAction = body.plan.actions.find((a: { id: string }) => a.id === 'generate_api');
    expect(frontendAction).toBeDefined();
    expect(frontendAction.wave).toBe(1);
    expect(apiAction).toBeDefined();
    expect(apiAction.wave).toBe(1);
  });

  it('plan includes database migration action when PRD mentions database keywords', async () => {
    const prdWithDb: DsgAppBuilderPrd = {
      ...VALID_PRD,
      database: ['PostgreSQL', 'database'],
      coreFeatures: ['crud', 'contacts'],
    };
    const req = makeRequest({ prd: prdWithDb });
    const response = await POST(req);
    const body = await response.json();

    const dbAction = body.plan.actions.find((a: { id: string }) => a.id === 'generate_database_migration');
    expect(dbAction).toBeDefined();
  });
});
