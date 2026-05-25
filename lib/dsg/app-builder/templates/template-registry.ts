export type DsgAppTemplateCategory = 'landing' | 'crud' | 'dashboard' | 'form' | 'workspace';
export type DsgAppTemplateRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DsgTemplateSharingMode = 'public' | 'private' | 'team';

export type DsgAppTemplate = {
  id: string;
  name: string;
  category: DsgAppTemplateCategory;
  description: string;
  useCases: string[];
  defaultFeatures: string[];
  requiredCapabilities: string[];
  risk: DsgAppTemplateRisk;
  productionNotes: string[];
  /** Ordered steps the builder should complete after creating from this template. */
  customizationSteps: string[];
  /** Semantic version — copied instances are pinned at this version and unaffected by updates. */
  version: string;
};

export const DSG_APP_TEMPLATES: DsgAppTemplate[] = [
  {
    id: 'database-crud-app',
    name: 'Database CRUD App',
    category: 'crud',
    description: 'Database-backed app with list and create flows.',
    useCases: ['todo', 'inventory', 'tasks', 'internal tools'],
    defaultFeatures: ['list records', 'create record', 'status tracking', 'server route', 'database table'],
    requiredCapabilities: ['database', 'api_route', 'frontend_page'],
    risk: 'MEDIUM',
    productionNotes: ['Writes require server-side access checks.', 'Rows must be scoped by workspace or user.'],
    customizationSteps: [
      'Set the data model: rename table and fields to match your domain.',
      'Update access control: scope rows to the correct user or workspace.',
      'Adjust the list view: choose which fields are visible and sortable.',
      'Set the app name and primary color under Appearance.',
    ],
    version: '1.0.0',
  },
  {
    id: 'saas-landing-page',
    name: 'SaaS Landing Page',
    category: 'landing',
    description: 'Marketing page with feature blocks, pricing, FAQ, and form submission.',
    useCases: ['landing page', 'waitlist', 'product launch'],
    defaultFeatures: ['hero', 'features', 'pricing', 'faq', 'form submission'],
    requiredCapabilities: ['frontend_page', 'api_route'],
    risk: 'MEDIUM',
    productionNotes: ['Public form submissions require throttling.', 'Public claims require review.'],
    customizationSteps: [
      'Replace hero copy and CTA text with your product description.',
      'Update pricing tiers and feature list to match your offering.',
      'Add your logo and brand color under Appearance.',
      'Wire the submission form to your notification or CRM integration.',
    ],
    version: '1.0.0',
  },
  {
    id: 'operator-dashboard',
    name: 'Operator Dashboard',
    category: 'dashboard',
    description: 'Dashboard for metrics, activity, evidence, and operational status.',
    useCases: ['analytics', 'admin dashboard', 'ops console'],
    defaultFeatures: ['metrics cards', 'activity table', 'status filters', 'evidence panel'],
    requiredCapabilities: ['frontend_page', 'database', 'access_control'],
    risk: 'HIGH',
    productionNotes: ['Read-only roles must not mutate data.', 'Actions require permission checks.'],
    customizationSteps: [
      'Define which metrics to surface and map them to your data source.',
      'Configure role guards so only operators can access this page.',
      'Set the activity table columns to reflect your domain events.',
      'Restrict write actions with server-side permission checks.',
    ],
    version: '1.0.0',
  },
  {
    id: 'form-workflow-app',
    name: 'Form Workflow App',
    category: 'form',
    description: 'Multi-step form with validation, submission storage, and review status.',
    useCases: ['intake form', 'approval request', 'survey'],
    defaultFeatures: ['multi-step form', 'validation', 'submission status', 'review queue'],
    requiredCapabilities: ['frontend_page', 'api_route', 'database'],
    risk: 'MEDIUM',
    productionNotes: ['Sensitive fields must be classified.', 'Submission endpoint requires throttling.'],
    customizationSteps: [
      'Define form steps and required fields for your use case.',
      'Set validation rules and error messages per field.',
      'Configure review queue visibility (who can see submissions).',
      'Enable throttling on the submission endpoint before going live.',
    ],
    version: '1.0.0',
  },
  {
    id: 'workspace-starter',
    name: 'Workspace Starter',
    category: 'workspace',
    description: 'Starter app with protected pages, workspace membership, and roles.',
    useCases: ['saas starter', 'internal app', 'team workspace'],
    defaultFeatures: ['login screen', 'workspace switcher', 'role guard', 'protected area'],
    requiredCapabilities: ['access_control', 'database', 'frontend_page'],
    risk: 'HIGH',
    productionNotes: ['Roles must be verified server-side.', 'Client-supplied role is not trusted.'],
    customizationSteps: [
      'Set the login screen branding: logo, color, and welcome copy.',
      'Define roles and map them to your team structure.',
      'Configure which pages are accessible per role.',
      'Verify server-side role enforcement before inviting team members.',
    ],
    version: '1.0.0',
  },
];

