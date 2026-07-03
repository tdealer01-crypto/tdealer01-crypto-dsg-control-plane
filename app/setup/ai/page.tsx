import { Metadata } from 'next';
import { AIWizard } from '@/app/components/setup/AIWizard';

export const metadata: Metadata = {
  title: 'AI Setup Wizard | DSG ONE',
  description: 'Configure OpenRouter AI models for DSG ONE in 5 easy steps',
};

export default function AISetupPage() {
  return <AIWizard />;
}
