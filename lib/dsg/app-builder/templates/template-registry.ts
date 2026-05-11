export type DsgAppTemplateCategory = 'landing' | 'crud' | 'dashboard' | 'form' | 'workspace';
export type DsgAppTemplateRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

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
  },
];

export function getDsgMarketTemplateById(id: string): DsgMarketTemplate | undefined {
  return DSG_MARKET_TEMPLATES.find((template) => template.id === id);
}
