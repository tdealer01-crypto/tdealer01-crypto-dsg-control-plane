export type DsgOutcomeIntake = {
  goal: string;
  targetUsers: string[];
  successOutcome: string;
  availableData: string[];
  requiredIntegrations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'regulated';
  productionIntent: boolean;
};

export type DsgOutcomePlan = {
  ok: true;
  intake: DsgOutcomeIntake;
  suggestedTemplateIds: string[];
  generatedPrdDraft: unknown;
  readinessImpact: {
    needsAuth: boolean;
    needsDatabase: boolean;
    needsBilling: boolean;
    needsRBAC: boolean;
    needsAuditLog: boolean;
  };
  nextAction: string;
};

export type DsgOutcomeIntakeError = {
  ok: false;
  error: { code: 'OUTCOME_GOAL_REQUIRED' | 'OUTCOME_INVALID_INPUT'; message: string };
  nextAction: string;
};

const MAX_GOAL_LENGTH = 800;
const MAX_SUCCESS_OUTCOME_LENGTH = 600;
const MAX_ARRAY_ITEMS = 12;
const MAX_ARRAY_ITEM_LENGTH = 140;

function invalidInput(message: string): DsgOutcomeIntakeError {
  return {
    ok: false,
    error: { code: 'OUTCOME_INVALID_INPUT', message },
    nextAction: 'Shorten the outcome intake fields and retry. This planning API stays fail-closed when input exceeds reviewable limits.',
  };
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(/[\n,]/).map((item) => item.trim()).filter(Boolean);
  return [];
}

function validateStringLength(field: string, value: string, maxLength: number): DsgOutcomeIntakeError | null {
  if (value.length > maxLength) return invalidInput(`${field} must be ${maxLength} characters or fewer.`);
  return null;
}

function validateStringArray(field: string, values: string[]): DsgOutcomeIntakeError | null {
  if (values.length > MAX_ARRAY_ITEMS) return invalidInput(`${field} may include at most ${MAX_ARRAY_ITEMS} items.`);
  const tooLong = values.find((item) => item.length > MAX_ARRAY_ITEM_LENGTH);
  if (tooLong) return invalidInput(`${field} items must be ${MAX_ARRAY_ITEM_LENGTH} characters or fewer.`);
  return null;
}

function normalizeRiskLevel(value: unknown): DsgOutcomeIntake['riskLevel'] {
  return value === 'low' || value === 'medium' || value === 'high' || value === 'regulated' ? value : 'medium';
}

export function parseDsgOutcomeIntake(input: unknown): DsgOutcomeIntake | DsgOutcomeIntakeError {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: { code: 'OUTCOME_INVALID_INPUT', message: 'Request body must be a JSON object.' }, nextAction: 'Submit an outcome intake JSON object with a non-empty goal.' };
  }

  const body = input as Record<string, unknown>;
  const goal = typeof body.goal === 'string' ? body.goal.trim() : '';
  if (!goal) {
    return { ok: false, error: { code: 'OUTCOME_GOAL_REQUIRED', message: 'goal is required and cannot be empty.' }, nextAction: 'Describe the app outcome you want to create before generating a plan.' };
  }

  const successOutcome = typeof body.successOutcome === 'string' ? body.successOutcome.trim() : '';
  const targetUsers = toStringArray(body.targetUsers);
  const availableData = toStringArray(body.availableData);
  const requiredIntegrations = toStringArray(body.requiredIntegrations);

  const validationError =
    validateStringLength('goal', goal, MAX_GOAL_LENGTH) ||
    validateStringLength('successOutcome', successOutcome, MAX_SUCCESS_OUTCOME_LENGTH) ||
    validateStringArray('targetUsers', targetUsers) ||
    validateStringArray('availableData', availableData) ||
    validateStringArray('requiredIntegrations', requiredIntegrations);

  if (validationError) return validationError;

  return {
    goal,
    targetUsers,
    successOutcome,
    availableData,
    requiredIntegrations,
    riskLevel: normalizeRiskLevel(body.riskLevel),
    productionIntent: body.productionIntent === true,
  };
}

export function createDsgOutcomePlan(intake: DsgOutcomeIntake): DsgOutcomePlan {
  const goalText = `${intake.goal} ${intake.successOutcome} ${intake.requiredIntegrations.join(' ')}`.toLowerCase();
  const needsBilling = /billing|subscription|membership|payment|stripe|plan|quota|entitlement/.test(goalText);
  const needsAuth = intake.productionIntent || intake.riskLevel !== 'low' || /login|member|customer|portal|approval|crm|support/.test(goalText);
  const needsDatabase = intake.productionIntent || intake.availableData.length > 0 || /inventory|booking|crm|record|dashboard|portal|approval|customer/.test(goalText);
  const needsRBAC = intake.riskLevel === 'high' || intake.riskLevel === 'regulated' || /approval|admin|role|team|org|customer data/.test(goalText);
  const needsAuditLog = intake.productionIntent || intake.riskLevel === 'regulated' || /audit|compliance|approval|marketplace/.test(goalText);

  const suggestedTemplateIds = [
    /booking|appointment|schedule/.test(goalText) ? 'booking-appointment' : null,
    /crm|customer|deal|lead/.test(goalText) ? 'crm-mini-app' : null,
    /inventory|stock|warehouse/.test(goalText) ? 'inventory-tracker' : null,
    /support|ticket|portal/.test(goalText) ? 'customer-support-portal' : null,
    /approval|review|workflow/.test(goalText) ? 'approval-workflow' : null,
    /compliance|audit|risk/.test(goalText) ? 'compliance-dashboard' : null,
    /marketplace|listing/.test(goalText) ? 'marketplace-listing-kit' : null,
    /assistant|ai/.test(goalText) ? 'ai-assistant-approval-gate' : null,
    needsBilling ? 'membership-subscription-app' : null,
  ].filter(Boolean) as string[];

  if (suggestedTemplateIds.length === 0) suggestedTemplateIds.push('evidence-audit-portal');

  return {
    ok: true,
    intake,
    suggestedTemplateIds,
    generatedPrdDraft: {
      title: intake.goal,
      summary: intake.successOutcome || 'Outcome intake captured. PRD draft requires human review before production work.',
      targetUsers: intake.targetUsers,
      availableData: intake.availableData,
      requiredIntegrations: intake.requiredIntegrations,
      riskLevel: intake.riskLevel,
      productionReadyClaim: false,
      evidenceBoundary: 'This draft is planning output only. It is not production-ready evidence.',
    },
    readinessImpact: { needsAuth, needsDatabase, needsBilling, needsRBAC, needsAuditLog },
    nextAction: 'Review the suggested template and proof panel, then generate PRD/plan while keeping productionReadyClaim=false until real build, deploy, enforcement, and owner evidence exists.',
  };
}
