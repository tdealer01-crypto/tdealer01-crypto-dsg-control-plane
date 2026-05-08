import type {Metadata} from 'next';
import './globals.css'; // Global styles

const appName = 'DSG ONE V1';
const appDescription = 'Governed App Builder Runtime with evidence-based customer workspace.';

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  applicationName: appName,
  description: appDescription,
  openGraph: {
    title: appName,
    description: appDescription,
    siteName: appName,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: appName,
    description: appDescription,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="th">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
