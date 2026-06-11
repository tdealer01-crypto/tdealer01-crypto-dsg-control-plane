'use client';

import { ReactNode } from 'react';
import { AlertProvider } from '@/lib/hooks';

export default function HermesLayout({ children }: { children: ReactNode }) {
  return <AlertProvider>{children}</AlertProvider>;
}
