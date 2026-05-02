import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';

export const metadata: Metadata = {
  title: 'DSG ONE — AI Runtime Control Plane',
  description: 'deterministic governance for AI, workflow, finance, and deployment actions before execution.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <GlobalNav />
        {children}
        <PublicChatWidget />
        <Analytics />
      </body>
    </html>
  );
}
