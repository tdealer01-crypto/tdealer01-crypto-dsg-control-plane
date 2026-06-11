/**
 * Task and Execution Type Definitions
 * Foundation types for queue management, task status tracking,
 * and execution response handling across the DSG platform.
 */

/**
 * TaskStatus enum - All 11 statuses required for queue lifecycle management
 * Do not add or remove values without updating Phase 4 error handling.
 */
export enum TaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  FAILED_RETRYABLE = 'FAILED_RETRYABLE',
  RETRYING = 'RETRYING',
  FAILED_FINAL = 'FAILED_FINAL',
  DLQ = 'DLQ',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  LOCKED = 'LOCKED',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  WAITING_USER_INPUT = 'WAITING_USER_INPUT',
}

/**
 * StopReason enum - Reasons for stopping task execution
 */
export enum StopReason {
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
  QUEUE_EMPTY = 'QUEUE_EMPTY',
  EXECUTION_TIMEOUT = 'EXECUTION_TIMEOUT',
  TOO_MANY_FAILURES = 'TOO_MANY_FAILURES',
  USER_CANCELLED = 'USER_CANCELLED',
  NONE = 'NONE',
}

/**
 * ExecutionResponse interface - Standardized response from execution operations
 * Used by Phase 4 error handling and decision routing logic
 */
export interface ExecutionResponse {
  decision: 'ALLOW' | 'BLOCK' | 'PENDING' | 'FAILED';
  stop: boolean;
  stop_reason: StopReason;
  retry_count: number;
  max_retries: number;
  next_action: 'MOVE_TO_DLQ' | 'WAIT' | 'REQUEST_APPROVAL' | 'RETRY' | 'CONTINUE';
}

/**
 * QueueItem interface - Represents a task in the execution queue
 * Updated to use TaskStatus enum instead of string union
 */
export interface QueueItem {
  id: string;
  status: TaskStatus;
  payload?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  retry_count?: number;
  max_retries?: number;
  error?: string;
  result?: unknown;
}
