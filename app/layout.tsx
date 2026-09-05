import './globals.css';
import './dsg-brand.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import GlobalNav from '../components/GlobalNav';
import PublicChatWidget from '../components/PublicChatWidget';
import { ToastProvider } from '../components/ToastProvider';
import { LanguageProvider } from '@/lib/i18n/language-context';

const SITE_URL = 'https://www.dsg.pics';
const BUSINESS_EMAIL = 't.dealer01@dsg.pics';

const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: 'DSG ONE',
      alternateName: ['DSG', 'DSG Spacetime'],
      url: SITE_URL,
      email: BUSINESS_EMAIL,
      description:
        'Online software product for governed AI-agent execution, MCP integrations, policy gates, evidence, replay and audit.',
      areaServed: 'Worldwide',
      sameAs: ['https://github.com/tdealer01-crypto'],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: 'DSG ONE',
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: ['en', 'th'],
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: 'DSG ONE',
      alternateName: 'DSG Spacetime',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description:
        'Govern AI-agent actions against approved plans, permissions and evidence, then preserve verification, replay and audit proof.',
      publisher: { '@id': `${SITE_URL}/#organization` },
      featureList: [
        'AI-agent execution governance',
        'MCP integration controls',
        'Plan and permission gates',
        'Evidence and audit trails',
        'Replay and verification boundaries',
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: {
    default: 'DSG ONE — Govern AI Actions. Prove the Result.',
    template: '%s | DSG ONE',
  },
  description:
    'Install with Web, AI or CLI. Govern AI-agent actions against approved plans, permissions and evidence, then preserve verification and audit proof.',
  applicationName: 'DSG ONE',
  category: 'software',
  keywords: [
    'AI agent governance',
    'AI control plane',
    'MCP governance',
    'agent execution controls',
    'AI audit evidence',
    'AI policy gates',
    'DSG Spacetime',
  ],
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: '/' },
  openGraph: {
    title: 'DSG ONE — Govern AI Actions. Prove the Result.',
    description: 'Governed execution and evidence for AI agents, MCP tools and automated workflows.',
    url: SITE_URL,
    siteName: 'DSG ONE',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DSG ONE — Govern AI Actions. Prove the Result.',
    description: 'Governed execution and evidence for AI agents, MCP tools and automated workflows.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
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
