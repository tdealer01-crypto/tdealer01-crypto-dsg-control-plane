import AgentChatWidget from '../../components/AgentChatWidget';

export default function EnterpriseReadyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}