export function getDsgAppTemplateById(id: string): DsgAppTemplate | undefined {
  return DSG_APP_TEMPLATES.find((template) => template.id === id);
}

export function getDsgAppTemplatesByCategory(category: DsgAppTemplateCategory): DsgAppTemplate[] {
  return DSG_APP_TEMPLATES.filter((template) => template.category === category);
}

export function getDsgAppTemplatesForUseCase(useCase: string): DsgAppTemplate[] {
  const normalized = useCase.trim().toLowerCase();
  return DSG_APP_TEMPLATES.filter((template) =>
    template.useCases.some((candidate) => candidate.toLowerCase().includes(normalized) || normalized.includes(candidate.toLowerCase())),
  );
}

export type DsgMarketTemplate = {
  id: string;
  name: string;
  category: string;
  idealCustomer: string;
  businessOutcome: string;
  requiredPages: string[];
  requiredApis: string[];
  requiredData: string[];
  requiredIntegrations: string[];
  readinessGates: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'regulated';
  smokeTests: string[];
  blockedUntil: string[];
  /** Ordered steps the builder should complete after creating from this template. */
  customizationSteps: string[];
  /** Semantic version — copied instances are pinned at this version and unaffected by updates. */
  version: string;
  /** Distribution mode: public = template store, private = direct link, team = org-internal only. */
  sharingMode: DsgTemplateSharingMode;
};

