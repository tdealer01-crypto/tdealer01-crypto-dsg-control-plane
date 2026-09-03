import './globals.css';
import './dsg-brand.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';
import { ToastProvider } from '../components/ToastProvider';
import { LanguageProvider } from '@/lib/i18n/language-context';

export const metadata: Metadata = {
  title: 'DSG ONE — Govern AI Actions. Prove the Result.',
  description: 'Install with Web, AI or CLI. Govern AI-agent actions against approved plans, permissions and evidence, then preserve verification and audit proof.',
  metadataBase: new URL('https://www.dsg.pics'),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'DSG ONE — Govern AI Actions. Prove the Result.',
    description: 'Governed execution and evidence for AI agents, MCP tools and automated workflows.',
    url: 'https://www.dsg.pics',
    siteName: 'DSG ONE',
    type: 'website',
  },
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
          </ToastProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
