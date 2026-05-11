export type MarketCompetitor = {
  id: string;
  name: string;
  category: 'ai-app-builder' | 'enterprise-low-code' | 'marketplace-saas';
  positioning: string;
  strengths: string[];
  gaps: string[];
  dsgOpportunity: string;
  sourceNotes: string[];
};

export type MarketDirection = {
  id: string;
  title: string;
  customerNeed: string;
  requiredProductCapability: string;
  evidenceRequired: string[];
  status: 'PASS' | 'REVIEW' | 'BLOCKED';
};

export type AgentAppBuilderMarketReport = {
  ok: true;
  generatedAt: string;
  positioning: string;
  competitors: MarketCompetitor[];
  directions: MarketDirection[];
  noMockPolicy: { enforced: true; rule: string };
};

export const agentAppBuilderCompetitors: MarketCompetitor[] = [
  {
    id: 'v0',
    name: 'v0',
    category: 'ai-app-builder',
    positioning: 'Natural-language app and UI generation tied to the Vercel deployment ecosystem.',
    strengths: ['Fast prompt-to-UI loop', 'Vercel-native deployment path', 'Useful for landing pages through full-stack app starts'],
    gaps: ['Marketplace submission evidence is not the primary surface', 'Enterprise enforcement proof still depends on the generated app implementation'],
    dsgOpportunity: 'Make proof, gates, and missing evidence visible inside the builder rather than only generating code quickly.',
    sourceNotes: ['v0 product/docs positioning: natural language to UI/app code', 'Vercel deployment docs: production URL, HTTPS/CDN, monitoring ecosystem'],
  },
  {
    id: 'bolt',
    name: 'Bolt',
    category: 'ai-app-builder',
    positioning: 'Prompt, run, edit, and deploy full-stack browser apps with an in-browser development loop.',
    strengths: ['Browser-native full-stack iteration', 'Integrated filesystem/package/terminal/browser-console style loop', 'Low setup friction for first-time users'],
    gaps: ['Enterprise governance evidence must still be proven per generated app', 'Billing/RBAC/audit claims need runtime enforcement proof'],
    dsgOpportunity: 'Compete on first-value speed while adding fail-closed evidence contracts and marketplace packet export.',
    sourceNotes: ['Bolt/WebContainers positioning: browser full-stack app loop', 'No market-share claim is made in this registry'],
  },
  {
    id: 'enterprise-low-code',
    name: 'Enterprise low-code platforms',
    category: 'enterprise-low-code',
    positioning: 'AI-assisted delivery with integrations, composable architecture, scale, and built-in governance.',
    strengths: ['Governance vocabulary enterprise buyers expect', 'Integration and delivery management', 'Scalable release controls'],
    gaps: ['Can be slower to first useful app', 'Generated proof often remains scattered across tools and review docs'],
    dsgOpportunity: 'Show user outcome, app plan, proof panel, readiness score, and audit packet in one flow.',
    sourceNotes: ['Gartner-style enterprise low-code themes: AI-assisted tooling, composability, governance, integration demand'],
  },
  {
    id: 'marketplace-saas',
    name: 'Marketplace SaaS review standard',
    category: 'marketplace-saas',
    positioning: 'Marketplace review expects pricing, entitlement, support, data handling, security, audit, and production readiness evidence.',
    strengths: ['Clear buyer trust requirements', 'Repeatable listing and review artifact expectations'],
    gaps: ['A builder must gather evidence from many routes/scripts before a reviewer can trust it'],
    dsgOpportunity: 'Produce an audit packet and dashboard that blocks PASS until real smoke output, enforcement tests, deployment proof, and owner approvals exist.',
    sourceNotes: ['AWS/Google marketplace SaaS review themes: pricing, entitlement, support, security, data handling, production readiness'],
  },
];

export const agentAppBuilderMarketDirections: MarketDirection[] = [
  {
    id: 'natural-language-intake',
    title: 'Outcome-first creation',
    customerNeed: 'Users want to describe the app and result in plain language before thinking about stack details.',
    requiredProductCapability: 'Outcome intake that turns goal, users, data, integrations, and risk into a PRD draft and next action.',
    evidenceRequired: ['POST /api/dsg/app-builder/outcome returns validated JSON', 'Empty goal returns 400', 'UI displays nextAction'],
    status: 'REVIEW',
  },
  {
    id: 'template-marketplace',
    title: 'Selectable business templates',
    customerNeed: 'Teams need a short path from common business outcomes to pages, APIs, data, integrations, and proof needs.',
    requiredProductCapability: 'Template registry with risk level, readiness gates, smoke tests, and blockedUntil proof gaps.',
    evidenceRequired: ['Template registry in lib/dsg/app-builder/templates/template-registry.ts', 'UI shows risk and missing proof'],
    status: 'REVIEW',
  },
  {
    id: 'governed-proof-loop',
    title: 'Evidence-first governance',
    customerNeed: 'Enterprise reviewers need proof before production or marketplace claims.',
    requiredProductCapability: 'Proof panel, readiness score, and audit packet that fail closed when evidence is missing.',
    evidenceRequired: ['GET /api/dsg/marketplace/audit-packet', 'GET /api/dsg/marketplace/readiness-score', 'smoke scripts attached'],
    status: 'REVIEW',
  },
];

export function getAgentAppBuilderMarketReport(): AgentAppBuilderMarketReport {
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    positioning: 'DSG is positioned as an evidence-first agent app builder: fast outcome intake plus visible proof gates, not unverified production claims.',
    competitors: agentAppBuilderCompetitors,
    directions: agentAppBuilderMarketDirections,
    noMockPolicy: {
      enforced: true,
      rule: 'Market notes may describe positioning and opportunities, but must not claim market share, production readiness, or enforcement without source notes and repo evidence.',
    },
  };
}