export const DSG_MARKET_TEMPLATES: DsgMarketTemplate[] = [
  {
    id: 'booking-appointment',
    name: 'Booking / Appointment',
    category: 'operations',
    idealCustomer: 'Service businesses that need customer self-scheduling.',
    businessOutcome: 'Customers request appointments and operators review booking state.',
    requiredPages: ['/book', '/operator/bookings'],
    requiredApis: ['/api/bookings', '/api/bookings/[id]/status'],
    requiredData: ['customers', 'appointments', 'availability windows'],
    requiredIntegrations: ['calendar optional', 'email optional'],
    readinessGates: ['marketplace-readiness', 'security-rbac', 'accessibility-qa'],
    riskLevel: 'medium',
    smokeTests: ['smoke:app-builder-flow-proof', 'smoke:first-value-flow'],
    blockedUntil: ['Database persistence proof', 'Server-side booking ownership checks', 'Deployment smoke output'],
    customizationSteps: [
      'Set your available time slots and buffer rules.',
      'Configure booking confirmation email with your brand.',
      'Connect optional calendar integration (Google/Outlook).',
      'Set operator access role for the /operator/bookings page.',
    ],
    version: '1.0.0',
    sharingMode: 'public',
  },
  {
    id: 'crm-mini-app',
    name: 'CRM mini app',
    category: 'sales',
    idealCustomer: 'Small teams tracking leads, contacts, notes, and tasks.',
    businessOutcome: 'Team can manage customer follow-up from a protected workspace.',
    requiredPages: ['/crm', '/crm/contacts', '/crm/tasks'],
    requiredApis: ['/api/crm/contacts', '/api/crm/tasks'],
    requiredData: ['contacts', 'notes', 'tasks', 'deal status'],
    requiredIntegrations: ['email optional'],
    readinessGates: ['security-rbac', 'accessibility-qa', 'deployment-proof'],
    riskLevel: 'high',
    smokeTests: ['smoke:security-rbac', 'smoke:app-builder-flow-proof'],
    blockedUntil: ['Auth proof', 'RBAC/org isolation enforcement test', 'Audit log proof for customer data changes'],
    customizationSteps: [
      'Define deal stages and statuses for your sales process.',
      'Set workspace isolation so reps see only their own contacts.',
      'Configure audit logging for any customer data mutations.',
      'Invite team members and assign roles before publishing.',
    ],
    version: '1.0.0',
    sharingMode: 'team',
  },
  {
    id: 'inventory-tracker',
    name: 'Inventory tracker',
    category: 'operations',
    idealCustomer: 'Retail or warehouse teams that need simple stock visibility.',
    businessOutcome: 'Operators update inventory and see low-stock signals.',
    requiredPages: ['/inventory', '/inventory/items'],
    requiredApis: ['/api/inventory/items', '/api/inventory/adjustments'],
    requiredData: ['items', 'stock movements', 'locations'],
    requiredIntegrations: ['barcode scanner optional'],
    readinessGates: ['security-rbac', 'runtime-gate', 'accessibility-qa'],
    riskLevel: 'medium',
    smokeTests: ['smoke:app-builder-flow-proof'],
    blockedUntil: ['Database write proof', 'Adjustment audit trail', 'Role-based write denial proof'],
    customizationSteps: [
      'Import your initial item catalogue (CSV or manual entry).',
      'Configure low-stock threshold alerts per item category.',
      'Set which roles can make stock adjustments vs view-only.',
      'Enable barcode scanner integration if applicable.',
    ],
    version: '1.0.0',
    sharingMode: 'team',
  },
  {
    id: 'customer-support-portal',
    name: 'Customer support portal',
    category: 'support',
    idealCustomer: 'SaaS teams receiving and triaging customer requests.',
    businessOutcome: 'Customers submit tickets and support agents manage status safely.',
    requiredPages: ['/support/portal', '/support/agent'],
    requiredApis: ['/api/support/tickets', '/api/support/tickets/[id]'],
    requiredData: ['tickets', 'customers', 'messages', 'status history'],
    requiredIntegrations: ['email', 'helpdesk optional'],
    readinessGates: ['security-rbac', 'legal-support', 'accessibility-qa'],
    riskLevel: 'high',
    smokeTests: ['smoke:security-rbac', 'smoke:first-value-flow'],
    blockedUntil: ['Customer identity proof', 'Cross-customer isolation test', 'Support contact and SLA review'],
    customizationSteps: [
      'Set ticket categories and priority levels for your support flow.',
      'Configure customer identity verification (magic link or SSO).',
      'Ensure cross-customer isolation: customers must only see their own tickets.',
      'Set up email notification for ticket status changes.',
    ],
    version: '1.0.0',
    sharingMode: 'public',
  },
  {
    id: 'approval-workflow',
    name: 'Approval workflow',
    category: 'workflow',
    idealCustomer: 'Teams routing requests through submit, approve, reject, or escalate states.',
    businessOutcome: 'Requests move through traceable decisions with clear next actions.',
    requiredPages: ['/requests', '/requests/[id]', '/approvals'],
    requiredApis: ['/api/requests', '/api/requests/[id]/decision'],
    requiredData: ['requests', 'decisions', 'actors', 'audit events'],
    requiredIntegrations: ['identity provider optional'],
    readinessGates: ['security-rbac', 'audit-log', 'runtime-gate'],
    riskLevel: 'high',
    smokeTests: ['smoke:security-rbac', 'smoke:app-builder-flow-proof'],
    blockedUntil: ['Server-side role enforcement', 'Decision audit event proof', 'Denied decision negative test'],
    customizationSteps: [
      'Define approval states (submit, approve, reject, escalate) for your domain.',
      'Map approver roles to your team hierarchy.',
      'Enable audit logging for every decision event.',
      'Test the denied-decision path before going live.',
    ],
    version: '1.0.0',
    sharingMode: 'team',
  },
  {
    id: 'compliance-dashboard',
    name: 'Compliance dashboard',
    category: 'governance',
    idealCustomer: 'Regulated teams reviewing controls, risks, evidence, and owners.',
    businessOutcome: 'Reviewers see control status and missing evidence without false PASS claims.',
    requiredPages: ['/compliance', '/compliance/controls'],
    requiredApis: ['/api/compliance/controls', '/api/compliance/evidence'],
    requiredData: ['controls', 'evidence', 'owners', 'reviews'],
    requiredIntegrations: ['GRC optional', 'storage optional'],
    readinessGates: ['marketplace-readiness', 'security-rbac', 'accessibility-qa', 'legal-support'],
    riskLevel: 'regulated',
    smokeTests: ['smoke:marketplace-readiness', 'smoke:accessibility-qa'],
    blockedUntil: ['Owner approvals', 'Evidence retention policy', 'Audit export proof'],
    customizationSteps: [
      'Map your control framework (SOC 2, ISO 27001, etc.) to the controls table.',
      'Assign owners per control and configure review cadence.',
      'Set evidence retention policy before inviting reviewers.',
      'Validate that no false PASS is returned for missing evidence.',
    ],
    version: '1.0.0',
    sharingMode: 'private',
  },
  {
    id: 'marketplace-listing-kit',
    name: 'Marketplace listing kit',
    category: 'marketplace',
    idealCustomer: 'Teams preparing SaaS listings for enterprise marketplaces.',
    businessOutcome: 'Owners see pricing, support, legal, security, and evidence gaps before submission.',
    requiredPages: ['/enterprise/readiness', '/enterprise/support', '/enterprise/security'],
    requiredApis: ['/api/dsg/marketplace/readiness', '/api/dsg/marketplace/audit-packet'],
    requiredData: ['readiness gates', 'smoke evidence', 'owner approvals'],
    requiredIntegrations: ['marketplace portal manual submission'],
    readinessGates: ['marketplace-readiness', 'entitlement', 'legal-support', 'deployment-proof'],
    riskLevel: 'high',
    smokeTests: ['smoke:marketplace-readiness', 'smoke:audit-packet'],
    blockedUntil: ['Real deployment proof', 'Owner approval evidence', 'Entitlement enforcement test'],
    customizationSteps: [
      'Complete all readiness gates before attempting marketplace submission.',
      'Attach real deployment proof — screenshot or live URL.',
      'Collect owner approvals for security, legal, and support sections.',
      'Run the audit-packet smoke test and attach the output.',
    ],
    version: '1.0.0',
    sharingMode: 'private',
  },
  {
    id: 'evidence-audit-portal',
    name: 'Evidence/audit portal',
    category: 'governance',
    idealCustomer: 'Operators collecting proof across product, security, QA, and marketplace readiness.',
    businessOutcome: 'Evidence packets can be reviewed without trusting unverified marketing claims.',
    requiredPages: ['/enterprise/readiness', '/enterprise/accessibility'],
    requiredApis: ['/api/dsg/marketplace/audit-packet', '/api/dsg/marketplace/readiness-score'],
    requiredData: ['evidence artifacts', 'missing evidence', 'next actions'],
    requiredIntegrations: ['artifact storage optional'],
    readinessGates: ['marketplace-readiness', 'accessibility-qa', 'security-rbac'],
    riskLevel: 'medium',
    smokeTests: ['smoke:audit-packet', 'smoke:first-value-flow'],
    blockedUntil: ['Smoke output attached', 'Deployment proof attached', 'Owner review'],
    customizationSteps: [
      'Define which evidence categories apply to your review scope.',
      'Connect artifact storage if evidence files exceed inline size limits.',
      'Configure reviewer access (read-only, no mutation of evidence records).',
      'Attach smoke output and deployment proof before sharing with reviewers.',
    ],
    version: '1.0.0',
    sharingMode: 'private',
  },
  {
    id: 'ai-assistant-approval-gate',
    name: 'AI assistant with approval gate',
    category: 'ai-workflow',
    idealCustomer: 'Teams that want AI assistance but require human approval before action.',
    businessOutcome: 'AI drafts recommendations while execution remains gated by human and policy proof.',
    requiredPages: ['/assistant', '/assistant/review'],
    requiredApis: ['/api/assistant/draft', '/api/assistant/approve'],
    requiredData: ['prompts', 'drafts', 'approvals', 'audit events'],
    requiredIntegrations: ['model provider', 'identity provider optional'],
    readinessGates: ['runtime-gate', 'security-rbac', 'audit-log'],
    riskLevel: 'high',
    smokeTests: ['smoke:app-builder-flow-proof', 'smoke:security-rbac'],
    blockedUntil: ['Human approval enforcement proof', 'Prompt/output audit trail', 'Role denial test'],
    customizationSteps: [
      'Configure the model provider and set token/cost limits.',
      'Define the approval gate: who can approve drafts and under what conditions.',
      'Enable prompt and output audit logging before any production use.',
      'Run the role-denial test to confirm unapproved drafts cannot execute.',
    ],
    version: '1.0.0',
    sharingMode: 'team',
  },
  {
    id: 'membership-subscription-app',
    name: 'Membership/subscription app',
    category: 'commerce',
    idealCustomer: 'SaaS or community products requiring paid plan access.',
    businessOutcome: 'Members access features according to plan, seat, quota, and upgrade path.',
    requiredPages: ['/membership', '/billing', '/account'],
    requiredApis: ['/api/membership', '/api/billing/entitlement'],
    requiredData: ['plans', 'members', 'seats', 'quotas', 'entitlements'],
    requiredIntegrations: ['billing provider', 'marketplace entitlement API optional'],
    readinessGates: ['entitlement', 'security-rbac', 'legal-support'],
    riskLevel: 'high',
    smokeTests: ['smoke:entitlement', 'smoke:first-value-flow'],
    blockedUntil: ['Billing provider or marketplace entitlement proof', 'Quota exceeded denial test', 'Upgrade path proof'],
    customizationSteps: [
      'Define plan tiers, seat limits, and quota rules for your product.',
      'Connect billing provider (Stripe or marketplace entitlement API).',
      'Test quota-exceeded denial and upgrade path before launch.',
      'Set legal and privacy copy on the /billing and /account pages.',
    ],
    version: '1.0.0',
    sharingMode: 'public',
  },
];

export function getDsgMarketTemplateById(id: string): DsgMarketTemplate | undefined {
  return DSG_MARKET_TEMPLATES.find((template) => template.id === id);
}

export function getDsgMarketTemplatesBySharingMode(mode: DsgTemplateSharingMode): DsgMarketTemplate[] {
  return DSG_MARKET_TEMPLATES.filter((template) => template.sharingMode === mode);
}

export function getDsgMarketTemplatesByCategory(category: string): DsgMarketTemplate[] {
  return DSG_MARKET_TEMPLATES.filter((template) => template.category === category);
}
