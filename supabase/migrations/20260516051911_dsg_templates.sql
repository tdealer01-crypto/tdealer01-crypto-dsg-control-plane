-- Template gallery: curated content seeded here, read-only via API
create table if not exists public.dsg_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  category text not null,
  stack text[] not null default '{}',
  stars integer not null default 0,
  popular boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.dsg_templates enable row level security;
create policy "anyone can read templates" on public.dsg_templates
  for select using (true);

insert into public.dsg_templates (slug, name, description, category, stack, stars, popular) values
  ('saas-starter', 'SaaS Starter', 'Full-stack SaaS boilerplate with billing, auth, and a ready-made dashboard.', 'SaaS', ARRAY['Next.js', 'Supabase', 'Stripe'], 2840, true),
  ('ai-chatbot', 'AI Chatbot', 'Streaming AI chat with persistent memory, conversation history, and multi-model support.', 'AI/Chat', ARRAY['Next.js', 'Vercel AI SDK', 'Redis'], 1930, false),
  ('analytics-dashboard', 'Analytics Dashboard', 'Interactive analytics UI with charts, dimension filters, and CSV export.', 'Dashboard', ARRAY['Next.js', 'Recharts', 'Postgres'], 1420, false),
  ('crm-lite', 'CRM Lite', 'Lightweight CRM with contact management, deal pipeline, and activity notes.', 'Internal Tools', ARRAY['Next.js', 'Supabase', 'Tailwind'], 980, false),
  ('ecommerce-store', 'E-commerce Store', 'Full storefront with product catalog, cart, checkout, and Stripe payments.', 'E-commerce', ARRAY['Next.js', 'Stripe', 'Sanity'], 2110, true),
  ('internal-admin', 'Internal Admin', 'CRUD admin panel with server-side search, pagination, and role-based access.', 'Internal Tools', ARRAY['Next.js', 'Prisma', 'Postgres'], 760, false),
  ('document-ai', 'Document AI', 'Upload documents, extract structured data, and generate AI-powered summaries.', 'AI/Chat', ARRAY['Next.js', 'LangChain', 'Pinecone'], 1650, false),
  ('workflow-automator', 'Workflow Automator', 'Visual workflow builder with triggers, conditions, and multi-step action chains.', 'Internal Tools', ARRAY['Next.js', 'Temporal', 'Redis'], 870, false),
  ('feedback-collector', 'Feedback Collector', 'Custom feedback forms, response inbox, tagging, and built-in analytics.', 'SaaS', ARRAY['Next.js', 'Supabase', 'Resend'], 610, false),
  ('team-wiki', 'Team Wiki', 'Collaborative documentation with full-text search and page versioning.', 'Internal Tools', ARRAY['Next.js', 'MDX', 'Postgres'], 730, false),
  ('job-board', 'Job Board', 'Post job listings, collect applications, and manage candidate status.', 'SaaS', ARRAY['Next.js', 'Supabase', 'Resend'], 540, false),
  ('invoice-generator', 'Invoice Generator', 'Create PDF invoices, send by email, and collect payments via Stripe.', 'SaaS', ARRAY['Next.js', 'Stripe', 'Resend'], 890, false)
on conflict (slug) do nothing;
