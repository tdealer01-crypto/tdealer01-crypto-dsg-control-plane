import AgentChatWidget from '../../components/AgentChatWidget';

export default function AiComplianceLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}
