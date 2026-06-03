import AgentChatWidget from '../../components/AgentChatWidget';

export default function FinanceApprovalGateLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}
