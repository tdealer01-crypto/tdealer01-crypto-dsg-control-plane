export type Template = {
  id: string;
  name: string;
  description: string;
  category: string;
  stack: string[];
  stars: number;
  popular: boolean;
  price: number; // cents — 0 means free
  goal: string;
  successCriteria: string[];
};

export const TEMPLATES: Template[] = [
  {
    id: 'ecommerce-store',
    name: 'E-Commerce Store',
    description: 'Product catalog, shopping cart, and Stripe checkout — production-ready in minutes.',
    category: 'Commerce',
    stack: ['Next.js 15', 'Supabase', 'Stripe'],
    stars: 128,
    popular: true,
    price: 0,
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
    price: 2900,
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
    price: 3900,
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
    price: 4900,
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
    price: 4900,
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
    price: 0,
    goal: 'Build a project tracker with kanban task board, milestone management, and team member assignment.',
    successCriteria: ['task_crud', 'kanban_move', 'milestone_track', 'team_assign'],
  },
];

export function getTemplate(id: string): Template | null {
  return TEMPLATES.find((t) => t.id === id) ?? null;
}

export function formatPrice(cents: number): string {
  if (cents === 0) return 'FREE';
  return `$${cents / 100}`;
}
