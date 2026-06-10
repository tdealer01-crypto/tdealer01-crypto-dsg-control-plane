/**
 * Job State Machine
 *
 * Manages the lifecycle of delegation jobs through defined state transitions.
 * Ensures valid state progressions and prevents invalid transitions.
 *
 * State diagram:
 * CREATED -> GOAL_LOCKED -> DELEGATION_REQUESTED -> DELEGATION_APPROVED -> PLANNING
 *   -> Z3_VERIFYING -> WAITING_USER_CONFIRM -> EXECUTING -> EVIDENCE_RECORDING -> COMPLETED
 *
 * Error states (terminal):
 *   BLOCKED_UNSUPPORTED, BLOCKED_PERMISSION, BLOCKED_Z3, BLOCKED_SAFE_DOM,
 *   BLOCKED_USER_DENIED, FAILED_EXECUTION
 */

export type DelegationJobState =
  | 'CREATED'
  | 'GOAL_LOCKED'
  | 'DELEGATION_REQUESTED'
  | 'DELEGATION_APPROVED'
  | 'PLANNING'
  | 'Z3_VERIFYING'
  | 'WAITING_USER_CONFIRM'
  | 'EXECUTING'
  | 'EVIDENCE_RECORDING'
  | 'COMPLETED'
  | 'BLOCKED_UNSUPPORTED'
  | 'BLOCKED_PERMISSION'
  | 'BLOCKED_Z3'
  | 'BLOCKED_SAFE_DOM'
  | 'BLOCKED_USER_DENIED'
  | 'FAILED_EXECUTION';

/**
 * Valid state transitions.
 * Maps from state to array of allowed next states.
 */
const VALID_TRANSITIONS: Record<DelegationJobState, DelegationJobState[]> = {
  CREATED: ['GOAL_LOCKED', 'BLOCKED_PERMISSION'],
  GOAL_LOCKED: ['DELEGATION_REQUESTED', 'BLOCKED_PERMISSION'],
  DELEGATION_REQUESTED: ['DELEGATION_APPROVED', 'BLOCKED_PERMISSION', 'BLOCKED_USER_DENIED'],
  DELEGATION_APPROVED: ['PLANNING', 'BLOCKED_PERMISSION'],
  PLANNING: ['Z3_VERIFYING', 'BLOCKED_UNSUPPORTED', 'BLOCKED_PERMISSION'],
  Z3_VERIFYING: ['WAITING_USER_CONFIRM', 'EXECUTING', 'BLOCKED_Z3', 'BLOCKED_UNSUPPORTED'],
  WAITING_USER_CONFIRM: ['EXECUTING', 'BLOCKED_USER_DENIED'],
  EXECUTING: ['EVIDENCE_RECORDING', 'FAILED_EXECUTION'],
  EVIDENCE_RECORDING: ['COMPLETED', 'FAILED_EXECUTION'],
  COMPLETED: [],
  BLOCKED_UNSUPPORTED: [],
  BLOCKED_PERMISSION: [],
  BLOCKED_Z3: [],
  BLOCKED_SAFE_DOM: [],
  BLOCKED_USER_DENIED: [],
  FAILED_EXECUTION: [],
};

/**
 * Check if a state transition is valid.
 *
 * @param fromState - Current state
 * @param toState - Desired next state
 * @returns true if transition is valid
 */
export function isValidTransition(fromState: DelegationJobState, toState: DelegationJobState): boolean {
  const allowed = VALID_TRANSITIONS[fromState];
  return allowed && allowed.includes(toState);
}

/**
 * Get allowed next states for a given state.
 *
 * @param state - Current state
 * @returns Array of allowed next states
 */
export function getAllowedNextStates(state: DelegationJobState): DelegationJobState[] {
  return VALID_TRANSITIONS[state] || [];
}

/**
 * Check if a state is terminal (no further transitions allowed).
 *
 * @param state - State to check
 * @returns true if state is terminal
 */
export function isTerminalState(state: DelegationJobState): boolean {
  return VALID_TRANSITIONS[state].length === 0;
}

/**
 * Check if a state represents a blocked/error condition.
 *
 * @param state - State to check
 * @returns true if state is a blocking/error state
 */
