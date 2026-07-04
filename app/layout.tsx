import './globals.css';
import './dsg-brand.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';
import { ToastProvider } from '../components/ToastProvider';
import { LanguageProvider } from '@/lib/i18n/language-context';

export const metadata: Metadata = {
  title: 'DSG ONE — ProofGate Runtime Control Plane',
  description: 'red, gold, and blue-sapphire runtime governance for AI, workflow, finance, and deployment actions before execution.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <LanguageProvider>
          <ToastProvider>
            <GlobalNav />
            {children}
            <PublicChatWidget />
            <Analytics />
            <SpeedInsights />
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
