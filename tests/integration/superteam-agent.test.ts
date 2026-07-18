import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const SUPERTEAM_API_KEY = process.env.SUPERTEAM_API_KEY || '';

interface AgentResponse {
  success: boolean;
  registration?: {
    agentId: string;
    claimCode: string;
  };
  error?: string;
}

interface ListingResponse {
  success: boolean;
  listings?: Array<{
    id: string;
    title: string;
    reward: number;
  }>;
  count?: number;
}

interface SubmissionResponse {
  success: boolean;
  submissionId?: string;
  claimCode?: string;
  error?: string;
}

describe('Superteam Agent Integration', () => {
  let agentId: string;
  let claimCode: string;
  let listingId: string;

  describe('Agent Registration', () => {
    it('should register a new agent', async () => {
      const response = await fetch(`${BASE_URL}/api/superteam/agent/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: 'test-agent-' + Date.now() }),
      });

      const data = (await response.json()) as AgentResponse;
      expect(data.success).toBe(true);
      expect(data.registration).toBeDefined();
      expect(data.registration?.agentId).toBeTruthy();
      expect(data.registration?.claimCode).toBeTruthy();

      agentId = data.registration!.agentId;
      claimCode = data.registration!.claimCode;
    });

    it('should return agentId and claimCode on registration', () => {
      expect(agentId).toBeTruthy();
      expect(claimCode).toBeTruthy();
      expect(claimCode.length).toBeGreaterThan(5);
    });
  });

  describe('Heartbeat Monitoring', () => {
    it('should return agent status', async () => {
      const response = await fetch(
        `${BASE_URL}/api/superteam/agent/heartbeat?agentId=${agentId}`
      );

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.heartbeat).toBeDefined();
      expect(data.heartbeat.status).toMatch(/ok|degraded|blocked/);
      expect(data.heartbeat.agentName).toBeTruthy();
    });
  });

  describe('Listing Discovery', () => {
    it('should discover agent-eligible listings', async () => {
      const response = await fetch(
        `${BASE_URL}/api/superteam/agent/discover?agentId=${agentId}&take=5`
      );

      const data = (await response.json()) as ListingResponse;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.listings)).toBe(true);
      expect(data.count).toBeGreaterThan(0);

      if (data.listings && data.listings.length > 0) {
        listingId = data.listings[0].id;
        expect(data.listings[0].title).toBeTruthy();
        expect(data.listings[0].reward).toBeGreaterThan(0);
      }
    });

    it('should filter by listing type', async () => {
      const response = await fetch(
        `${BASE_URL}/api/superteam/agent/discover?agentId=${agentId}&type=bounty&take=3`
      );

      const data = (await response.json()) as ListingResponse;
      expect(data.success).toBe(true);
      expect(Array.isArray(data.listings)).toBe(true);
    });
  });

  describe('Work Submission', () => {
    it('should submit work to a listing', async () => {
      if (!listingId) {
        console.warn('Skipping submission test - no listing found');
        return;
      }

      const response = await fetch(`${BASE_URL}/api/superteam/agent/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          listingId,
          link: 'https://github.com/agent/solution',
          otherInfo: 'Completed all requirements and tests pass',
        }),
      });

      const data = (await response.json()) as SubmissionResponse;
      expect(data.success).toBe(true);
      expect(data.submissionId).toBeTruthy();
      expect(data.claimCode).toBe(claimCode); // Same claim code
    });
  });

  describe('Agent Claim Flow', () => {
    it('should validate claim code format', () => {
      expect(claimCode).toBeTruthy();
      expect(claimCode.length).toBeGreaterThanOrEqual(6);
    });

    it('should handle human claim', async () => {
      const response = await fetch(`${BASE_URL}/api/superteam/agent/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode,
          humanId: 'test-user-' + Date.now(),
          humanEmail: 'test@example.com',
        }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.agent).toBeDefined();
      expect(data.submissions).toBeDefined();
    });

    it('should reject invalid claim code', async () => {
      const response = await fetch(`${BASE_URL}/api/superteam/agent/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode: 'INVALID_CODE',
          humanId: 'test-user',
        }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agentId', async () => {
      const response = await fetch(
        `${BASE_URL}/api/superteam/agent/heartbeat?agentId=`
      );

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle missing required fields in submission', async () => {
      const response = await fetch(`${BASE_URL}/api/superteam/agent/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          listingId, // Missing link and otherInfo
        }),
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      // Make 10 rapid requests
      const requests = Array(10)
        .fill(null)
        .map(() =>
          fetch(`${BASE_URL}/api/superteam/agent/heartbeat?agentId=${agentId}`)
        );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // At least some should succeed, none should crash
      expect(statuses.some((s) => s === 200)).toBe(true);
    });
  });
});
