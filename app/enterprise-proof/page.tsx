import { redirect } from 'next/navigation';

// /enterprise-proof has no content of its own — the entry point is /enterprise-proof/start
export default function EnterpriseProofRoot() {
  redirect('/enterprise-proof/start');
}
