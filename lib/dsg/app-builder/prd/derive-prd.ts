import type { DsgAppBuilderPrd } from '@/lib/dsg/app-builder/types/prd';
import { DSG_APP_TEMPLATES, type DsgAppTemplate } from '@/lib/dsg/app-builder/templates/template-registry';

export type DerivedPrdResult = {
  ok: true;
  prd: DsgAppBuilderPrd;
  selectedTemplate: DsgAppTemplate;
  templateCandidates: DsgAppTemplate[];
  boundary: {
    claimStatus: 'PRD_DRAFT_ONLY';
    productionReadyClaim: false;
    modelUsed: false;
    note: string;
  };
};

const KEYWORDS: Array<{ words: string[]; templateId: string }> = [
  { words: ['landing', 'waitlist', 'marketing', 'launch', 'lead'], templateId: 'saas-landing-page' },
  { words: ['dashboard', 'analytics', 'metric', 'report', 'ops'], templateId: 'operator-dashboard' },
  { words: ['form', 'survey', 'intake', 'approval', 'request'], templateId: 'form-workflow-app' },
  { words: ['login', 'workspace', 'team', 'role', 'saas'], templateId: 'workspace-starter' },
  { words: ['todo', 'crud', 'inventory', 'task', 'order', 'database'], templateId: 'database-crud-app' },
];

function cleanGoal(goal: string): string {
  return goal.replace(/\s+/g, ' ').trim();
}

function titleFromGoal(goal: string, template: DsgAppTemplate): string {
  const cleaned = cleanGoal(goal);
  if (!cleaned) return template.name;
  const first = cleaned.slice(0, 72);
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function selectTemplate(goal: string): DsgAppTemplate {
  const normalized = goal.toLowerCase();
  for (const rule of KEYWORDS) {
    if (rule.words.some((word) => normalized.includes(word))) {
      return DSG_APP_TEMPLATES.find((template) => template.id === rule.templateId) || DSG_APP_TEMPLATES[0];
    }
  }
  return DSG_APP_TEMPLATES[0];
}

export function derivePrdFromGoal(goal: string): DerivedPrdResult {
  const cleaned = cleanGoal(goal);
  if (cleaned.length < 8) {
    throw new Error('APP_BUILDER_GOAL_TOO_SHORT');
  }

  const selectedTemplate = selectTemplate(cleaned);
  const candidates = DSG_APP_TEMPLATES.filter((template) =>
    template.useCases.some((useCase) => cleaned.toLowerCase().includes(useCase.toLowerCase().split(' ')[0])),
  );

  const prd: DsgAppBuilderPrd = {
    title: titleFromGoal(cleaned, selectedTemplate),
    summary: `Build a governed ${selectedTemplate.name} from the locked user goal. The output must remain evidence-backed and cannot claim production until auth, RBAC, deployment, and user-flow proof pass.`,
    useCase: selectedTemplate.name,
    userProblem: cleaned,
    targetUsers: ['requesting user', 'operator', 'reviewer'],
    coreFeatures: selectedTemplate.defaultFeatures,
    nonGoals: [
      'No direct model access to secrets',
      'No production claim from PRD draft alone',
      'No public write endpoint without access control',
    ],
    acceptanceCriteria: [
      'Goal is locked before plan creation',
      'Template and risk are visible to the user',
      'Z3 observer can inspect plan feasibility before approval',
      'Runtime execution remains controlled by DSG',
      'Generated app proof is required before production claim',
    ],
    frontend: ['Next.js App Router', 'React', 'Tailwind'],
    backend: ['Next API routes', 'DSG Controlled Executor'],
    database: selectedTemplate.requiredCapabilities.includes('database') ? ['Supabase Postgres', 'api schema'] : ['optional'],
    deployment: ['Vercel', 'GitHub PR flow'],
  };

  return {
    ok: true,
    prd,
    selectedTemplate,
    templateCandidates: candidates.length ? candidates : [selectedTemplate],
    boundary: {
      claimStatus: 'PRD_DRAFT_ONLY',
      productionReadyClaim: false,
      modelUsed: false,
      note: 'This deterministic PRD draft does not execute, deploy, or claim production readiness.',
    },
  };
}
