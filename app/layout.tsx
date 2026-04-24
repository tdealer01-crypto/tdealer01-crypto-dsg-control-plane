import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import GlobalNav from '../components/GlobalNav';

export const metadata: Metadata = {
  title: 'DSG Finance Governance Control Plane',
  description: 'Govern AI-assisted finance operations with deterministic policy gates and auditable runtime controls.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <GlobalNav />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
