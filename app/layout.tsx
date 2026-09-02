import './globals.css';
import './dsg-brand.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';
import { ToastProvider } from '../components/ToastProvider';
import { LanguageProvider } from '@/lib/i18n/language-context';

export const metadata: Metadata = {
  title: 'DSG Control Plane — Runtime governance for AI agents',
  description: 'Connect existing agents and workflows, inspect plan alignment, permissions and evidence, and record auditable execution decisions before downstream actions continue.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#07080b] text-slate-100 antialiased">
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
