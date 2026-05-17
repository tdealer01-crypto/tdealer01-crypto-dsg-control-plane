import Link from 'next/link';
import GenerateButton from './GenerateButton';

export const metadata = {
  title: 'Template Marketplace — DSG ONE',
  description: 'Generate a production-ready Next.js app from a template in seconds.',
};

const CATEGORY_STYLE: Record<string, string> = {
  Commerce: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  Business: 'bg-blue-500/20 text-blue-300 ring-blue-500/30',
  SaaS: 'bg-purple-500/20 text-purple-300 ring-purple-500/30',
  'Internal Tools': 'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  Finance: 'bg-yellow-500/20 text-yellow-200 ring-yellow-500/30',
  Productivity: 'bg-pink-500/20 text-pink-300 ring-pink-500/30',
};

const templates = [
  {
    id: 'ecommerce-store',
    name: 'E-Commerce Store',
    description: 'Product catalog, shopping cart, and Stripe checkout — production-ready in minutes.',
    category: 'Commerce',
    stack: ['Next.js 15', 'Supabase', 'Stripe'],
    stars: 128,
    popular: true,
    goal: 'Build a full-stack Next.js e-commerce store with product listing page, shopping cart, and Stripe checkout flow.',
    successCriteria: ['product_list', 'cart_add_remove', 'stripe_checkout', 'order_confirmation'],
  },
  {
    id: 'crm-system',
    name: 'CRM System',
    description: 'Contact management, deal pipeline, and activity timeline for your sales team.',
    category: 'Business',
    stack: ['Next.js 15', 'Supabase'],
    stars: 94,
    popular: false,
    goal: 'Build a CRM system with contact management, deal pipeline with stages, and activity history timeline.',
    successCriteria: ['contact_crud', 'deal_pipeline', 'activity_log'],
  },
  {
    id: 'booking-app',
    name: 'Booking App',
    description: 'Calendar-based appointment scheduling with email notifications and admin controls.',
    category: 'SaaS',
    stack: ['Next.js 15', 'Supabase', 'Resend'],
    stars: 76,
    popular: false,
    goal: 'Build an appointment booking app with calendar slot selection, booking management, and email confirmation.',
    successCriteria: ['slot_listing', 'booking_create', 'booking_cancel', 'email_confirm'],
  },
  {
    id: 'hr-portal',
    name: 'HR Portal',
    description: 'Employee directory, leave requests, and approval workflow — all in one internal tool.',
    category: 'Internal Tools',
    stack: ['Next.js 15', 'Supabase'],
    stars: 61,
    popular: false,
    goal: 'Build an HR portal with employee directory, leave request submission, and manager approval workflow.',
    successCriteria: ['employee_list', 'leave_request', 'leave_approve_reject'],
  },
  {
    id: 'invoice-manager',
    name: 'Invoice Manager',
    description: 'Create invoices, track payments, and export PDF reports for your business.',
    category: 'Finance',
    stack: ['Next.js 15', 'Supabase', 'Stripe'],
    stars: 53,
    popular: false,
    goal: 'Build an invoice manager that creates client invoices, tracks payment status, and exports PDF reports.',
    successCriteria: ['invoice_create', 'invoice_send', 'payment_track', 'pdf_export'],
  },
  {
    id: 'project-tracker',
    name: 'Project Tracker',
    description: 'Kanban board, milestones, and team collaboration for agile development teams.',
    category: 'Productivity',
    stack: ['Next.js 15', 'Supabase'],
    stars: 41,
    popular: true,
    goal: 'Build a project tracker with kanban task board, milestone management, and team member assignment.',
    successCriteria: ['task_crud', 'kanban_move', 'milestone_track', 'team_assign'],
  },
];

export default function MarketplacePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight">
            DSG ONE
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-500">
              Log in
            </Link>
            <Link href="/dashboard" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-400">
            Template Marketplace
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Ship in seconds,
            <br />
            <span className="text-emerald-400">not weeks.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400">
            Pick a template, click Generate — DSG ONE builds your production-ready Next.js app, pushes it to GitHub, and returns a one-click Vercel deploy link.
          </p>
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 md:grid-cols-3">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">{templates.length}</p>
            <p className="mt-1 text-sm text-slate-400">Templates</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">&lt;60s</p>
            <p className="mt-1 text-sm text-slate-400">Generation time</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">100%</p>
            <p className="mt-1 text-sm text-slate-400">Vercel-ready</p>
          </div>
        </div>

        {/* Template grid */}
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const catStyle = CATEGORY_STYLE[t.category] ?? 'bg-slate-700/40 text-slate-300 ring-slate-600/30';
            return (
              <div
                key={t.id}
                className="flex flex-col rounded-2xl border border-slate-800 bg-slate-900 p-6 transition hover:border-slate-700"
              >
                {/* Category + popular badge */}
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${catStyle}`}>
                    {t.category}
                  </span>
                  {t.popular && (
                    <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                      Popular
                    </span>
                  )}
                </div>

                {/* Name + desc */}
                <h2 className="mt-4 text-xl font-bold">{t.name}</h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-400">{t.description}</p>

                {/* Stack */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {t.stack.map((s) => (
                    <span key={s} className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300">
                      {s}
                    </span>
                  ))}
                </div>

                {/* Stars */}
                <div className="mt-4 flex items-center gap-1 text-sm text-slate-500">
                  <svg className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span>{t.stars} stars</span>
                </div>

                {/* CTA */}
                <div className="mt-6">
                  <GenerateButton
                    goal={t.goal}
                    successCriteria={t.successCriteria}
                    label={`Generate ${t.name}`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* How it works */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { step: '1', title: 'Pick a template', body: 'Choose from 6 battle-tested templates covering commerce, SaaS, internal tools, and more.' },
              { step: '2', title: 'Click Generate', body: 'DSG ONE builds your app, scaffolds the codebase, and pushes it to a new GitHub repository.' },
              { step: '3', title: 'Deploy instantly', body: 'Use the one-click Vercel link to go live in under 60 seconds — no config required.' },
            ].map((item) => (
              <div key={item.step} className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 font-bold text-black">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-400">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA bottom */}
        <div className="mt-16 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">
          <h2 className="text-2xl font-bold">Ready to build?</h2>
          <p className="mt-3 text-slate-300">Log in to start generating apps from any template above.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Link href="/login?next=/marketplace" className="rounded-xl bg-emerald-500 px-6 py-3 font-semibold text-black hover:bg-emerald-400">
              Get started free
            </Link>
            <Link href="/api/health" className="rounded-xl border border-slate-700 px-6 py-3 font-semibold text-slate-200 hover:border-slate-500">
              View API status
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
