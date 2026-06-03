import AgentChatWidget from '../../components/AgentChatWidget';

export default function FinanceGovernanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}
