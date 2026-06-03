import AgentChatWidget from '../../components/AgentChatWidget';
import HermesControlLink from '../../components/HermesControlLink';

export default function FinanceApprovalGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <HermesControlLink />
      <AgentChatWidget />
    </>
  );
}
