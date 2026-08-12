import './globals.css';
import './dsg-brand.css';
import type { Metadata } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';
import { ToastProvider } from '../components/ToastProvider';
import { LanguageProvider } from '@/lib/i18n/language-context';

const GA_MEASUREMENT_ID = 'G-ZG5DY1HXRJ';

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
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
