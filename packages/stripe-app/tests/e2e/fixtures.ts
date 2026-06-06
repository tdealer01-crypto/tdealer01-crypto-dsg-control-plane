/**
 * Test Fixtures and Utilities for Stripe App E2E Tests
 */

export interface TestPolicy {
  id?: string;
  operationType: string;
  maxAmount: string;
  action: 'allow' | 'block' | 'review';
  description?: string;
  enabled?: boolean;
}

export interface TestCharge {
  id: string;
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface TestAccount {
  id: string;
  email: string;
  stripeAccountId?: string;
  connected?: boolean;
}

export interface TestAuditEvent {
  id: string;
  type: string;
  operationType: string;
  decision: 'allow' | 'block' | 'review';
  timestamp: string;
  chargeId?: string;
  policyId?: string;
}

/**
 * Common test policies for different scenarios
 */
export const TEST_POLICIES = {
  lowAmountAllow: {
    operationType: 'charge',
    maxAmount: '1000',
    action: 'allow' as const,
    description: 'Allow small charges',
  },
  mediumAmountReview: {
    operationType: 'charge',
    maxAmount: '10000',
    action: 'review' as const,
    description: 'Review medium charges',
  },
  highAmountBlock: {
    operationType: 'charge',
    maxAmount: '50000',
    action: 'block' as const,
    description: 'Block high charges',
  },
  payoutPolicy: {
    operationType: 'payout',
    maxAmount: '100000',
    action: 'allow' as const,
    description: 'Allow payouts',
  },
  refundPolicy: {
    operationType: 'refund',
    maxAmount: '25000',
    action: 'allow' as const,
    description: 'Allow refunds',
  },
};

/**
 * Common test charges for different scenarios
 */
export const TEST_CHARGES = {
  small: {
    id: 'ch_small_' + Date.now(),
    amount: 500,
    currency: 'usd',
    description: 'Small test charge',
  },
  medium: {
    id: 'ch_medium_' + Date.now(),
    amount: 5000,
    currency: 'usd',
    description: 'Medium test charge',
  },
  large: {
    id: 'ch_large_' + Date.now(),
    amount: 50000,
    currency: 'usd',
    description: 'Large test charge',
  },
  international: {
    id: 'ch_intl_' + Date.now(),
    amount: 10000,
    currency: 'eur',
    description: 'International test charge',
  },
};

/**
 * Common test accounts
 */
export const TEST_ACCOUNTS = {
  defaultUser: {
    id: 'user_default_' + Date.now(),
    email: 'test@example.com',
    connected: false,
  },
  connectedAccount: {
    id: 'user_connected_' + Date.now(),
    email: 'connected@example.com',
    stripeAccountId: 'acct_test_' + Date.now(),
    connected: true,
  },
};

/**
 * Common audit event scenarios
 */
export const TEST_AUDIT_EVENTS = {
  chargeApproved: {
    id: 'evt_charge_approved_' + Date.now(),
    type: 'charge.processed',
    operationType: 'charge',
    decision: 'allow' as const,
    timestamp: new Date().toISOString(),
    chargeId: TEST_CHARGES.small.id,
  },
  chargeBlocked: {
    id: 'evt_charge_blocked_' + Date.now(),
    type: 'charge.blocked',
    operationType: 'charge',
    decision: 'block' as const,
    timestamp: new Date().toISOString(),
    chargeId: TEST_CHARGES.large.id,
  },
  chargeReview: {
    id: 'evt_charge_review_' + Date.now(),
    type: 'charge.review_needed',
    operationType: 'charge',
    decision: 'review' as const,
    timestamp: new Date().toISOString(),
    chargeId: TEST_CHARGES.medium.id,
  },
};

/**
 * Test data generators
 */
export class TestDataGenerator {
  /**
   * Generate a random policy
   */
  static generatePolicy(overrides?: Partial<TestPolicy>): TestPolicy {
    const amounts = ['1000', '5000', '10000', '25000', '50000'];
    const types = ['charge', 'payout', 'refund', 'transfer'];
    const actions: ('allow' | 'block' | 'review')[] = ['allow', 'block', 'review'];

    return {
      operationType: types[Math.floor(Math.random() * types.length)],
      maxAmount: amounts[Math.floor(Math.random() * amounts.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      ...overrides,
    };
  }

  /**
   * Generate a random charge
   */
  static generateCharge(overrides?: Partial<TestCharge>): TestCharge {
    const id = 'ch_test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const amount = Math.floor(Math.random() * 100000) + 100;

    return {
      id,
      amount,
      currency: 'usd',
      ...overrides,
    };
  }

  /**
   * Generate a batch of charges
   */
  static generateCharges(count: number): TestCharge[] {
    return Array.from({ length: count }, () => this.generateCharge());
  }

  /**
   * Generate a random audit event
   */
  static generateAuditEvent(overrides?: Partial<TestAuditEvent>): TestAuditEvent {
    const decisions: ('allow' | 'block' | 'review')[] = ['allow', 'block', 'review'];
    const operationTypes = ['charge', 'payout', 'refund', 'transfer'];

    return {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      type: 'event',
      operationType: operationTypes[Math.floor(Math.random() * operationTypes.length)],
      decision: decisions[Math.floor(Math.random() * decisions.length)],
      timestamp: new Date().toISOString(),
      ...overrides,
    };
  }

  /**
   * Generate a batch of audit events
   */
  static generateAuditEvents(count: number): TestAuditEvent[] {
    return Array.from({ length: count }, () => this.generateAuditEvent());
  }

  /**
   * Generate test account
   */
  static generateAccount(overrides?: Partial<TestAccount>): TestAccount {
    const email = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;

    return {
      id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      email,
      connected: false,
      ...overrides,
    };
  }
}

/**
 * Test data validation helpers
 */
export class TestDataValidator {
  /**
   * Validate policy has required fields
   */
  static isValidPolicy(policy: TestPolicy): boolean {
    return !!(policy.operationType && policy.maxAmount && policy.action);
  }

  /**
   * Validate charge has required fields
   */
  static isValidCharge(charge: TestCharge): boolean {
    return !!(charge.id && charge.amount >= 0 && charge.currency);
  }

  /**
   * Validate account has required fields
   */
  static isValidAccount(account: TestAccount): boolean {
    return !!(account.id && account.email);
  }

  /**
   * Validate audit event has required fields
   */
  static isValidAuditEvent(event: TestAuditEvent): boolean {
    return !!(event.id && event.type && event.decision && event.timestamp);
  }

  /**
   * Validate a batch of policies
   */
  static validatePolicies(policies: TestPolicy[]): { valid: TestPolicy[]; invalid: TestPolicy[] } {
    return {
      valid: policies.filter((p) => this.isValidPolicy(p)),
      invalid: policies.filter((p) => !this.isValidPolicy(p)),
    };
  }

  /**
   * Validate a batch of charges
   */
  static validateCharges(charges: TestCharge[]): { valid: TestCharge[]; invalid: TestCharge[] } {
    return {
      valid: charges.filter((c) => this.isValidCharge(c)),
      invalid: charges.filter((c) => !this.isValidCharge(c)),
    };
  }
}

/**
 * Test data builders for complex scenarios
 */
export class TestScenarioBuilder {
  private policies: TestPolicy[] = [];
  private charges: TestCharge[] = [];
  private auditEvents: TestAuditEvent[] = [];

  addPolicy(policy: TestPolicy): this {
    this.policies.push(policy);
    return this;
  }

  addPolicies(count: number): this {
    for (let i = 0; i < count; i++) {
      this.policies.push(TestDataGenerator.generatePolicy());
    }
    return this;
  }

  addCharge(charge: TestCharge): this {
    this.charges.push(charge);
    return this;
  }

  addCharges(count: number): this {
    this.charges.push(...TestDataGenerator.generateCharges(count));
    return this;
  }

  addAuditEvent(event: TestAuditEvent): this {
    this.auditEvents.push(event);
    return this;
  }

  addAuditEvents(count: number): this {
    this.auditEvents.push(...TestDataGenerator.generateAuditEvents(count));
    return this;
  }

  build() {
    return {
      policies: this.policies,
      charges: this.charges,
      auditEvents: this.auditEvents,
    };
  }

  reset(): this {
    this.policies = [];
    this.charges = [];
    this.auditEvents = [];
    return this;
  }
}

/**
 * Common test selectors for the Stripe App UI
 */
export const TEST_SELECTORS = {
  // Navigation
  dashboard: '[href*="stripe-app"]',
  policiesLink: '[href*="policies"]',
  auditLink: '[href*="audit"]',
  settingsLink: '[href*="settings"]',
  connectLink: '[href*="connect"]',

  // Buttons
  createButton: 'button[name="create"]',
  submitButton: 'button[type="submit"]',
  deleteButton: 'button[name="delete"]',
  editButton: 'button[name="edit"]',
  saveButton: 'button[name="save"]',
  cancelButton: 'button[name="cancel"]',

  // Forms
  operationTypeSelect: 'select[name="operationType"]',
  maxAmountInput: 'input[name="maxAmount"]',
  actionSelect: 'select[name="action"]',
  policyForm: 'form[name="policyForm"]',

  // Tables
  policyTable: 'table[name="policyTable"]',
  auditTable: 'table[name="auditTable"]',
  tableRow: 'tbody tr',
  tableCell: 'td',

  // Search and Filter
  searchInput: 'input[type="search"]',
  filterButton: 'button[name="filter"]',
  dateRangeInput: 'input[type="date"]',

  // Messages
  successMessage: '[role="status"][aria-level="info"]',
  errorMessage: '[role="alert"]',
  warningMessage: '[role="warning"]',
};

/**
 * Common test waits and timeouts
 */
export const TEST_TIMEOUTS = {
  short: 500,
  medium: 2000,
  long: 5000,
  veryLong: 10000,
};

/**
 * Mock response builders
 */
export class MockResponseBuilder {
  static policyListResponse(policies: TestPolicy[]) {
    return {
      policies,
      total: policies.length,
      hasMore: false,
    };
  }

  static auditLogResponse(events: TestAuditEvent[]) {
    return {
      events,
      total: events.length,
      page: 1,
      pageSize: events.length,
    };
  }

  static successResponse(message = 'Operation successful') {
    return {
      ok: true,
      message,
      timestamp: new Date().toISOString(),
    };
  }

  static errorResponse(error: string, details?: Record<string, unknown>) {
    return {
      ok: false,
      error,
      details,
      timestamp: new Date().toISOString(),
    };
  }
}
