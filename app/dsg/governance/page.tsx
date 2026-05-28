import { CcvsControlCatalogView } from '@/components/ccvs-control-catalog-view';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Governance Controls',
};

export default function GovernancePage() {
  return <CcvsControlCatalogView />;
}
