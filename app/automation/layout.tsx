import AgentChatWidget from '../../components/AgentChatWidget';

export default function AutomationLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AgentChatWidget />
    </>
  );
}
