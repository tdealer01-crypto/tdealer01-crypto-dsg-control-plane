import './globals.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GlobalNav from '../components/GlobalNav';
import { Analytics } from '@vercel/analytics/next';

export const metadata: Metadata = {
  title: 'DSG Control Plane',
  description: 'Deterministic control plane for AI systems',
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