export function isBlockedState(state: DelegationJobState): boolean {
  return state.startsWith('BLOCKED_') || state === 'FAILED_EXECUTION';
}

/**
 * Transition a job to a new state with database persistence.
 *
 * This function:
 * 1. Validates the transition is allowed
 * 2. Updates the job state in the database
 * 3. Records the state change timestamp
 * 4. Returns the updated state
 *
 * @param jobId - UUID of the job to transition
 * @param newState - Target state
 * @param supabaseClient - Supabase client for database operations
 * @returns Promise resolving to true if successful, false if transition invalid
 */
export async function transitionJobState(
  jobId: string,
  newState: DelegationJobState,
  supabaseClient: any,
): Promise<boolean> {
  try {
    // Fetch current state
    const { data: job, error: fetchError } = await supabaseClient
      .from('delegated_agi_jobs')
      .select('current_state')
      .eq('job_id', jobId)
      .single();

    if (fetchError || !job) {
      console.error(`Failed to fetch job ${jobId}:`, fetchError);
      return false;
    }

    const currentState = job.current_state as DelegationJobState;

    // Validate transition
    if (!isValidTransition(currentState, newState)) {
      console.warn(
        `Invalid state transition: ${currentState} -> ${newState} for job ${jobId}`,
      );
      return false;
    }

    // Update in database
    const { error: updateError } = await supabaseClient
      .from('delegated_agi_jobs')
      .update({
        current_state: newState,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    if (updateError) {
      console.error(`Failed to update job state for ${jobId}:`, updateError);
      return false;
    }

    // Also update dsg_runtime_jobs if it exists
    const { error: runtimeError } = await supabaseClient
      .from('dsg_runtime_jobs')
      .update({
        state: newState,
        state_updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);

    if (runtimeError) {
      console.warn(`Failed to update dsg_runtime_jobs state for ${jobId}:`, runtimeError);
      // Non-fatal warning; delegated_agi_jobs update succeeded
    }

    return true;
  } catch (error) {
    console.error(`Unexpected error transitioning job ${jobId}:`, error);
    return false;
  }
}

/**
 * Get the current state of a job.
 *
 * @param jobId - UUID of the job
 * @param supabaseClient - Supabase client
 * @returns Current state, or null if job not found
 */
export async function getJobState(
  jobId: string,
  supabaseClient: any,
): Promise<DelegationJobState | null> {
  try {
    const { data: job, error } = await supabaseClient
      .from('delegated_agi_jobs')
      .select('current_state')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      return null;
    }

    return job.current_state as DelegationJobState;
  } catch (error) {
    console.error(`Error fetching job state for ${jobId}:`, error);
    return null;
  }
}

/**
 * Get full job details including state.
 *
 * @param jobId - UUID of the job
 * @param supabaseClient - Supabase client
 * @returns Full job object, or null if not found
 */
export async function getJobWithState(
  jobId: string,
  supabaseClient: any,
): Promise<{
  job_id: string;
  delegation_id: string;
  org_id: string;
  user_id: string;
  goal: string;
  scope: string;
  status: string;
  current_state: DelegationJobState;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
} | null> {
  try {
    const { data: job, error } = await supabaseClient
      .from('delegated_agi_jobs')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error || !job) {
      return null;
    }

    return job;
  } catch (error) {
    console.error(`Error fetching job details for ${jobId}:`, error);
    return null;
  }
}

/**
 * Create a new delegation job with initial state.
 *
 * @param jobData - Job creation data
 * @param supabaseClient - Supabase client
 * @returns New job ID, or null if creation failed
 */
export async function createDelegationJob(
  jobData: {
    delegation_id: string;
    org_id: string;
    user_id: string;
    goal: string;
    scope: string;
    metadata?: Record<string, unknown>;
  },
  supabaseClient: any,
): Promise<string | null> {
  try {
    const { data: job, error } = await supabaseClient
      .from('delegated_agi_jobs')
      .insert({
        ...jobData,
        status: 'CREATED',
        current_state: 'CREATED',
      })
      .select('job_id')
      .single();

    if (error || !job) {
      console.error('Failed to create delegation job:', error);
      return null;
    }

    return job.job_id;
  } catch (error) {
    console.error('Unexpected error creating delegation job:', error);
    return null;
  }
}
