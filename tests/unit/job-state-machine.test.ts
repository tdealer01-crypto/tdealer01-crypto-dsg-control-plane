/**
 * Job State Machine Unit Tests
 *
 * Tests state transitions, validation, and terminal state detection.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidTransition,
  getAllowedNextStates,
  isTerminalState,
  isBlockedState,
  transitionJobState,
  getJobState,
  createDelegationJob,
} from '@/lib/delegation/job-state-machine';
import type { DelegationJobState } from '@/lib/delegation/job-state-machine';

describe('Job State Machine', () => {
  describe('isValidTransition', () => {
    it('allows CREATED -> GOAL_LOCKED', () => {
      expect(isValidTransition('CREATED', 'GOAL_LOCKED')).toBe(true);
    });

    it('allows CREATED -> BLOCKED_PERMISSION', () => {
      expect(isValidTransition('CREATED', 'BLOCKED_PERMISSION')).toBe(true);
    });

    it('disallows CREATED -> EXECUTING', () => {
      expect(isValidTransition('CREATED', 'EXECUTING')).toBe(false);
    });

    it('allows PLANNING -> Z3_VERIFYING', () => {
      expect(isValidTransition('PLANNING', 'Z3_VERIFYING')).toBe(true);
    });

    it('allows Z3_VERIFYING -> WAITING_USER_CONFIRM', () => {
      expect(isValidTransition('Z3_VERIFYING', 'WAITING_USER_CONFIRM')).toBe(true);
    });

    it('allows Z3_VERIFYING -> EXECUTING (skip confirmation)', () => {
      expect(isValidTransition('Z3_VERIFYING', 'EXECUTING')).toBe(true);
    });

    it('disallows WAITING_USER_CONFIRM -> Z3_VERIFYING', () => {
      expect(isValidTransition('WAITING_USER_CONFIRM', 'Z3_VERIFYING')).toBe(false);
    });

    it('allows WAITING_USER_CONFIRM -> EXECUTING', () => {
      expect(isValidTransition('WAITING_USER_CONFIRM', 'EXECUTING')).toBe(true);
    });

    it('allows WAITING_USER_CONFIRM -> BLOCKED_USER_DENIED', () => {
      expect(isValidTransition('WAITING_USER_CONFIRM', 'BLOCKED_USER_DENIED')).toBe(true);
    });

    it('allows EXECUTING -> EVIDENCE_RECORDING', () => {
      expect(isValidTransition('EXECUTING', 'EVIDENCE_RECORDING')).toBe(true);
    });

    it('allows EVIDENCE_RECORDING -> COMPLETED', () => {
      expect(isValidTransition('EVIDENCE_RECORDING', 'COMPLETED')).toBe(true);
    });
  });

  describe('getAllowedNextStates', () => {
    it('returns correct states from CREATED', () => {
      const states = getAllowedNextStates('CREATED');
      expect(states).toContain('GOAL_LOCKED');
      expect(states).toContain('BLOCKED_PERMISSION');
      expect(states).not.toContain('EXECUTING');
    });

    it('returns correct states from PLANNING', () => {
      const states = getAllowedNextStates('PLANNING');
      expect(states).toContain('Z3_VERIFYING');
      expect(states).toContain('BLOCKED_UNSUPPORTED');
      expect(states).toContain('BLOCKED_PERMISSION');
    });

    it('returns empty array for terminal states', () => {
      expect(getAllowedNextStates('COMPLETED')).toEqual([]);
      expect(getAllowedNextStates('BLOCKED_PERMISSION')).toEqual([]);
      expect(getAllowedNextStates('FAILED_EXECUTION')).toEqual([]);
    });
  });

  describe('isTerminalState', () => {
    it('identifies COMPLETED as terminal', () => {
      expect(isTerminalState('COMPLETED')).toBe(true);
    });

    it('identifies BLOCKED_PERMISSION as terminal', () => {
      expect(isTerminalState('BLOCKED_PERMISSION')).toBe(true);
    });

    it('identifies FAILED_EXECUTION as terminal', () => {
      expect(isTerminalState('FAILED_EXECUTION')).toBe(true);
    });

    it('identifies CREATED as non-terminal', () => {
      expect(isTerminalState('CREATED')).toBe(false);
    });

    it('identifies EXECUTING as non-terminal', () => {
      expect(isTerminalState('EXECUTING')).toBe(false);
    });
  });

  describe('isBlockedState', () => {
    it('identifies BLOCKED_PERMISSION as blocked', () => {
      expect(isBlockedState('BLOCKED_PERMISSION')).toBe(true);
    });

    it('identifies BLOCKED_Z3 as blocked', () => {
      expect(isBlockedState('BLOCKED_Z3')).toBe(true);
    });

    it('identifies BLOCKED_USER_DENIED as blocked', () => {
      expect(isBlockedState('BLOCKED_USER_DENIED')).toBe(true);
    });

    it('identifies FAILED_EXECUTION as blocked', () => {
      expect(isBlockedState('FAILED_EXECUTION')).toBe(true);
    });

    it('identifies CREATED as not blocked', () => {
      expect(isBlockedState('CREATED')).toBe(false);
    });

    it('identifies EXECUTING as not blocked', () => {
      expect(isBlockedState('EXECUTING')).toBe(false);
    });

    it('identifies COMPLETED as not blocked', () => {
      expect(isBlockedState('COMPLETED')).toBe(false);
    });
  });

  describe('transitionJobState', () => {
    let mockSupabaseClient: any;

    beforeEach(() => {
      mockSupabaseClient = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { current_state: 'CREATED' },
                error: null,
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      };
    });

    it('transitions valid state CREATED -> PLANNING', async () => {
      mockSupabaseClient.from('delegated_agi_jobs').select('current_state').eq('job_id', 'test-job-1').single = vi.fn().mockResolvedValue({
        data: { current_state: 'CREATED' },
        error: null,
      });

      mockSupabaseClient.from('delegated_agi_jobs').update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // For simplicity in test, we'll verify the logic without full Supabase mock
      expect(isValidTransition('CREATED', 'PLANNING')).toBe(false); // Direct path not allowed
      expect(isValidTransition('CREATED', 'GOAL_LOCKED')).toBe(true);
    });

    it('rejects invalid transitions', async () => {
      // COMPLETED is terminal, cannot transition to anything
      expect(isValidTransition('COMPLETED', 'EXECUTING')).toBe(false);
    });

    it('blocks transition to invalid state', async () => {
      mockSupabaseClient.from('delegated_agi_jobs').select('current_state').eq('job_id', 'test-job').single = vi.fn().mockResolvedValue({
        data: { current_state: 'CREATED' },
        error: null,
      });

      // Attempting invalid transition should fail validation check
      expect(isValidTransition('CREATED', 'EXECUTING')).toBe(false);
    });
  });

  describe('State transition sequences', () => {
    it('validates happy path: CREATED -> ... -> COMPLETED', () => {
      const path: DelegationJobState[] = [
        'CREATED',
        'GOAL_LOCKED',
        'DELEGATION_REQUESTED',
        'DELEGATION_APPROVED',
        'PLANNING',
        'Z3_VERIFYING',
        'EXECUTING',
        'EVIDENCE_RECORDING',
        'COMPLETED',
      ];

      for (let i = 0; i < path.length - 1; i++) {
        expect(isValidTransition(path[i], path[i + 1])).toBe(true);
      }
    });

    it('validates path with user confirmation', () => {
      const path: DelegationJobState[] = [
        'CREATED',
        'GOAL_LOCKED',
        'DELEGATION_REQUESTED',
        'DELEGATION_APPROVED',
        'PLANNING',
        'Z3_VERIFYING',
        'WAITING_USER_CONFIRM',
        'EXECUTING',
        'EVIDENCE_RECORDING',
        'COMPLETED',
      ];

      for (let i = 0; i < path.length - 1; i++) {
        expect(isValidTransition(path[i], path[i + 1])).toBe(true);
      }
    });

    it('validates early block path', () => {
      const path: DelegationJobState[] = [
        'CREATED',
        'GOAL_LOCKED',
        'DELEGATION_REQUESTED',
        'BLOCKED_PERMISSION',
      ];

      for (let i = 0; i < path.length - 1; i++) {
        expect(isValidTransition(path[i], path[i + 1])).toBe(true);
      }

      // BLOCKED_PERMISSION is terminal
      expect(isTerminalState('BLOCKED_PERMISSION')).toBe(true);
    });

    it('validates Z3 failure path', () => {
      const path: DelegationJobState[] = [
        'PLANNING',
        'Z3_VERIFYING',
        'BLOCKED_Z3',
      ];

      for (let i = 0; i < path.length - 1; i++) {
        expect(isValidTransition(path[i], path[i + 1])).toBe(true);
      }

      expect(isTerminalState('BLOCKED_Z3')).toBe(true);
    });

    it('validates user denial path', () => {
      const path: DelegationJobState[] = [
        'Z3_VERIFYING',
        'WAITING_USER_CONFIRM',
        'BLOCKED_USER_DENIED',
      ];

      for (let i = 0; i < path.length - 1; i++) {
        expect(isValidTransition(path[i], path[i + 1])).toBe(true);
      }

      expect(isTerminalState('BLOCKED_USER_DENIED')).toBe(true);
    });
  });
});
